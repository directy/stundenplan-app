use std::collections::HashMap;
use rusqlite::Connection;

use crate::db;
use crate::error::AppError;
use crate::models::{
    NewScheduleEntry, Room, SchoolClass, Subject, Teacher, TeacherPreference, TeacherWish, TimeSlot,
};

use super::constraints;
use super::scorer;
use super::types::{
    AssignmentCandidate, ConstraintWeights, GenerationResult, GreedyInput, GreedySolution,
    ScheduleState, ScoringContext, SchedulingTask, UnplacedTask,
};

/// Wrapper: Generiert einen Stundenplan in einem Schritt (für Tests und direkte Aufrufe).
/// In Tauri-Commands sollte stattdessen load_greedy_input/solve_greedy/write_greedy_results
/// separat aufgerufen werden, um den DB-Mutex zwischen den Phasen freizugeben.
pub fn generate(conn: &Connection, schedule_id: i64) -> Result<GenerationResult, AppError> {
    let input = load_greedy_input(conn, schedule_id)?;
    let solution = solve_greedy(input);
    write_greedy_results(conn, schedule_id, &solution)?;
    Ok(GenerationResult {
        entries_created: solution.entries.len(),
        total_score: solution.total_score,
        average_score: solution.average_score,
        unplaced_tasks: solution.unplaced_tasks,
    })
}

/// Phase 1: Validiert den Schedule, löscht alte Einträge und lädt alle Stammdaten.
/// Braucht DB-Zugriff (conn). Sollte unter Mutex-Lock aufgerufen werden.
pub fn load_greedy_input(conn: &Connection, schedule_id: i64) -> Result<GreedyInput, AppError> {
    // 1. Validierung
    let schedule = db::schedules::get_schedule(conn, schedule_id)?;
    if schedule.status != "draft" {
        return Err(AppError::Validation(format!(
            "Stundenplan '{}' hat Status '{}', erwartet 'draft'",
            schedule.name, schedule.status
        )));
    }

    // Bestehende Einträge löschen (falls Re-Generierung)
    conn.execute(
        "DELETE FROM schedule_entries WHERE schedule_id = ?1",
        [schedule_id],
    )?;

    // 2. Alle Stammdaten laden
    let all_teachers = db::teachers::get_teachers(conn)?;
    let teachers: Vec<Teacher> = match (&schedule.valid_from, &schedule.valid_to) {
        (Some(from), Some(to)) => all_teachers
            .into_iter()
            .filter(|t| {
                !db::absences::is_teacher_absent_in_range(conn, t.id, from, to)
                    .unwrap_or(false)
            })
            .collect(),
        _ => all_teachers,
    };
    let subjects = db::subjects::get_subjects(conn)?;
    let classes = db::classes::get_classes(conn)?;
    let rooms = db::rooms::get_rooms(conn)?;
    let time_slots = db::time_slots::get_time_slots(conn)?;
    let constraint_rules = db::constraints::get_constraint_rules(conn)?;

    // Lehrer-Fach-Zuordnungen laden
    let mut teachers_for_subject: HashMap<i64, Vec<i64>> = HashMap::new();
    for subject in &subjects {
        let qualified = db::teacher_subjects::get_teachers_for_subject(conn, subject.id)?;
        teachers_for_subject.insert(subject.id, qualified.iter().map(|t| t.id).collect());
    }

    // Lehrer-Präferenzen laden
    let mut teacher_preferences: HashMap<i64, Vec<TeacherPreference>> = HashMap::new();
    for teacher in &teachers {
        let prefs = db::preferences::get_preferences_for_teacher(conn, teacher.id)?;
        if !prefs.is_empty() {
            teacher_preferences.insert(teacher.id, prefs);
        }
    }

    // Sonderwünsche und Rankings laden
    let active_wishes: Vec<TeacherWish> = db::wishes::get_all_active_wishes(conn)?;
    let rankings = db::rewards::get_teacher_rankings(conn)?;
    let ranking_multiplier_map: HashMap<i64, f64> = rankings
        .iter()
        .map(|r| (r.teacher_id, r.ranking_multiplier))
        .collect();

    // Stundentafel-Overrides und Lehrer-Klassen-Einschränkungen laden
    let class_subject_overrides = db::class_subjects::get_all_class_subject_hours(conn)?;
    let (hard_class_restrictions, soft_class_preferences) = db::teacher_classes::get_restriction_maps(conn)?;

    Ok(GreedyInput {
        schedule_id,
        teachers,
        subjects,
        classes,
        rooms,
        time_slots,
        constraint_rules,
        teachers_for_subject,
        teacher_preferences,
        active_wishes,
        ranking_multiplier_map,
        class_subject_overrides,
        hard_class_restrictions,
        soft_class_preferences,
    })
}

