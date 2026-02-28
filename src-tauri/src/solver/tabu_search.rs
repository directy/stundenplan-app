use std::collections::HashMap;
use rand::Rng;
use rusqlite::{params, Connection};

use crate::db;
use crate::error::AppError;
use crate::models::{Teacher, TeacherPreference};
use super::constraints;
use super::scorer;
use super::greedy;
use super::types::*;

// ============================================================================
// Move-Typen
// ============================================================================

/// Ein moeglicher Zug im Tabu-Search
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub enum TabuMove {
    /// Zwei Eintraege derselben Klasse tauschen Timeslots + Rooms
    Swap { entry_a_idx: usize, entry_b_idx: usize },
    /// Ein Eintrag bekommt einen anderen qualifizierten Lehrer
    TeacherReassign { entry_idx: usize, old_teacher_id: i64, new_teacher_id: i64 },
}

// ============================================================================
// Tabu-Liste
// ============================================================================

struct TabuList {
    entries: HashMap<TabuMove, usize>,
    tenure: usize,
}

impl TabuList {
    fn new(tenure: usize) -> Self {
        Self { entries: HashMap::new(), tenure }
    }

    fn is_tabu(&self, mv: &TabuMove, iteration: usize) -> bool {
        self.entries.get(mv).is_some_and(|&expires| iteration < expires)
    }

    fn add(&mut self, mv: TabuMove, iteration: usize) {
        self.entries.insert(mv, iteration + self.tenure);
    }

    fn cleanup(&mut self, iteration: usize) {
        self.entries.retain(|_, expires| *expires > iteration);
    }
}

/// Erzeugt den Reverse-Move fuer die Tabu-Liste.
fn reverse_move(mv: &TabuMove) -> TabuMove {
    match mv {
        TabuMove::Swap { entry_a_idx, entry_b_idx } => TabuMove::Swap {
            entry_a_idx: *entry_b_idx,
            entry_b_idx: *entry_a_idx,
        },
        TabuMove::TeacherReassign { entry_idx, old_teacher_id, new_teacher_id } => {
            TabuMove::TeacherReassign {
                entry_idx: *entry_idx,
                old_teacher_id: *new_teacher_id,
                new_teacher_id: *old_teacher_id,
            }
        }
    }
}

// ============================================================================
// Scoring-Helfer
// ============================================================================

/// Berechnet den Score eines einzelnen Entries im aktuellen State.
fn score_entry(
    entry: &EntrySnapshot,
    state: &ScheduleState,
    weights: &ConstraintWeights,
    class_teacher_map: &HashMap<i64, Option<i64>>,
    teacher_prefs: &HashMap<i64, Vec<TeacherPreference>>,
    subject_weekly_hours: &HashMap<i64, i32>,
) -> f64 {
    let candidate = AssignmentCandidate {
        time_slot_id: entry.time_slot_id,
        day_of_week: entry.day_of_week,
        period: entry.period,
        teacher_id: entry.teacher_id,
        room_id: entry.room_id,
    };

    let class_teacher_id = class_teacher_map.get(&entry.class_id).copied().flatten();
    let weekly_hours = subject_weekly_hours.get(&entry.subject_id).copied().unwrap_or(2);
    let empty_prefs = Vec::new();
    let prefs = teacher_prefs.get(&entry.teacher_id).unwrap_or(&empty_prefs);

    let scored = scorer::score_candidate(
        state,
        &candidate,
        entry.class_id,
        entry.subject_id,
        &entry.subject_short_name,
        weekly_hours,
        class_teacher_id,
        prefs,
        weights,
    );
    scored.total_score
}

/// Berechnet den Durchschnittsscore aller Entries.
fn total_average_score(
    entries: &[EntrySnapshot],
    state: &ScheduleState,
    weights: &ConstraintWeights,
    class_teacher_map: &HashMap<i64, Option<i64>>,
    teacher_prefs: &HashMap<i64, Vec<TeacherPreference>>,
    subject_weekly_hours: &HashMap<i64, i32>,
) -> f64 {
    if entries.is_empty() { return 0.0; }
    let sum: f64 = entries.iter()
        .map(|e| score_entry(e, state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours))
        .sum();
    sum / entries.len() as f64
}

