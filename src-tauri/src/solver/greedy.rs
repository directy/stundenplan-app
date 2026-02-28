use std::collections::HashMap;
use rusqlite::Connection;

use crate::db;
use crate::error::AppError;
use crate::models::{
    NewScheduleEntry, Room, SchoolClass, Subject, Teacher, TeacherPreference, TimeSlot,
};

use super::constraints;
use super::scorer;
use super::types::{
    AssignmentCandidate, ConstraintWeights, GenerationResult, ScheduleState, SchedulingTask,
    UnplacedTask,
};

/// Kernfunktion: Generiert einen Stundenplan mit dem Greedy-Algorithmus.
///
/// 1. Validiert den Schedule (muss existieren, Status "draft")
/// 2. Laedt alle Stammdaten
/// 3. Generiert Planungsaufgaben, sortiert nach Schwierigkeit
/// 4. Weist greedy den besten Kandidaten je Aufgabe zu
/// 5. Gibt GenerationResult zurueck
pub fn generate(conn: &Connection, schedule_id: i64) -> Result<GenerationResult, AppError> {
    // 1. Validierung
    let schedule = db::schedules::get_schedule(conn, schedule_id)?;
    if schedule.status != "draft" {
        return Err(AppError::Validation(format!(
            "Stundenplan '{}' hat Status '{}', erwartet 'draft'",
            schedule.name, schedule.status
        )));
    }

    // Bestehende Eintraege loeschen (falls Re-Generierung)
    conn.execute(
        "DELETE FROM schedule_entries WHERE schedule_id = ?1",
        [schedule_id],
    )?;

    // 2. Alle Stammdaten laden
    let teachers = db::teachers::get_teachers(conn)?;
    let subjects = db::subjects::get_subjects(conn)?;
    let classes = db::classes::get_classes(conn)?;
    let rooms = db::rooms::get_rooms(conn)?;
    let time_slots = db::time_slots::get_time_slots(conn)?;
    let constraint_rules = db::constraints::get_constraint_rules(conn)?;

    // Falls keine Basisdaten vorhanden, leeres Ergebnis
    if classes.is_empty() || subjects.is_empty() || teachers.is_empty() || rooms.is_empty() {
        return Ok(GenerationResult {
            entries_created: 0,
            total_score: 0.0,
            average_score: 0.0,
            unplaced_tasks: Vec::new(),
        });
    }

    // 3. Lookup-Maps erstellen
    let teacher_map: HashMap<i64, &Teacher> = teachers.iter().map(|t| (t.id, t)).collect();
    let subject_map: HashMap<i64, &Subject> = subjects.iter().map(|s| (s.id, s)).collect();
    let class_map: HashMap<i64, &SchoolClass> = classes.iter().map(|c| (c.id, c)).collect();
    // Raeume nach Typ gruppieren
    let mut rooms_by_type: HashMap<String, Vec<&Room>> = HashMap::new();
    for room in &rooms {
        rooms_by_type
            .entry(room.room_type.clone())
            .or_default()
            .push(room);
    }

    // Lehrer-Fach-Zuordnungen laden
    let mut teachers_for_subject: HashMap<i64, Vec<i64>> = HashMap::new();
    for subject in &subjects {
        let qualified = db::teacher_subjects::get_teachers_for_subject(conn, subject.id)?;
        teachers_for_subject.insert(subject.id, qualified.iter().map(|t| t.id).collect());
    }

    // Lehrer-Praeferenzen laden
    let mut teacher_preferences: HashMap<i64, Vec<TeacherPreference>> = HashMap::new();
    for teacher in &teachers {
        let prefs = db::preferences::get_preferences_for_teacher(conn, teacher.id)?;
        if !prefs.is_empty() {
            teacher_preferences.insert(teacher.id, prefs);
        }
    }

    // Constraint-Gewichte laden
    let weights = load_constraint_weights(&constraint_rules);

    // 4. Planungsaufgaben generieren
    let mut tasks = build_scheduling_tasks(
        &classes,
        &subjects,
        &teachers_for_subject,
        &rooms_by_type,
    );

    // Nach Schwierigkeit sortieren (schwierigste zuerst, gemaess CLAUDE.md)
    tasks.sort_by(|a, b| b.difficulty.partial_cmp(&a.difficulty).unwrap_or(std::cmp::Ordering::Equal));

    // 5. Greedy-Zuweisung
    let mut state = ScheduleState::new();
    let mut entries_created = 0;
    let mut total_score_sum = 0.0;
    let mut unplaced_tasks = Vec::new();

    for task in &tasks {
        // Alle Hard-Constraint-konformen Kandidaten generieren
        let candidates = generate_candidates(
            task,
            &time_slots,
            &teacher_map,
            &rooms_by_type,
            &state,
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
                    "Keine Hard-Constraint-konformen Kandidaten fuer {} in Klasse {} gefunden",
                    subject_name, class_name
                ),
            });
            continue;
        }

        // Jeden Kandidaten mit Soft Constraints bewerten
        let subject = subject_map.get(&task.subject_id).unwrap();
        let class = class_map.get(&task.class_id).unwrap();
        let prefs_empty = Vec::new();

        let mut best_scored = None;
        let candidates_count = candidates.len();

        for candidate in &candidates {
            let teacher_prefs = teacher_preferences
                .get(&candidate.teacher_id)
                .unwrap_or(&prefs_empty);

            let scored = scorer::score_candidate(
                &state,
                candidate,
                task.class_id,
                task.subject_id,
                &subject.short_name,
                subject.weekly_hours_default,
                class.class_teacher_id,
                teacher_prefs,
                &weights,
            );

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

        // Decision-Log erstellen
        let decision_log = scorer::build_decision_log(&best, candidates_count);

        // Schedule-Entry in DB speichern
        let new_entry = NewScheduleEntry {
            schedule_id,
            time_slot_id: best.candidate.time_slot_id,
            class_id: task.class_id,
            subject_id: task.subject_id,
            teacher_id: best.candidate.teacher_id,
            room_id: best.candidate.room_id,
            decision_log: Some(decision_log),
        };
        db::schedule_entries::create_schedule_entry(conn, &new_entry)?;
        entries_created += 1;

        // ScheduleState aktualisieren
        update_state(
            &mut state,
            &best.candidate,
            task.class_id,
            task.subject_id,
        );
    }

    let average_score = if entries_created > 0 {
        total_score_sum / entries_created as f64
    } else {
        0.0
    };

    Ok(GenerationResult {
        entries_created,
        total_score: (total_score_sum * 1000.0).round() / 1000.0,
        average_score: (average_score * 1000.0).round() / 1000.0,
        unplaced_tasks,
    })
}