/// Phase 2: Reine Berechnung – Greedy-Algorithmus ohne DB-Zugriff.
/// Kann OHNE Mutex-Lock aufgerufen werden.
pub fn solve_greedy(input: GreedyInput) -> GreedySolution {
    let empty_solution = GreedySolution {
        entries: Vec::new(),
        total_score: 0.0,
        average_score: 0.0,
        unplaced_tasks: Vec::new(),
    };

    // Falls keine Basisdaten vorhanden, leeres Ergebnis
    if input.classes.is_empty() || input.subjects.is_empty() || input.teachers.is_empty() || input.rooms.is_empty() {
        return empty_solution;
    }

    // Lookup-Maps erstellen (aus owned data)
    let teacher_map: HashMap<i64, &Teacher> = input.teachers.iter().map(|t| (t.id, t)).collect();
    let subject_map: HashMap<i64, &Subject> = input.subjects.iter().map(|s| (s.id, s)).collect();
    let class_map: HashMap<i64, &SchoolClass> = input.classes.iter().map(|c| (c.id, c)).collect();
    let mut rooms_by_type: HashMap<String, Vec<&Room>> = HashMap::new();
    for room in &input.rooms {
        rooms_by_type
            .entry(room.room_type.clone())
            .or_default()
            .push(room);
    }

    let subject_name_map: HashMap<i64, String> = input.subjects
        .iter()
        .map(|s| (s.id, s.short_name.clone()))
        .collect();
    let forbidden_pairs = load_forbidden_subject_pairs(&input.constraint_rules);

    // Scope-aware Gewichte-Cache
    let mut weights_cache: HashMap<(i64, i64, i64), ConstraintWeights> = HashMap::new();

    // Planungsaufgaben generieren
    let mut tasks = build_scheduling_tasks(
        &input.classes,
        &input.subjects,
        &input.teachers_for_subject,
        &rooms_by_type,
        &input.class_subject_overrides,
    );

    // Nach Schwierigkeit sortieren (schwierigste zuerst)
    tasks.sort_by(|a, b| b.difficulty.partial_cmp(&a.difficulty).unwrap_or(std::cmp::Ordering::Equal));

    // Greedy-Zuweisung
    let mut state = ScheduleState::new();
    let mut entries = Vec::new();
    let mut total_score_sum = 0.0;
    let mut unplaced_tasks = Vec::new();

    for task in &tasks {
        let candidates = generate_candidates(
            task,
            &input.time_slots,
            &teacher_map,
            &rooms_by_type,
            &state,
            &input.hard_class_restrictions,
        );

        if candidates.is_empty() {
            let subject_name = subject_map
                .get(&task.subject_id)
                .map_or("?", |s| &s.name);
            let class_name = class_map
                .get(&task.class_id)
                .map_or("?", |c| &c.name);
            unplaced_tasks.push(UnplacedTask {
                class_id: task.class_id,
                subject_id: task.subject_id,
                reason: format!(
                    "Keine Hard-Constraint-konformen Kandidaten für {} in Klasse {} gefunden",
                    subject_name, class_name
                ),
            });
            continue;
        }

        let subject = subject_map.get(&task.subject_id).unwrap();
        let class = class_map.get(&task.class_id).unwrap();
        let prefs_empty = Vec::new();

        let effective_hours = input.class_subject_overrides
            .get(&(task.class_id, task.subject_id))
            .copied()
            .unwrap_or(subject.weekly_hours_default);

        let mut best_scored = None;
        let candidates_count = candidates.len();

        for candidate in &candidates {
            let teacher_prefs = input.teacher_preferences
                .get(&candidate.teacher_id)
                .unwrap_or(&prefs_empty);
            let r_mult = input.ranking_multiplier_map
                .get(&candidate.teacher_id)
                .copied()
                .unwrap_or(1.0);

            let ctx_key = (task.class_id, candidate.teacher_id, candidate.room_id);
            let weights = weights_cache
                .entry(ctx_key)
                .or_insert_with(|| {
                    let ctx = ScoringContext {
                        class_id: task.class_id,
                        teacher_id: candidate.teacher_id,
                        room_id: candidate.room_id,
                    };
                    load_constraint_weights_for_context(&input.constraint_rules, &ctx)
                });

            let mut scored = scorer::score_candidate(
                &state,
                candidate,
                task.class_id,
                task.subject_id,
                &subject.short_name,
                effective_hours,
                class.class_teacher_id,
                teacher_prefs,
                &input.active_wishes,
                r_mult,
                weights,
                &subject_name_map,
                &forbidden_pairs,
            );

            // Soft-Bonus für Klassenpräferenz
            if let Some(pref_classes) = input.soft_class_preferences.get(&candidate.teacher_id) {
                if pref_classes.contains(&task.class_id) {
                    scored.total_score += 0.05;
                }
            }

            match &best_scored {
                None => best_scored = Some(scored),
                Some(current_best) if scored.total_score > current_best.total_score => {
                    best_scored = Some(scored);
                }
                _ => {}
            }
        }

        let best = best_scored.unwrap();
        total_score_sum += best.total_score;

        let decision_log = scorer::build_decision_log(&best, candidates_count);

        // In-Memory sammeln statt sofort in DB schreiben
        entries.push(NewScheduleEntry {
            schedule_id: input.schedule_id,
            time_slot_id: best.candidate.time_slot_id,
            class_id: task.class_id,
            subject_id: task.subject_id,
            teacher_id: best.candidate.teacher_id,
            room_id: best.candidate.room_id,
            decision_log: Some(decision_log),
        });

        // ScheduleState aktualisieren (für nächste Iteration)
        update_state(
            &mut state,
            &best.candidate,
            task.class_id,
            task.subject_id,
        );
    }

    let entries_count = entries.len();
    let average_score = if entries_count > 0 {
        total_score_sum / entries_count as f64
    } else {
        0.0
    };

    GreedySolution {
        entries,
        total_score: (total_score_sum * 1000.0).round() / 1000.0,
        average_score: (average_score * 1000.0).round() / 1000.0,
        unplaced_tasks,
    }
}