// ============================================================================
// Move-Anwendung
// ============================================================================

/// Wendet einen Swap-Move an: Tauscht time_slot_id, day_of_week, period, room_id.
fn apply_swap(entries: &mut [EntrySnapshot], state: &mut ScheduleState, a: usize, b: usize) {
    state.remove_entry(&entries[a]);
    state.remove_entry(&entries[b]);

    // Tausche Slot-Daten
    let (a_ts, a_dow, a_per, a_room) = (
        entries[a].time_slot_id, entries[a].day_of_week, entries[a].period, entries[a].room_id,
    );
    entries[a].time_slot_id = entries[b].time_slot_id;
    entries[a].day_of_week = entries[b].day_of_week;
    entries[a].period = entries[b].period;
    entries[a].room_id = entries[b].room_id;
    entries[b].time_slot_id = a_ts;
    entries[b].day_of_week = a_dow;
    entries[b].period = a_per;
    entries[b].room_id = a_room;

    state.add_entry(&entries[a]);
    state.add_entry(&entries[b]);
}

/// Wendet einen Teacher-Reassign-Move an.
fn apply_teacher_reassign(entries: &mut [EntrySnapshot], state: &mut ScheduleState, idx: usize, new_teacher_id: i64) {
    state.remove_entry(&entries[idx]);
    entries[idx].teacher_id = new_teacher_id;
    state.add_entry(&entries[idx]);
}

// ============================================================================
// Nachbarschafts-Generierung
// ============================================================================

