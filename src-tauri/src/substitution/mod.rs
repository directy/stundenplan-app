// Vertretungsmodul (Phase 5: Scoring + Priorisierung)
// Bewertet Vertretungskandidaten nach gewichteter Scoring-Formel
// und liefert transparente Entscheidungsbegründungen.

use std::collections::{HashMap, HashSet};
use chrono::{NaiveDate, Datelike};
use rusqlite::{params, Connection};

use crate::db;
use crate::error::AppError;
use crate::models::{SubstitutionCandidate, ScoreBreakdown, AffectedEntry};

// Default-Gewichtungen für die Vertretungs-Scoring-Formel
const W_ENGAGEMENT: f64 = 0.20;
const W_SUBSTITUTION_LOAD: f64 = 0.25;
const W_PEDAGOGICAL: f64 = 0.15;
const W_WEEKLY_LOAD: f64 = 0.20;
const W_SUBJECT_QUAL: f64 = 0.20;

// Zeitraum für die Berechnung der Vertretungslast (letzte N Tage)
const SUBSTITUTION_LOOKBACK_DAYS: i32 = 30;

/// Ermittelt und bewertet Vertretungskandidaten für einen bestimmten Stundeneintrag an einem Datum.
///
/// Filtert abwesende, belegte und den Original-Lehrer aus,
/// bewertet verbleibende Kandidaten nach der Scoring-Formel und
/// sortiert absteigend nach Gesamtscore.
pub fn get_substitution_candidates(
    conn: &Connection,
    entry_id: i64,
    date: &str,
) -> Result<Vec<SubstitutionCandidate>, AppError> {
    // 1. Lade den betroffenen schedule_entry
    let entry = db::schedule_entries::get_schedule_entry(conn, entry_id)?;

    // 2. Lade alle Lehrkräfte
    let all_teachers = db::teachers::get_teachers(conn)?;

    // 3. Lade IDs der abwesenden Lehrkräfte am Datum
    let absent_ids: HashSet<i64> = db::absences::get_absent_teacher_ids_on_date(conn, date)?
        .into_iter()
        .collect();

    // 4. Ermittle belegte Lehrer-IDs im selben Zeitslot
    let busy_ids: HashSet<i64> = get_busy_teacher_ids(conn, entry.schedule_id, entry.time_slot_id)?
        .into_iter()
        .collect();

    // 5. Lade qualifizierte Lehrer für das Fach
    let qualified_teachers = db::teacher_subjects::get_teachers_for_subject(conn, entry.subject_id)?;
    let qualified_ids: HashSet<i64> = qualified_teachers.iter().map(|t| t.id).collect();

    // 6. Berechne Vertretungslast und Wochenstunden für Normalisierung
    let substitution_counts = db::substitutions::count_recent_substitutions_by_teacher(
        conn, SUBSTITUTION_LOOKBACK_DAYS,
    )?;
    let max_sub_count = substitution_counts.values().copied().max().unwrap_or(1) as f64;

    let weekly_hours = count_weekly_hours(conn, entry.schedule_id)?;
    let max_weekly = weekly_hours.values().copied().max().unwrap_or(1) as f64;

    // 7. Einstellungen laden (Engagement/Pädagogik ein-/ausschaltbar)
    let use_engagement = db::settings::get_setting_bool(conn, "use_engagement_score", true)?;
    let use_pedagogical = db::settings::get_setting_bool(conn, "use_pedagogical_score", true)?;
    let w_engagement = if use_engagement { W_ENGAGEMENT } else { 0.0 };
    let w_pedagogical = if use_pedagogical { W_PEDAGOGICAL } else { 0.0 };

    // 8. Filtere und score Kandidaten
    let mut candidates: Vec<SubstitutionCandidate> = Vec::new();

    for teacher in &all_teachers {
        // Ausschlusskriterien
        if teacher.id == entry.teacher_id { continue; }
        if absent_ids.contains(&teacher.id) { continue; }
        if busy_ids.contains(&teacher.id) { continue; }

        let is_qualified = qualified_ids.contains(&teacher.id);
        let subject_qual = if is_qualified { 1.0 } else { 0.0 };

        let sub_count = *substitution_counts.get(&teacher.id).unwrap_or(&0) as f64;
        let sub_load_normalized = if max_sub_count > 0.0 {
            sub_count / max_sub_count
        } else {
            0.0
        };

        let weekly = *weekly_hours.get(&teacher.id).unwrap_or(&0) as f64;
        let weekly_normalized = if max_weekly > 0.0 {
            weekly / max_weekly
        } else {
            0.0
        };

        let engagement_component = teacher.engagement_score * w_engagement;
        let sub_load_component = (1.0 - sub_load_normalized) * W_SUBSTITUTION_LOAD;
        let pedagogical_component = teacher.pedagogical_score * w_pedagogical;
        let weekly_load_component = (1.0 - weekly_normalized) * W_WEEKLY_LOAD;
        let qual_component = subject_qual * W_SUBJECT_QUAL;

        let total_score = engagement_component
            + sub_load_component
            + pedagogical_component
            + weekly_load_component
            + qual_component;

        let breakdown = ScoreBreakdown {
            engagement: engagement_component,
            substitution_load: sub_load_component,
            pedagogical: pedagogical_component,
            weekly_load: weekly_load_component,
            subject_qualification: qual_component,
        };

        let reason = build_decision_reason(
            &teacher.name,
            is_qualified,
            teacher.engagement_score,
            sub_count as i32,
            teacher.pedagogical_score,
            weekly as i32,
            total_score,
        );

        candidates.push(SubstitutionCandidate {
            teacher_id: teacher.id,
            teacher_name: teacher.name.clone(),
            score: total_score,
            score_breakdown: breakdown,
            decision_reason: reason,
            is_qualified,
        });
    }

    // Sortierung: höchster Score zuerst
    candidates.sort_by(|a, b| {
        b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(candidates)
}

/// Ermittelt alle betroffenen Stundenplaneinträge für ein Datum.
/// Ein Eintrag ist betroffen, wenn die zugewiesene Lehrkraft an diesem Tag abwesend ist.
pub fn get_affected_entries(
    conn: &Connection,
    schedule_id: i64,
    date: &str,
) -> Result<Vec<AffectedEntry>, AppError> {
    let day_of_week = date_to_day_of_week(date)?;

    // Lade abwesende Lehrer-IDs für dieses Datum
    let absent_ids: HashSet<i64> = db::absences::get_absent_teacher_ids_on_date(conn, date)?
        .into_iter()
        .collect();

    if absent_ids.is_empty() {
        return Ok(Vec::new());
    }

    // Query: Alle Einträge des Plans für diesen Wochentag, deren Lehrer abwesend ist.
    // JOIN mit time_slots, teachers, subjects, classes, rooms für Namen.
    let absent_list: Vec<String> = absent_ids.iter().map(|id| id.to_string()).collect();
    let absent_csv = absent_list.join(",");

    let query = format!(
        "SELECT se.id, se.time_slot_id, ts.period, ts.start_time, ts.end_time,
                se.class_id, c.name, se.subject_id, s.name, se.teacher_id, t.name,
                se.room_id, r.name
         FROM schedule_entries se
         JOIN time_slots ts ON se.time_slot_id = ts.id
         JOIN teachers t ON se.teacher_id = t.id
         JOIN subjects s ON se.subject_id = s.id
         JOIN classes c ON se.class_id = c.id
         JOIN rooms r ON se.room_id = r.id
         WHERE se.schedule_id = ?1
           AND ts.day_of_week = ?2
           AND se.teacher_id IN ({})
         ORDER BY ts.period",
        absent_csv
    );

    let mut stmt = conn.prepare(&query)?;
    let rows = stmt.query_map(params![schedule_id, day_of_week], |row| {
        Ok((
            row.get::<_, i64>(0)?,      // entry_id
            row.get::<_, i64>(1)?,      // time_slot_id
            row.get::<_, i32>(2)?,      // period
            row.get::<_, String>(3)?,   // start_time
            row.get::<_, String>(4)?,   // end_time
            row.get::<_, i64>(5)?,      // class_id
            row.get::<_, String>(6)?,   // class_name
            row.get::<_, i64>(7)?,      // subject_id
            row.get::<_, String>(8)?,   // subject_name
            row.get::<_, i64>(9)?,      // teacher_id
            row.get::<_, String>(10)?,  // teacher_name
            row.get::<_, i64>(11)?,     // room_id
            row.get::<_, String>(12)?,  // room_name
        ))
    })?;

    // Lade bestehende Vertretungen für dieses Datum
    let existing_subs = db::substitutions::get_substitutions_by_date(conn, date)?;
    let sub_map: HashMap<i64, String> = existing_subs
        .iter()
        .filter_map(|s| {
            let teacher_name = db::teachers::get_teacher(conn, s.substitute_teacher_id)
                .map(|t| t.name)
                .ok()?;
            Some((s.original_entry_id, teacher_name))
        })
        .collect();

    let mut entries = Vec::new();
    for row in rows {
        let (entry_id, time_slot_id, period, start_time, end_time,
             class_id, class_name, subject_id, subject_name,
             teacher_id, teacher_name, room_id, room_name) = row?;

        let substitute_teacher_name = sub_map.get(&entry_id).cloned();
        let is_substituted = substitute_teacher_name.is_some();

        entries.push(AffectedEntry {
            entry_id,
            time_slot_id,
            period,
            start_time,
            end_time,
            class_id,
            class_name,
            subject_id,
            subject_name,
            original_teacher_id: teacher_id,
            original_teacher_name: teacher_name,
            room_id,
            room_name,
            is_substituted,
            substitute_teacher_name,
        });
    }

    Ok(entries)
}

// --- Interne Hilfsfunktionen ---

/// Gibt die Lehrer-IDs zurück, die in einem bestimmten Zeitslot eines Plans unterrichten
fn get_busy_teacher_ids(
    conn: &Connection,
    schedule_id: i64,
    time_slot_id: i64,
) -> Result<Vec<i64>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT teacher_id FROM schedule_entries
         WHERE schedule_id = ?1 AND time_slot_id = ?2"
    )?;
    let rows = stmt.query_map(params![schedule_id, time_slot_id], |row| {
        row.get::<_, i64>(0)
    })?;
    let mut ids = Vec::new();
    for row in rows {
        ids.push(row?);
    }
    Ok(ids)
}