/// Phase 3: Schreibt die berechneten Einträge in die DB.
/// Braucht DB-Zugriff (conn). Sollte unter Mutex-Lock aufgerufen werden.
pub fn write_greedy_results(conn: &Connection, _schedule_id: i64, solution: &GreedySolution) -> Result<(), AppError> {
    for entry in &solution.entries {
        db::schedule_entries::create_schedule_entry(conn, entry)?;
    }
    Ok(())
}

/// Generiert Planungsaufgaben: Pro (Klasse, Fach) je effective_weekly_hours Tasks.
/// Berechnet Schwierigkeit basierend auf Anzahl qualifizierter Lehrer und Raumverfügbarkeit.
/// Stundentafel-Overrides haben Vorrang vor dem globalen weekly_hours_default.
fn build_scheduling_tasks(
    classes: &[SchoolClass],
    subjects: &[Subject],
    teachers_for_subject: &HashMap<i64, Vec<i64>>,
    rooms_by_type: &HashMap<String, Vec<&Room>>,
    class_subject_overrides: &HashMap<(i64, i64), i32>,
) -> Vec<SchedulingTask> {
    let mut tasks = Vec::new();

    for class in classes {
        for subject in subjects {
            // Effektive Wochenstunden: Override > Default
            let weekly_hours = class_subject_overrides
                .get(&(class.id, subject.id))
                .copied()
                .unwrap_or(subject.weekly_hours_default);

            // 0 Stunden = Fach nicht in dieser Klasse
            if weekly_hours == 0 {
                continue;
            }

            let qualified = teachers_for_subject
                .get(&subject.id)
                .cloned()
                .unwrap_or_default();

            // Nur Tasks für Fächer mit qualifizierten Lehrern erzeugen
            if qualified.is_empty() {
                continue;
            }

            // Räume des passenden Typs zählen
            let room_count = rooms_by_type
                .get(&subject.room_type)
                .map_or(0, |r| r.len());

            if room_count == 0 {
                continue;
            }

            // Schwierigkeit: wenige Lehrer / wenige Räume = schwieriger
            let teacher_factor = 1.0 / (qualified.len() as f64);
            let room_factor = 1.0 / (room_count as f64);
            let difficulty = teacher_factor + room_factor;

            for _ in 0..weekly_hours {
                tasks.push(SchedulingTask {
                    class_id: class.id,
                    subject_id: subject.id,
                    difficulty,
                    required_room_type: subject.room_type.clone(),
                    qualified_teacher_ids: qualified.clone(),
                });
            }
        }
    }

    tasks
}