/// Generiert eine Stichprobe von Kandidaten-Moves mit Delta-Score.
#[allow(clippy::too_many_arguments)]
fn generate_neighborhood(
    entries: &mut [EntrySnapshot],
    state: &mut ScheduleState,
    sample_size: usize,
    weights: &ConstraintWeights,
    class_teacher_map: &HashMap<i64, Option<i64>>,
    teacher_prefs: &HashMap<i64, Vec<TeacherPreference>>,
    subject_weekly_hours: &HashMap<i64, i32>,
    teacher_map: &HashMap<i64, Teacher>,
    qualified_teachers: &HashMap<i64, Vec<i64>>,
    room_types: &HashMap<i64, String>,
    rng: &mut impl Rng,
) -> Vec<(TabuMove, f64)> {
    let mut moves = Vec::with_capacity(sample_size);
    let n = entries.len();
    if n < 2 { return moves; }

    // Group entries by class_id for swap moves
    let mut class_entries: HashMap<i64, Vec<usize>> = HashMap::new();
    for (i, e) in entries.iter().enumerate() {
        class_entries.entry(e.class_id).or_default().push(i);
    }
    let class_groups: Vec<Vec<usize>> = class_entries.into_values()
        .filter(|v| v.len() >= 2)
        .collect();

    let swap_attempts = sample_size * 7 / 10; // 70% swaps
    let reassign_attempts = sample_size - swap_attempts; // 30% reassigns

    // Swap-Moves
    for _ in 0..swap_attempts {
        if class_groups.is_empty() { break; }
        let group = &class_groups[rng.random_range(0..class_groups.len())];
        let ai = rng.random_range(0..group.len());
        let bi = rng.random_range(0..group.len());
        if ai == bi { continue; }
        let a = group[ai];
        let b = group[bi];
        if entries[a].time_slot_id == entries[b].time_slot_id { continue; }

        // Pruefen: Raumtyp-Kompatibilitaet nach Tausch
        let room_a_type = room_types.get(&entries[a].room_id).map(|s| s.as_str()).unwrap_or("standard");
        let room_b_type = room_types.get(&entries[b].room_id).map(|s| s.as_str()).unwrap_or("standard");
        if !constraints::check_room_type_match(room_b_type, &entries[a].required_room_type) { continue; }
        if !constraints::check_room_type_match(room_a_type, &entries[b].required_room_type) { continue; }

        // Score vor dem Move
        let score_before = score_entry(&entries[a], state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours)
            + score_entry(&entries[b], state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours);

        // Move anwenden
        apply_swap(entries, state, a, b);

        // Hard Constraint Check nach Swap
        let teacher_a = teacher_map.get(&entries[a].teacher_id);
        let teacher_b = teacher_map.get(&entries[b].teacher_id);
        let cand_a = AssignmentCandidate {
            time_slot_id: entries[a].time_slot_id, day_of_week: entries[a].day_of_week,
            period: entries[a].period, teacher_id: entries[a].teacher_id, room_id: entries[a].room_id,
        };
        let cand_b = AssignmentCandidate {
            time_slot_id: entries[b].time_slot_id, day_of_week: entries[b].day_of_week,
            period: entries[b].period, teacher_id: entries[b].teacher_id, room_id: entries[b].room_id,
        };

        let hard_ok = if let (Some(ta), Some(tb)) = (teacher_a, teacher_b) {
            let ra_type = room_types.get(&entries[a].room_id).map(|s| s.as_str()).unwrap_or("standard");
            let rb_type = room_types.get(&entries[b].room_id).map(|s| s.as_str()).unwrap_or("standard");
            constraints::check_no_teacher_double_booking(state, &cand_a)
                && constraints::check_no_teacher_double_booking(state, &cand_b)
                && constraints::check_max_hours_per_day(state, &cand_a, ta)
                && constraints::check_max_hours_per_day(state, &cand_b, tb)
                && constraints::check_room_type_match(ra_type, &entries[a].required_room_type)
                && constraints::check_room_type_match(rb_type, &entries[b].required_room_type)
        } else {
            false
        };

        if hard_ok {
            let score_after = score_entry(&entries[a], state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours)
                + score_entry(&entries[b], state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours);
            let delta = (score_after - score_before) / entries.len() as f64;
            moves.push((TabuMove::Swap { entry_a_idx: a, entry_b_idx: b }, delta));
        }

        // Move rueckgaengig machen
        apply_swap(entries, state, a, b);
    }

    // TeacherReassign-Moves
    for _ in 0..reassign_attempts {
        let idx = rng.random_range(0..n);
        let entry = &entries[idx];

        let qualified = match qualified_teachers.get(&entry.subject_id) {
            Some(q) => q,
            None => continue,
        };
        if qualified.len() < 2 { continue; }

        let new_teacher_id = qualified[rng.random_range(0..qualified.len())];
        if new_teacher_id == entry.teacher_id { continue; }

        let teacher = match teacher_map.get(&new_teacher_id) {
            Some(t) => t,
            None => continue,
        };

        // Score vor dem Move
        let score_before = score_entry(&entries[idx], state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours);

        // Move anwenden
        let old_teacher_id = entries[idx].teacher_id;
        apply_teacher_reassign(entries, state, idx, new_teacher_id);

        // Hard Constraint Check
        let cand = AssignmentCandidate {
            time_slot_id: entries[idx].time_slot_id, day_of_week: entries[idx].day_of_week,
            period: entries[idx].period, teacher_id: new_teacher_id, room_id: entries[idx].room_id,
        };
        let hard_ok = constraints::check_no_teacher_double_booking(state, &cand)
            && constraints::check_max_hours_per_day(state, &cand, teacher);

        if hard_ok {
            let score_after = score_entry(&entries[idx], state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours);
            let delta = (score_after - score_before) / entries.len() as f64;
            moves.push((TabuMove::TeacherReassign { entry_idx: idx, old_teacher_id, new_teacher_id }, delta));
        }

        // Move rueckgaengig machen
        apply_teacher_reassign(entries, state, idx, old_teacher_id);
    }

    moves
}