/// Zählt Wochenstunden pro Lehrer in einem Plan
fn count_weekly_hours(
    conn: &Connection,
    schedule_id: i64,
) -> Result<HashMap<i64, i32>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT teacher_id, COUNT(*)
         FROM schedule_entries
         WHERE schedule_id = ?1
         GROUP BY teacher_id"
    )?;
    let rows = stmt.query_map([schedule_id], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, i32>(1)?))
    })?;
    let mut map = HashMap::new();
    for row in rows {
        let (id, count) = row?;
        map.insert(id, count);
    }
    Ok(map)
}

/// Konvertiert ein Datum (YYYY-MM-DD) in den Wochentag (1=Mo, 5=Fr).
/// Gibt einen Validierungsfehler zurück für Wochenenden.
fn date_to_day_of_week(date: &str) -> Result<i32, AppError> {
    let parsed = NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map_err(|e| AppError::Validation(format!(
            "Ungültiges Datum '{}': {}", date, e
        )))?;
    let weekday = parsed.weekday().num_days_from_monday() as i32 + 1;
    if weekday > 5 {
        return Err(AppError::Validation(format!(
            "Datum {} ist ein Wochenende (Tag {})", date, weekday
        )));
    }
    Ok(weekday)
}

/// Erzeugt eine deutsche Textbegründung für die Kandidatenbewertung
fn build_decision_reason(
    teacher_name: &str,
    is_qualified: bool,
    engagement: f64,
    sub_count: i32,
    pedagogical: f64,
    weekly_hours: i32,
    total_score: f64,
) -> String {
    let qual_text = if is_qualified {
        "ist fachlich qualifiziert"
    } else {
        "ist fachfremd"
    };

    format!(
        "{} ({}, Engagement: {:.0}%, Pädagogik: {:.0}%, {} Vertretungen in 30 Tagen, \
         {} Wochenstunden). Gesamtscore: {:.1}%.",
        teacher_name,
        qual_text,
        engagement * 100.0,
        pedagogical * 100.0,
        sub_count,
        weekly_hours,
        total_score * 100.0,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::models::*;

    fn setup() -> Database {
        let db = Database::new_in_memory().unwrap();
        db::time_slots::seed_default_time_slots(&db.conn).unwrap();
        db
    }

    fn create_test_teacher(conn: &Connection, name: &str, engagement: f64, pedagogical: f64) -> Teacher {
        db::teachers::create_teacher(conn, &NewTeacher {
            name: name.to_string(),
            email: None,
            engagement_score: Some(engagement),
            pedagogical_score: Some(pedagogical),
            part_time_quota: None,
            max_hours_per_day: None,
        }).unwrap()
    }

    fn create_test_subject(conn: &Connection, name: &str) -> Subject {
        db::subjects::create_subject(conn, &NewSubject {
            name: name.to_string(),
            short_name: name[..2].to_uppercase(),
            room_type: None,
            weekly_hours_default: Some(4),
        }).unwrap()
    }

    fn create_test_class(conn: &Connection, name: &str) -> SchoolClass {
        db::classes::create_class(conn, &NewSchoolClass {
            name: name.to_string(),
            grade_level: 5,
            class_teacher_id: None,
            student_count: None,
        }).unwrap()
    }

    fn create_test_room(conn: &Connection, name: &str) -> Room {
        db::rooms::create_room(conn, &NewRoom {
            name: name.to_string(),
            room_type: Some("standard".to_string()),
            capacity: Some(30),
        }).unwrap()
    }

    #[test]
    fn test_date_to_day_of_week() {
        // 2026-03-02 is a Monday
        assert_eq!(date_to_day_of_week("2026-03-02").unwrap(), 1);
        // 2026-03-06 is a Friday
        assert_eq!(date_to_day_of_week("2026-03-06").unwrap(), 5);
    }

    #[test]
    fn test_weekend_rejected() {
        // 2026-03-01 is a Sunday
        let result = date_to_day_of_week("2026-03-01");
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_date_rejected() {
        let result = date_to_day_of_week("not-a-date");
        assert!(result.is_err());
    }

    #[test]
    fn test_original_teacher_excluded() {
        let db = setup();
        let conn = &db.conn;

        let teacher = create_test_teacher(conn, "Original", 0.8, 0.7);
        let subject = create_test_subject(conn, "Mathe");
        let class = create_test_class(conn, "5a");
        let room = create_test_room(conn, "R101");

        let schedule = db::schedules::create_schedule(conn, &NewSchedule {
            name: "Test".into(),
            status: None,
            valid_from: None,
            valid_to: None,
        }).unwrap();

        let entry = db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class.id,
            subject_id: subject.id,
            teacher_id: teacher.id,
            room_id: room.id,
            decision_log: None,
        }).unwrap();

        let candidates = get_substitution_candidates(conn, entry.id, "2026-03-02").unwrap();
        assert!(!candidates.iter().any(|c| c.teacher_id == teacher.id));
    }

    #[test]
    fn test_absent_teacher_excluded() {
        let db = setup();
        let conn = &db.conn;

        let original = create_test_teacher(conn, "Original", 0.8, 0.7);
        let absent = create_test_teacher(conn, "Abwesend", 0.9, 0.9);
        let available = create_test_teacher(conn, "Verfügbar", 0.5, 0.5);
        let subject = create_test_subject(conn, "Mathe");
        let class = create_test_class(conn, "5a");
        let room = create_test_room(conn, "R101");

        let schedule = db::schedules::create_schedule(conn, &NewSchedule {
            name: "Test".into(),
            status: None,
            valid_from: None,
            valid_to: None,
        }).unwrap();

        let entry = db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class.id,
            subject_id: subject.id,
            teacher_id: original.id,
            room_id: room.id,
            decision_log: None,
        }).unwrap();

        db::absences::create_absence(conn, &NewTeacherAbsence {
            teacher_id: absent.id,
            absence_type: "illness".to_string(),
            start_date: "2026-03-01".to_string(),
            end_date: "2026-03-31".to_string(),
            note: None,
        }).unwrap();

        let candidates = get_substitution_candidates(conn, entry.id, "2026-03-02").unwrap();
        assert!(!candidates.iter().any(|c| c.teacher_id == absent.id));
        assert!(candidates.iter().any(|c| c.teacher_id == available.id));
    }

    #[test]
    fn test_busy_teacher_excluded() {
        let db = setup();
        let conn = &db.conn;

        let original = create_test_teacher(conn, "Original", 0.8, 0.7);
        let busy = create_test_teacher(conn, "Belegt", 0.9, 0.9);
        let free = create_test_teacher(conn, "Frei", 0.5, 0.5);
        let subject = create_test_subject(conn, "Mathe");
        let subject2 = create_test_subject(conn, "Deutsch");
        let class = create_test_class(conn, "5a");
        let class2 = create_test_class(conn, "5b");
        let room = create_test_room(conn, "R101");
        let room2 = create_test_room(conn, "R102");

        let schedule = db::schedules::create_schedule(conn, &NewSchedule {
            name: "Test".into(),
            status: None,
            valid_from: None,
            valid_to: None,
        }).unwrap();

        let entry = db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class.id,
            subject_id: subject.id,
            teacher_id: original.id,
            room_id: room.id,
            decision_log: None,
        }).unwrap();

        db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class2.id,
            subject_id: subject2.id,
            teacher_id: busy.id,
            room_id: room2.id,
            decision_log: None,
        }).unwrap();

        let candidates = get_substitution_candidates(conn, entry.id, "2026-03-02").unwrap();
        assert!(!candidates.iter().any(|c| c.teacher_id == busy.id));
        assert!(candidates.iter().any(|c| c.teacher_id == free.id));
    }

    #[test]
    fn test_qualified_teacher_scores_higher() {
        let db = setup();
        let conn = &db.conn;

        let original = create_test_teacher(conn, "Original", 0.5, 0.5);
        let qualified = create_test_teacher(conn, "Qualifiziert", 0.5, 0.5);
        let unqualified = create_test_teacher(conn, "Fachfremd", 0.5, 0.5);
        let subject = create_test_subject(conn, "Mathe");
        let class = create_test_class(conn, "5a");
        let room = create_test_room(conn, "R101");

        db::teacher_subjects::add_teacher_subject(conn, qualified.id, subject.id).unwrap();

        let schedule = db::schedules::create_schedule(conn, &NewSchedule {
            name: "Test".into(),
            status: None,
            valid_from: None,
            valid_to: None,
        }).unwrap();

        let entry = db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class.id,
            subject_id: subject.id,
            teacher_id: original.id,
            room_id: room.id,
            decision_log: None,
        }).unwrap();

        let candidates = get_substitution_candidates(conn, entry.id, "2026-03-02").unwrap();
        let qual_candidate = candidates.iter().find(|c| c.teacher_id == qualified.id).unwrap();
        let unqual_candidate = candidates.iter().find(|c| c.teacher_id == unqualified.id).unwrap();

        assert!(qual_candidate.score > unqual_candidate.score);
        assert!(qual_candidate.is_qualified);
        assert!(!unqual_candidate.is_qualified);
    }

    #[test]
    fn test_candidates_sorted_by_score_desc() {
        let db = setup();
        let conn = &db.conn;

        let original = create_test_teacher(conn, "Original", 0.5, 0.5);
        let _low = create_test_teacher(conn, "Low", 0.1, 0.1);
        let _high = create_test_teacher(conn, "High", 0.9, 0.9);
        let _mid = create_test_teacher(conn, "Mid", 0.5, 0.5);
        let subject = create_test_subject(conn, "Mathe");
        let class = create_test_class(conn, "5a");
        let room = create_test_room(conn, "R101");

        let schedule = db::schedules::create_schedule(conn, &NewSchedule {
            name: "Test".into(),
            status: None,
            valid_from: None,
            valid_to: None,
        }).unwrap();

        let entry = db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class.id,
            subject_id: subject.id,
            teacher_id: original.id,
            room_id: room.id,
            decision_log: None,
        }).unwrap();

        let candidates = get_substitution_candidates(conn, entry.id, "2026-03-02").unwrap();
        for i in 1..candidates.len() {
            assert!(candidates[i - 1].score >= candidates[i].score);
        }
    }

    #[test]
    fn test_decision_reason_is_german_text() {
        let reason = build_decision_reason(
            "Fr. Müller", true, 0.8, 3, 0.7, 20, 0.85,
        );
        assert!(reason.contains("Fr. Müller"));
        assert!(reason.contains("fachlich qualifiziert"));
        assert!(reason.contains("Gesamtscore"));
    }

    #[test]
    fn test_affected_entries_empty_when_no_absences() {
        let db = setup();
        let conn = &db.conn;

        let teacher = create_test_teacher(conn, "Lehrer", 0.5, 0.5);
        let subject = create_test_subject(conn, "Mathe");
        let class = create_test_class(conn, "5a");
        let room = create_test_room(conn, "R101");

        let schedule = db::schedules::create_schedule(conn, &NewSchedule {
            name: "Test".into(),
            status: None,
            valid_from: None,
            valid_to: None,
        }).unwrap();

        db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class.id,
            subject_id: subject.id,
            teacher_id: teacher.id,
            room_id: room.id,
            decision_log: None,
        }).unwrap();

        let affected = get_affected_entries(conn, schedule.id, "2026-03-02").unwrap();
        assert!(affected.is_empty());
    }

    #[test]
    fn test_affected_entries_with_absence() {
        let db = setup();
        let conn = &db.conn;

        let teacher = create_test_teacher(conn, "Kranker Lehrer", 0.5, 0.5);
        let subject = create_test_subject(conn, "Mathe");
        let class = create_test_class(conn, "5a");
        let room = create_test_room(conn, "R101");

        let schedule = db::schedules::create_schedule(conn, &NewSchedule {
            name: "Test".into(),
            status: None,
            valid_from: None,
            valid_to: None,
        }).unwrap();

        db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class.id,
            subject_id: subject.id,
            teacher_id: teacher.id,
            room_id: room.id,
            decision_log: None,
        }).unwrap();

        db::absences::create_absence(conn, &NewTeacherAbsence {
            teacher_id: teacher.id,
            absence_type: "illness".to_string(),
            start_date: "2026-03-01".to_string(),
            end_date: "2026-03-31".to_string(),
            note: None,
        }).unwrap();

        let affected = get_affected_entries(conn, schedule.id, "2026-03-02").unwrap();
        assert_eq!(affected.len(), 1);
        assert_eq!(affected[0].original_teacher_name, "Kranker Lehrer");
        assert_eq!(affected[0].period, 1);
        assert!(!affected[0].is_substituted);
    }

    #[test]
    fn test_affected_entries_marks_existing_substitution() {
        let db = setup();
        let conn = &db.conn;

        let teacher = create_test_teacher(conn, "Krank", 0.5, 0.5);
        let sub_teacher = create_test_teacher(conn, "Vertretung", 0.7, 0.6);
        let subject = create_test_subject(conn, "Mathe");
        let class = create_test_class(conn, "5a");
        let room = create_test_room(conn, "R101");

        let schedule = db::schedules::create_schedule(conn, &NewSchedule {
            name: "Test".into(),
            status: None,
            valid_from: None,
            valid_to: None,
        }).unwrap();

        let entry = db::schedule_entries::create_schedule_entry(conn, &NewScheduleEntry {
            schedule_id: schedule.id,
            time_slot_id: 1,
            class_id: class.id,
            subject_id: subject.id,
            teacher_id: teacher.id,
            room_id: room.id,
            decision_log: None,
        }).unwrap();

        db::absences::create_absence(conn, &NewTeacherAbsence {
            teacher_id: teacher.id,
            absence_type: "illness".to_string(),
            start_date: "2026-03-01".to_string(),
            end_date: "2026-03-31".to_string(),
            note: None,
        }).unwrap();

        db::substitutions::create_substitution(conn, &NewSubstitutionRecord {
            original_entry_id: entry.id,
            substitute_teacher_id: sub_teacher.id,
            date: "2026-03-02".to_string(),
            decision_reason: Some("Test".to_string()),
            score: Some(0.85),
        }).unwrap();

        let affected = get_affected_entries(conn, schedule.id, "2026-03-02").unwrap();
        assert_eq!(affected.len(), 1);
        assert!(affected[0].is_substituted);
        assert_eq!(affected[0].substitute_teacher_name.as_deref(), Some("Vertretung"));
    }
}