/// Generiert alle Hard-Constraint-konformen Kandidaten für eine Aufgabe.
fn generate_candidates(
    task: &SchedulingTask,
    time_slots: &[TimeSlot],
    teacher_map: &HashMap<i64, &Teacher>,
    rooms_by_type: &HashMap<String, Vec<&Room>>,
    state: &ScheduleState,
    hard_class_restrictions: &HashMap<i64, std::collections::HashSet<i64>>,
) -> Vec<AssignmentCandidate> {
    let mut candidates = Vec::new();

    let matching_rooms = match rooms_by_type.get(&task.required_room_type) {
        Some(rooms) => rooms,
        None => return candidates,
    };

    for slot in time_slots {
        for &teacher_id in &task.qualified_teacher_ids {
            let teacher = match teacher_map.get(&teacher_id) {
                Some(t) => t,
                None => continue,
            };

            // Hard Constraint: Lehrer-Klassen-Einschränkung (qualification)
            // Wenn der Lehrer qualification-Einträge hat, darf er NUR diese Klassen unterrichten
            if let Some(allowed_classes) = hard_class_restrictions.get(&teacher_id) {
                if !allowed_classes.contains(&task.class_id) {
                    continue;
                }
            }

            for room in matching_rooms {
                let candidate = AssignmentCandidate {
                    time_slot_id: slot.id,
                    day_of_week: slot.day_of_week,
                    period: slot.period,
                    teacher_id,
                    room_id: room.id,
                };

                // Hard Constraints prüfen
                if constraints::check_all_hard_constraints(
                    state,
                    task.class_id,
                    &candidate,
                    teacher,
                    &room.room_type,
                    &task.required_room_type,
                ) {
                    candidates.push(candidate);
                }
            }
        }
    }

    candidates
}

/// Aktualisiert den Belegungszustand nach einer Zuweisung.
fn update_state(
    state: &mut ScheduleState,
    candidate: &AssignmentCandidate,
    class_id: i64,
    subject_id: i64,
) {
    state
        .teacher_slots
        .entry(candidate.time_slot_id)
        .or_default()
        .insert(candidate.teacher_id);

    state
        .room_slots
        .entry(candidate.time_slot_id)
        .or_default()
        .insert(candidate.room_id);

    state
        .class_slots
        .entry(candidate.time_slot_id)
        .or_default()
        .insert(class_id);

    *state
        .teacher_daily_hours
        .entry((candidate.teacher_id, candidate.day_of_week))
        .or_insert(0) += 1;

    *state
        .class_subject_hours
        .entry((class_id, subject_id))
        .or_insert(0) += 1;

    state
        .class_day_periods
        .entry((class_id, candidate.day_of_week))
        .or_default()
        .insert(candidate.period);

    state
        .class_day_subjects
        .entry((class_id, candidate.day_of_week))
        .or_default()
        .push((candidate.period, subject_id));

    state
        .class_subject_days
        .entry((class_id, subject_id))
        .or_default()
        .insert(candidate.day_of_week);

    state
        .teacher_day_periods
        .entry((candidate.teacher_id, candidate.day_of_week))
        .or_default()
        .insert(candidate.period);
}