// ============================================================================
// Hauptfunktion
// ============================================================================

/// Optimiert einen bestehenden Stundenplan mittels Tabu Search.
pub fn optimize(
    conn: &Connection,
    schedule_id: i64,
    config: TabuSearchConfig,
) -> Result<OptimizationResult, AppError> {
    // 1. Validierung
    let _schedule = db::schedules::get_schedule(conn, schedule_id)?;

    // 2. Stammdaten laden
    let all_teachers = db::teachers::get_teachers(conn)?;
    let subjects = db::subjects::get_subjects(conn)?;
    let classes = db::classes::get_classes(conn)?;
    let rooms = db::rooms::get_rooms(conn)?;
    let _time_slots = db::time_slots::get_time_slots(conn)?;
    let constraint_rules = db::constraints::get_constraint_rules(conn)?;

    // Praeferenzen pro Lehrer laden (wie in greedy.rs)
    let mut all_prefs: HashMap<i64, Vec<TeacherPreference>> = HashMap::new();
    for teacher in &all_teachers {
        let prefs = db::preferences::get_preferences_for_teacher(conn, teacher.id)?;
        if !prefs.is_empty() {
            all_prefs.insert(teacher.id, prefs);
        }
    }

    let weights = greedy::load_constraint_weights(&constraint_rules);

    // Lookup-Maps
    let teacher_map: HashMap<i64, Teacher> = all_teachers.iter()
        .map(|t| (t.id, t.clone())).collect();
    let class_teacher_map: HashMap<i64, Option<i64>> = classes.iter()
        .map(|c| (c.id, c.class_teacher_id)).collect();
    let subject_weekly_hours: HashMap<i64, i32> = subjects.iter()
        .map(|s| (s.id, s.weekly_hours_default)).collect();
    let room_types: HashMap<i64, String> = rooms.iter()
        .map(|r| (r.id, r.room_type.clone())).collect();

    // Qualifizierte Lehrer pro Fach (wie in greedy.rs)
    let mut qualified_teachers: HashMap<i64, Vec<i64>> = HashMap::new();
    for subject in &subjects {
        let teachers = db::teacher_subjects::get_teachers_for_subject(conn, subject.id)?;
        qualified_teachers.insert(subject.id, teachers.iter().map(|t| t.id).collect());
    }

    // 3. schedule_entries laden -> EntrySnapshots
    let mut entries = load_entry_snapshots(conn, schedule_id)?;
    if entries.is_empty() {
        return Err(AppError::Validation("Stundenplan hat keine Eintraege. Bitte zuerst generieren.".to_string()));
    }

    // 4. ScheduleState aufbauen
    let mut state = ScheduleState::from_entries(&entries);

    // 5. Initialen Score berechnen
    let initial_score = total_average_score(
        &entries, &state, &weights, &class_teacher_map, &all_prefs, &subject_weekly_hours,
    );

    // 6. Tabu-Search-Hauptschleife
    let mut rng = rand::rng();
    let mut tabu_list = TabuList::new(config.tabu_tenure);
    let mut best_score = initial_score;
    let mut best_entries = entries.clone();
    let mut current_score = initial_score;
    let mut no_improve_count = 0;
    let mut moves_applied = 0;
    let mut modified_entry_ids: std::collections::HashSet<i64> = std::collections::HashSet::new();

    for iteration in 0..config.max_iterations {
        // Periodisch Tabu-Liste aufraeumen
        if iteration % 50 == 0 {
            tabu_list.cleanup(iteration);
        }

        // Nachbarschaft generieren
        let neighborhood = generate_neighborhood(
            &mut entries, &mut state, config.neighborhood_sample_size,
            &weights, &class_teacher_map, &all_prefs, &subject_weekly_hours,
            &teacher_map, &qualified_teachers, &room_types, &mut rng,
        );

        // Besten Move finden
        let mut best_move: Option<(TabuMove, f64)> = None;
        for (mv, delta) in &neighborhood {
            let is_tabu = tabu_list.is_tabu(mv, iteration);
            let aspiration = current_score + delta > best_score;

            if !is_tabu || aspiration {
                match &best_move {
                    None => best_move = Some((mv.clone(), *delta)),
                    Some((_, best_delta)) if delta > best_delta => {
                        best_move = Some((mv.clone(), *delta));
                    }
                    _ => {}
                }
            }
        }

        // Move anwenden (auch wenn delta < 0)
        if let Some((the_move, delta)) = best_move {
            match &the_move {
                TabuMove::Swap { entry_a_idx, entry_b_idx } => {
                    apply_swap(&mut entries, &mut state, *entry_a_idx, *entry_b_idx);
                    modified_entry_ids.insert(entries[*entry_a_idx].db_id);
                    modified_entry_ids.insert(entries[*entry_b_idx].db_id);
                }
                TabuMove::TeacherReassign { entry_idx, new_teacher_id, .. } => {
                    apply_teacher_reassign(&mut entries, &mut state, *entry_idx, *new_teacher_id);
                    modified_entry_ids.insert(entries[*entry_idx].db_id);
                }
            }

            current_score += delta;
            tabu_list.add(reverse_move(&the_move), iteration);
            moves_applied += 1;

            if current_score > best_score {
                best_score = current_score;
                best_entries = entries.clone();
                no_improve_count = 0;
            } else {
                no_improve_count += 1;
            }
        } else {
            no_improve_count += 1;
        }

        if no_improve_count >= config.max_no_improve {
            break;
        }
    }

    // 7. Beste Loesung wiederherstellen
    entries = best_entries;

    // 8. Aenderungen in DB schreiben
    let entries_modified = persist_optimized_entries(conn, &entries, &modified_entry_ids, &state, &weights, &class_teacher_map, &all_prefs, &subject_weekly_hours)?;

    let improvement = if initial_score > 0.0 {
        ((best_score - initial_score) / initial_score) * 100.0
    } else {
        0.0
    };

    Ok(OptimizationResult {
        initial_score: (initial_score * 1000.0).round() / 1000.0,
        final_score: (best_score * 1000.0).round() / 1000.0,
        improvement_percent: (improvement * 10.0).round() / 10.0,
        iterations_run: config.max_iterations.min(moves_applied + config.max_no_improve),
        moves_applied,
        entries_modified,
    })
}