/// Generiert Planungsaufgaben: Pro (Klasse, Fach) je weekly_hours_default Tasks.
/// Berechnet Schwierigkeit basierend auf Anzahl qualifizierter Lehrer und Raumverfuegbarkeit.
fn build_scheduling_tasks(
    classes: &[SchoolClass],
    subjects: &[Subject],
    teachers_for_subject: &HashMap<i64, Vec<i64>>,
    rooms_by_type: &HashMap<String, Vec<&Room>>,
) -> Vec<SchedulingTask> {
    let mut tasks = Vec::new();

    for class in classes {
        for subject in subjects {
            let qualified = teachers_for_subject
                .get(&subject.id)
                .cloned()
                .unwrap_or_default();

            // Nur Tasks fuer Faecher mit qualifizierten Lehrern erzeugen
            if qualified.is_empty() {
                continue;
            }

            // Raeume des passenden Typs zaehlen
            let room_count = rooms_by_type
                .get(&subject.room_type)
                .map_or(0, |r| r.len());

            if room_count == 0 {
                continue;
            }

            // Schwierigkeit: wenige Lehrer / wenige Raeume = schwieriger
            let teacher_factor = 1.0 / (qualified.len() as f64);
            let room_factor = 1.0 / (room_count as f64);
            let difficulty = teacher_factor + room_factor;

            // weekly_hours_default Tasks pro (Klasse, Fach)
            for _ in 0..subject.weekly_hours_default {
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

/// Generiert alle Hard-Constraint-konformen Kandidaten fuer eine Aufgabe.
fn generate_candidates(
    task: &SchedulingTask,
    time_slots: &[TimeSlot],
    teacher_map: &HashMap<i64, &Teacher>,
    rooms_by_type: &HashMap<String, Vec<&Room>>,
    state: &ScheduleState,
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

            for room in matching_rooms {
                let candidate = AssignmentCandidate {
                    time_slot_id: slot.id,
                    day_of_week: slot.day_of_week,
                    period: slot.period,
                    teacher_id,
                    room_id: room.id,
                };

                // Hard Constraints pruefen
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
}

/// Laedt Constraint-Gewichte aus den constraint_rules.
/// Inaktive Regeln erhalten Gewicht 0.0.
fn load_constraint_weights(
    rules: &[crate::models::ConstraintRule],
) -> ConstraintWeights {
    let mut weights = ConstraintWeights {
        no_sports_after_math: 0.0,
        even_weekly_distribution: 0.0,
        avoid_edge_periods: 0.0,
        minimize_gaps: 0.0,
        class_teacher_first_period: 0.0,
        main_subjects_morning: 0.0,
        teacher_preferences: 0.0,
    };

    for rule in rules {
        let w = if rule.is_active { rule.weight } else { 0.0 };
        match rule.rule_type.as_str() {
            "no_sports_after_math" => weights.no_sports_after_math = w,
            "even_weekly_distribution" => weights.even_weekly_distribution = w,
            "avoid_edge_periods" => weights.avoid_edge_periods = w,
            "minimize_gaps" => weights.minimize_gaps = w,
            "class_teacher_first_period" => weights.class_teacher_first_period = w,
            "main_subjects_morning" => weights.main_subjects_morning = w,
            "teacher_preferences" => weights.teacher_preferences = w,
            _ => {} // Unbekannte Regel ignorieren
        }
    }

    weights
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::models::*;

    /// Erstellt eine Test-DB mit Seed-Daten und gibt die Verbindung zurueck.
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
            &NewSchedule { name: "Test".into(), status: None },
        ).unwrap();

        // Generieren: keine Klassen/Faecher/Lehrer -> 0 Eintraege
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
            &NewSchedule { name: "Test".into(), status: None },
        ).unwrap();

        // Generieren
        let result = generate(&db.conn, schedule.id).unwrap();
        assert_eq!(result.entries_created, 2); // 2 Wochenstunden Ma
        assert!(result.unplaced_tasks.is_empty());
        assert!(result.average_score > 0.0);

        // Eintraege pruefen
        let entries = db::schedule_entries::get_schedule_entries(&db.conn, schedule.id).unwrap();
        assert_eq!(entries.len(), 2);

        // Decision-Log pruefen
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
            &NewSchedule { name: "Test".into(), status: None },
        ).unwrap();

        // Generieren: kein qualifizierter Lehrer => Tasks werden uebersprungen
        let result = generate(&db.conn, schedule.id).unwrap();
        assert_eq!(result.entries_created, 0);
        // Keine Unplaced-Tasks, da build_scheduling_tasks bereits filtert
        assert!(result.unplaced_tasks.is_empty());
    }

    #[test]
    fn test_no_double_bookings() {
        let db = setup_test_db();

        // 1 Lehrer, 2 Faecher, 2 Klassen -> Lehrer kann nicht doppelt belegt werden
        let teacher = db::teachers::create_teacher(&db.conn, &NewTeacher {
            name: "Frau Mueller".into(),
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

        // 2 Raeume damit es nicht am Raum scheitert
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
            &NewSchedule { name: "Test".into(), status: None },
        ).unwrap();

        let result = generate(&db.conn, schedule.id).unwrap();

        // Pruefen: kein Lehrer doppelt im selben Zeitslot
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

        // Pruefen: kein Raum doppelt im selben Zeitslot
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

        // 2 Klassen x (4+4) Stunden = 16 gewuenschte Eintraege
        // Bei nur 1 Lehrer: maximal so viele wie Zeitslots (45), aber 16 sollte passen
        assert_eq!(result.entries_created, 16);
        assert!(result.unplaced_tasks.is_empty());
    }

    #[test]
    fn test_schedule_must_be_draft() {
        let db = setup_test_db();

        let schedule = db::schedules::create_schedule(
            &db.conn,
            &NewSchedule { name: "Aktiv".into(), status: Some("active".into()) },
        ).unwrap();

        let result = generate(&db.conn, schedule.id);
        assert!(result.is_err());
        let err = result.unwrap_err().to_string();
        assert!(err.contains("draft"));
    }
}