/// Lädt Constraint-Gewichte scope-aware für einen bestimmten Kontext.
/// Scope-Regeln überschreiben globale Regeln; bei mehreren Scopes gewinnt das höchste Gewicht.
pub(crate) fn load_constraint_weights_for_context(
    rules: &[crate::models::ConstraintRule],
    ctx: &ScoringContext,
) -> ConstraintWeights {
    // Für jeden Regeltyp: effektives Gewicht bestimmen
    // HashMap<rule_type, (weight, is_scoped)> — scoped übertrumpft global, höchstes Gewicht gewinnt bei Konflikt
    let mut effective: std::collections::HashMap<&str, (f64, bool)> = std::collections::HashMap::new();

    for rule in rules {
        if !rule.is_active { continue; }

        let applies = match rule.scope_type.as_str() {
            "global" => true,
            "class" => rule.scope_id == Some(ctx.class_id),
            "teacher" => rule.scope_id == Some(ctx.teacher_id),
            "room" => rule.scope_id == Some(ctx.room_id),
            _ => true,
        };
        if !applies { continue; }

        let is_scoped = rule.scope_type != "global";
        let key = rule.rule_type.as_str();

        match effective.get(key) {
            None => { effective.insert(key, (rule.weight, is_scoped)); }
            Some(&(_, existing_scoped)) => {
                if is_scoped && !existing_scoped {
                    // Scoped ersetzt global
                    effective.insert(key, (rule.weight, true));
                } else if is_scoped == existing_scoped && rule.weight > effective[key].0 {
                    // Gleiche Scope-Ebene: höchstes Gewicht gewinnt
                    effective.insert(key, (rule.weight, is_scoped));
                }
            }
        }
    }

    let get_w = |key: &str| effective.get(key).map(|&(w, _)| w).unwrap_or(0.0);

    ConstraintWeights {
        forbidden_subject_sequence: get_w("forbidden_subject_sequence"),
        even_weekly_distribution: get_w("even_weekly_distribution"),
        avoid_edge_periods: get_w("avoid_edge_periods"),
        minimize_gaps: get_w("minimize_gaps"),
        class_teacher_first_period: get_w("class_teacher_first_period"),
        main_subjects_morning: get_w("main_subjects_morning"),
        teacher_preferences: get_w("teacher_preferences"),
        teacher_wishes: get_w("teacher_wishes"),
    }
}