// ============================================================================
// DB-Helfer
// ============================================================================

/// Laedt alle schedule_entries als EntrySnapshots mit JOINs.
fn load_entry_snapshots(conn: &Connection, schedule_id: i64) -> Result<Vec<EntrySnapshot>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT se.id, se.schedule_id, se.time_slot_id, ts.day_of_week, ts.period,
                se.class_id, se.subject_id, se.teacher_id, se.room_id,
                s.short_name, s.room_type
         FROM schedule_entries se
         JOIN time_slots ts ON se.time_slot_id = ts.id
         JOIN subjects s ON se.subject_id = s.id
         WHERE se.schedule_id = ?1"
    )?;

    let snapshots = stmt.query_map([schedule_id], |row| {
        Ok(EntrySnapshot {
            db_id: row.get(0)?,
            schedule_id: row.get(1)?,
            time_slot_id: row.get(2)?,
            day_of_week: row.get(3)?,
            period: row.get(4)?,
            class_id: row.get(5)?,
            subject_id: row.get(6)?,
            teacher_id: row.get(7)?,
            room_id: row.get(8)?,
            subject_short_name: row.get(9)?,
            required_room_type: row.get(10)?,
        })
    })?.filter_map(|r| r.ok()).collect();

    Ok(snapshots)
}

/// Schreibt optimierte Entries zurueck in die DB mit neuem decision_log.
#[allow(clippy::too_many_arguments)]
fn persist_optimized_entries(
    conn: &Connection,
    entries: &[EntrySnapshot],
    modified_ids: &std::collections::HashSet<i64>,
    state: &ScheduleState,
    weights: &ConstraintWeights,
    class_teacher_map: &HashMap<i64, Option<i64>>,
    teacher_prefs: &HashMap<i64, Vec<TeacherPreference>>,
    subject_weekly_hours: &HashMap<i64, i32>,
) -> Result<usize, AppError> {
    let mut count = 0;
    for entry in entries {
        if !modified_ids.contains(&entry.db_id) { continue; }

        let new_score = score_entry(entry, state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours);

        let decision_log = serde_json::json!({
            "algorithm": "tabu_search",
            "soft_scores": build_soft_scores(entry, state, weights, class_teacher_map, teacher_prefs, subject_weekly_hours),
            "total_score": (new_score * 1000.0).round() / 1000.0,
            "reason": format!("Tabu-Search-Optimierung: Score {:.3}", new_score)
        }).to_string();

        conn.execute(
            "UPDATE schedule_entries SET time_slot_id = ?1, teacher_id = ?2, room_id = ?3, decision_log = ?4 WHERE id = ?5",
            params![entry.time_slot_id, entry.teacher_id, entry.room_id, decision_log, entry.db_id],
        )?;
        count += 1;
    }
    Ok(count)
}