/// Lädt verbotene Fächerpaare aus allen forbidden_subject_sequence-Regeln.
/// Neues Format: {"first":"Sport","second":"Mathe"} (ein Paar pro Regel)
/// Legacy-Format: {"pairs":[...]} (mehrere Paare in einer Regel)
/// Fallback: Sport/Mathe wenn keine Paare konfiguriert.
pub(crate) fn load_forbidden_subject_pairs(
    rules: &[crate::models::ConstraintRule],
) -> Vec<(String, String)> {
    let mut pairs = Vec::new();
    for rule in rules {
        if rule.rule_type == "forbidden_subject_sequence" && rule.is_active {
            if let Ok(params) = serde_json::from_str::<serde_json::Value>(&rule.parameters) {
                // Neues Format: einzelnes Paar direkt
                if let (Some(first), Some(second)) = (params["first"].as_str(), params["second"].as_str()) {
                    pairs.push((first.to_string(), second.to_string()));
                }
                // Legacy-Format: pairs-Array
                if let Some(pair_array) = params["pairs"].as_array() {
                    for p in pair_array {
                        if let (Some(f), Some(s)) = (p["first"].as_str(), p["second"].as_str()) {
                            pairs.push((f.to_string(), s.to_string()));
                        }
                    }
                }
            }
        }
    }
    if pairs.is_empty() {
        pairs.push(("Sport".to_string(), "Mathe".to_string()));
        pairs.push(("Sp".to_string(), "Ma".to_string()));
    }
    pairs
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::models::*;

    /// Erstellt eine Test-DB mit Seed-Daten und gibt die Verbindung zurück.
    fn setup_test_db() -> Database {
        let db = Database::new_in_memory().unwrap();
        db::time_slots::seed_default_time_slots(&db.conn).unwrap();
        db::constraints::seed_default_constraints(&db.conn).unwrap();
        db
    }

    #[test]
    fn test_empty_schedule_no_data() {
        let db = setup_test_db();

        // Schedule erstellen
        let schedule = db::schedules::create_schedule(
            &db.conn,
            &NewSchedule { name: "Test".into(), status: None, valid_from: None, valid_to: None },
        ).unwrap();

        // Generieren: keine Klassen/Fächer/Lehrer -> 0 Einträge
        let result = generate(&db.conn, schedule.id).unwrap();
        assert_eq!(result.entries_created, 0);
        assert!(result.unplaced_tasks.is_empty());
    }

    #[test]
    fn test_simple_schedule_one_class() {
        let db = setup_test_db();

        // Lehrer erstellen
        let teacher = db::teachers::create_teacher(&db.conn, &NewTeacher {
            name: "Herr Maier".into(),
            email: None,
            engagement_score: Some(0.8),
            pedagogical_score: Some(0.7),
            part_time_quota: Some(1.0),
            max_hours_per_day: Some(6),
        }).unwrap();

        // Fach erstellen (2 Wochenstunden)
        let subject = db::subjects::create_subject(&db.conn, &NewSubject {
            name: "Mathematik".into(),
            short_name: "Ma".into(),
            room_type: Some("standard".into()),
            weekly_hours_default: Some(2),
        }).unwrap();

        // Lehrer-Fach-Zuordnung
        db::teacher_subjects::add_teacher_subject(&db.conn, teacher.id, subject.id).unwrap();

        // Klasse erstellen
        let _class = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(),
            grade_level: 5,
            class_teacher_id: Some(teacher.id),
            student_count: Some(25),
        }).unwrap();

        // Raum erstellen
        let _room = db::rooms::create_room(&db.conn, &NewRoom {
            name: "Raum 101".into(),
            room_type: Some("standard".into()),
            capacity: Some(30),
        }).unwrap();

        // Schedule erstellen
        let schedule = db::schedules::create_schedule(
            &db.conn,
            &NewSchedule { name: "Test".into(), status: None, valid_from: None, valid_to: None },
        ).unwrap();

        // Generieren
        let result = generate(&db.conn, schedule.id).unwrap();
        assert_eq!(result.entries_created, 2); // 2 Wochenstunden Ma
        assert!(result.unplaced_tasks.is_empty());
        assert!(result.average_score > 0.0);

        // Einträge prüfen
        let entries = db::schedule_entries::get_schedule_entries(&db.conn, schedule.id).unwrap();
        assert_eq!(entries.len(), 2);

        // Decision-Log prüfen
        for entry in &entries {
            let log: serde_json::Value = serde_json::from_str(&entry.decision_log).unwrap();
            assert_eq!(log["algorithm"], "greedy");
            assert!(log["total_score"].as_f64().unwrap() > 0.0);
        }
    }

    #[test]
    fn test_unplaced_task_no_qualified_teacher() {
        let db = setup_test_db();

        // Lehrer erstellen (ohne Fachzuordnung!)
        let _teacher = db::teachers::create_teacher(&db.conn, &NewTeacher {
            name: "Herr Schmidt".into(),
            email: None,
            engagement_score: None,
            pedagogical_score: None,
            part_time_quota: None,
            max_hours_per_day: None,
        }).unwrap();

        // Fach erstellen
        let _subject = db::subjects::create_subject(&db.conn, &NewSubject {
            name: "Physik".into(),
            short_name: "Ph".into(),
            room_type: Some("lab".into()),
            weekly_hours_default: Some(2),
        }).unwrap();

        // Klasse erstellen
        let _class = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "7b".into(),
            grade_level: 7,
            class_teacher_id: None,
            student_count: Some(28),
        }).unwrap();

        // Raum erstellen (lab)
        let _room = db::rooms::create_room(&db.conn, &NewRoom {
            name: "Labor 1".into(),
            room_type: Some("lab".into()),
            capacity: Some(20),
        }).unwrap();

        // Schedule erstellen
        let schedule = db::schedules::create_schedule(
            &db.conn,
            &NewSchedule { name: "Test".into(), status: None, valid_from: None, valid_to: None },
        ).unwrap();

        // Generieren: kein qualifizierter Lehrer => Tasks werden übersprungen
        let result = generate(&db.conn, schedule.id).unwrap();
        assert_eq!(result.entries_created, 0);
        // Keine Unplaced-Tasks, da build_scheduling_tasks bereits filtert
        assert!(result.unplaced_tasks.is_empty());
    }

    #[test]
    fn test_no_double_bookings() {
        let db = setup_test_db();

        // 1 Lehrer, 2 Fächer, 2 Klassen -> Lehrer kann nicht doppelt belegt werden
        let teacher = db::teachers::create_teacher(&db.conn, &NewTeacher {
            name: "Frau Müller".into(),
            email: None,
            engagement_score: Some(0.5),
            pedagogical_score: Some(0.5),
            part_time_quota: Some(1.0),
            max_hours_per_day: Some(8),
        }).unwrap();

        let ma = db::subjects::create_subject(&db.conn, &NewSubject {
            name: "Mathematik".into(),
            short_name: "Ma".into(),
            room_type: Some("standard".into()),
            weekly_hours_default: Some(4),
        }).unwrap();

        let de = db::subjects::create_subject(&db.conn, &NewSubject {
            name: "Deutsch".into(),
            short_name: "De".into(),
            room_type: Some("standard".into()),
            weekly_hours_default: Some(4),
        }).unwrap();

        db::teacher_subjects::add_teacher_subject(&db.conn, teacher.id, ma.id).unwrap();
        db::teacher_subjects::add_teacher_subject(&db.conn, teacher.id, de.id).unwrap();

        let _class_a = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(),
            grade_level: 5,
            class_teacher_id: None,
            student_count: Some(25),
        }).unwrap();

        let _class_b = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5b".into(),
            grade_level: 5,
            class_teacher_id: None,
            student_count: Some(25),
        }).unwrap();

        // 2 Räume damit es nicht am Raum scheitert
        db::rooms::create_room(&db.conn, &NewRoom {
            name: "Raum 101".into(),
            room_type: Some("standard".into()),
            capacity: Some(30),
        }).unwrap();
        db::rooms::create_room(&db.conn, &NewRoom {
            name: "Raum 102".into(),
            room_type: Some("standard".into()),
            capacity: Some(30),
        }).unwrap();

        let schedule = db::schedules::create_schedule(
            &db.conn,
            &NewSchedule { name: "Test".into(), status: None, valid_from: None, valid_to: None },
        ).unwrap();

        let result = generate(&db.conn, schedule.id).unwrap();

        // Prüfen: kein Lehrer doppelt im selben Zeitslot
        let entries = db::schedule_entries::get_schedule_entries(&db.conn, schedule.id).unwrap();
        let mut teacher_slot_set: std::collections::HashSet<(i64, i64)> = std::collections::HashSet::new();
        for entry in &entries {
            let key = (entry.teacher_id, entry.time_slot_id);
            assert!(
                teacher_slot_set.insert(key),
                "Doppelbelegung Lehrer {} in Slot {}!",
                entry.teacher_id,
                entry.time_slot_id
            );
        }

        // Prüfen: kein Raum doppelt im selben Zeitslot
        let mut room_slot_set: std::collections::HashSet<(i64, i64)> = std::collections::HashSet::new();
        for entry in &entries {
            let key = (entry.room_id, entry.time_slot_id);
            assert!(
                room_slot_set.insert(key),
                "Doppelbelegung Raum {} in Slot {}!",
                entry.room_id,
                entry.time_slot_id
            );
        }

        // 2 Klassen x (4+4) Stunden = 16 gewünschte Einträge
        // Bei nur 1 Lehrer: maximal so viele wie Zeitslots (45), aber 16 sollte passen
        assert_eq!(result.entries_created, 16);
        assert!(result.unplaced_tasks.is_empty());
    }

    #[test]
    fn test_schedule_must_be_draft() {
        let db = setup_test_db();

        let schedule = db::schedules::create_schedule(
            &db.conn,
            &NewSchedule { name: "Aktiv".into(), status: Some("active".into()), valid_from: None, valid_to: None },
        ).unwrap();

        let result = generate(&db.conn, schedule.id);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("draft"));
    }
}