/// Berechnet die einzelnen Soft-Scores fuer den decision_log.
fn build_soft_scores(
    entry: &EntrySnapshot,
    state: &ScheduleState,
    weights: &ConstraintWeights,
    class_teacher_map: &HashMap<i64, Option<i64>>,
    teacher_prefs: &HashMap<i64, Vec<TeacherPreference>>,
    subject_weekly_hours: &HashMap<i64, i32>,
) -> serde_json::Value {
    let candidate = AssignmentCandidate {
        time_slot_id: entry.time_slot_id,
        day_of_week: entry.day_of_week,
        period: entry.period,
        teacher_id: entry.teacher_id,
        room_id: entry.room_id,
    };

    let class_teacher_id = class_teacher_map.get(&entry.class_id).copied().flatten();
    let weekly_hours = subject_weekly_hours.get(&entry.subject_id).copied().unwrap_or(2);
    let empty_prefs = Vec::new();
    let prefs = teacher_prefs.get(&entry.teacher_id).unwrap_or(&empty_prefs);

    let scored = scorer::score_candidate(
        state, &candidate, entry.class_id, entry.subject_id,
        &entry.subject_short_name, weekly_hours, class_teacher_id,
        prefs, weights,
    );

    scored.soft_scores.iter()
        .map(|(k, v)| (k.clone(), serde_json::json!((*v * 1000.0).round() / 1000.0)))
        .collect::<serde_json::Map<String, serde_json::Value>>()
        .into()
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tabu_list_basic() {
        let mut tl = TabuList::new(3);
        let mv = TabuMove::Swap { entry_a_idx: 0, entry_b_idx: 1 };
        assert!(!tl.is_tabu(&mv, 0));

        tl.add(mv.clone(), 0);
        assert!(tl.is_tabu(&mv, 1)); // iteration 1 < expires 3
        assert!(tl.is_tabu(&mv, 2)); // iteration 2 < expires 3
        assert!(!tl.is_tabu(&mv, 3)); // iteration 3 >= expires 3 -> abgelaufen
    }

    #[test]
    fn test_tabu_list_cleanup() {
        let mut tl = TabuList::new(2);
        tl.add(TabuMove::Swap { entry_a_idx: 0, entry_b_idx: 1 }, 0); // expires at 2
        tl.add(TabuMove::Swap { entry_a_idx: 2, entry_b_idx: 3 }, 5); // expires at 7
        assert_eq!(tl.entries.len(), 2);

        tl.cleanup(3);
        assert_eq!(tl.entries.len(), 1); // First one expired
    }

    #[test]
    fn test_reverse_move_swap() {
        let mv = TabuMove::Swap { entry_a_idx: 2, entry_b_idx: 5 };
        let rev = reverse_move(&mv);
        assert_eq!(rev, TabuMove::Swap { entry_a_idx: 5, entry_b_idx: 2 });
    }

    #[test]
    fn test_reverse_move_reassign() {
        let mv = TabuMove::TeacherReassign { entry_idx: 1, old_teacher_id: 10, new_teacher_id: 20 };
        let rev = reverse_move(&mv);
        assert_eq!(rev, TabuMove::TeacherReassign { entry_idx: 1, old_teacher_id: 20, new_teacher_id: 10 });
    }

    #[test]
    fn test_state_add_remove_roundtrip() {
        let entry = EntrySnapshot {
            db_id: 1, schedule_id: 1, time_slot_id: 5,
            day_of_week: 1, period: 3, class_id: 10,
            subject_id: 20, teacher_id: 30, room_id: 40,
            subject_short_name: "Ma".to_string(),
            required_room_type: "standard".to_string(),
        };

        let mut state = ScheduleState::new();
        state.add_entry(&entry);

        // State sollte gefuellt sein
        assert!(state.teacher_slots.get(&5).unwrap().contains(&30));
        assert!(state.room_slots.get(&5).unwrap().contains(&40));
        assert!(state.class_slots.get(&5).unwrap().contains(&10));
        assert_eq!(*state.teacher_daily_hours.get(&(30, 1)).unwrap(), 1);
        assert_eq!(*state.class_subject_hours.get(&(10, 20)).unwrap(), 1);

        state.remove_entry(&entry);

        // State sollte wieder leer sein
        assert!(state.teacher_slots.get(&5).map_or(true, |s| s.is_empty()));
        assert!(state.room_slots.get(&5).map_or(true, |s| s.is_empty()));
        assert!(state.class_slots.get(&5).map_or(true, |s| s.is_empty()));
        assert_eq!(state.teacher_daily_hours.get(&(30, 1)).copied().unwrap_or(0), 0);
    }

    #[test]
    fn test_swap_entries_roundtrip() {
        let mut entries = vec![
            EntrySnapshot {
                db_id: 1, schedule_id: 1, time_slot_id: 1,
                day_of_week: 1, period: 1, class_id: 10,
                subject_id: 20, teacher_id: 30, room_id: 40,
                subject_short_name: "Ma".to_string(),
                required_room_type: "standard".to_string(),
            },
            EntrySnapshot {
                db_id: 2, schedule_id: 1, time_slot_id: 6,
                day_of_week: 2, period: 1, class_id: 10,
                subject_id: 21, teacher_id: 31, room_id: 41,
                subject_short_name: "De".to_string(),
                required_room_type: "standard".to_string(),
            },
        ];
        let mut state = ScheduleState::from_entries(&entries);

        // Swap
        apply_swap(&mut entries, &mut state, 0, 1);
        assert_eq!(entries[0].time_slot_id, 6);
        assert_eq!(entries[1].time_slot_id, 1);

        // Swap zurueck
        apply_swap(&mut entries, &mut state, 0, 1);
        assert_eq!(entries[0].time_slot_id, 1);
        assert_eq!(entries[1].time_slot_id, 6);
    }

    #[test]
    fn test_optimize_empty_schedule_returns_error() {
        use crate::db::connection::Database;

        let db = Database::new_in_memory().unwrap();
        db::time_slots::seed_default_time_slots(&db.conn).unwrap();
        db::constraints::seed_default_constraints(&db.conn).unwrap();

        // Leeren Plan erstellen
        db.conn.execute(
            "INSERT INTO schedules (name, status) VALUES ('Test', 'draft')", [],
        ).unwrap();
        let schedule_id = db.conn.last_insert_rowid();

        let result = optimize(&db.conn, schedule_id, TabuSearchConfig::default());
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("keine Eintraege"), "Error was: {}", err_msg);
    }
}
