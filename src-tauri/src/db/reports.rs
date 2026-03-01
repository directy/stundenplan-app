use std::collections::{HashMap, HashSet};
use rusqlite::Connection;
use crate::error::AppError;
use crate::models::{
    ScheduleReport, ReportSummary, ConstraintAnalysisItem,
    ReportEntry, TeacherWorkloadItem,
};

/// Constraint-Schlüssel zu deutschem Label
const CONSTRAINT_LABELS: &[(&str, &str)] = &[
    ("forbidden_subject_sequence", "Verbotene Fachfolge"),
    ("no_sports_after_math", "Verbotene Fachfolge"), // Legacy
    ("even_weekly_distribution", "Gleichmäßige Verteilung"),
    ("avoid_edge_periods", "Randstunden vermeiden"),
    ("minimize_gaps", "Hohlstunden minimieren"),
    ("class_teacher_first_period", "Klassenlehrer 1. Stunde"),
    ("main_subjects_morning", "Hauptfächer vormittags"),
    ("teacher_preferences", "Lehrer-Präferenzen"),
    ("teacher_wishes", "Sonderwünsche"),
];

/// Parsed decision_log JSON
struct ParsedLog {
    total_score: f64,
    soft_scores: HashMap<String, f64>,
    reason: String,
}

fn parse_decision_log(json_str: &str) -> ParsedLog {
    let val: serde_json::Value = serde_json::from_str(json_str).unwrap_or_default();

    let total_score = val["total_score"].as_f64().unwrap_or(0.0);
    let reason = val["reason"].as_str().unwrap_or("").to_string();

    let mut soft_scores = HashMap::new();
    if let Some(obj) = val["soft_scores"].as_object() {
        for (k, v) in obj {
            if let Some(score) = v.as_f64() {
                soft_scores.insert(k.clone(), score);
            }
        }
    }

    ParsedLog { total_score, soft_scores, reason }
}

/// Erzeugt einen aggregierten Bericht für einen Stundenplan.
pub fn generate_schedule_report(
    conn: &Connection,
    schedule_id: i64,
) -> Result<ScheduleReport, AppError> {
    // 1. Schedule-Name laden
    let schedule_name: String = conn.query_row(
        "SELECT name FROM schedules WHERE id = ?1",
        [schedule_id],
        |row| row.get(0),
    ).map_err(|_| AppError::NotFound(format!("Stundenplan mit ID {} nicht gefunden", schedule_id)))?;

    // 2. Alle Einträge mit JOINs laden
    let mut stmt = conn.prepare(
        "SELECT se.id, se.decision_log, ts.day_of_week, ts.period,
                c.name AS class_name, s.name AS subject_name,
                t.name AS teacher_name, t.id AS teacher_id,
                r.name AS room_name, c.id AS class_id, s.id AS subject_id
         FROM schedule_entries se
         JOIN time_slots ts ON se.time_slot_id = ts.id
         JOIN classes c ON se.class_id = c.id
         JOIN subjects s ON se.subject_id = s.id
         JOIN teachers t ON se.teacher_id = t.id
         JOIN rooms r ON se.room_id = r.id
         WHERE se.schedule_id = ?1
         ORDER BY ts.day_of_week, ts.period"
    )?;

    struct RawEntry {
        entry_id: i64,
        decision_log: String,
        day_of_week: i32,
        period: i32,
        class_name: String,
        subject_name: String,
        teacher_name: String,
        teacher_id: i64,
        room_name: String,
        class_id: i64,
        subject_id: i64,
    }

    let raw_entries: Vec<RawEntry> = stmt.query_map([schedule_id], |row| {
        Ok(RawEntry {
            entry_id: row.get(0)?,
            decision_log: row.get(1)?,
            day_of_week: row.get(2)?,
            period: row.get(3)?,
            class_name: row.get(4)?,
            subject_name: row.get(5)?,
            teacher_name: row.get(6)?,
            teacher_id: row.get(7)?,
            room_name: row.get(8)?,
            class_id: row.get(9)?,
            subject_id: row.get(10)?,
        })
    })?.filter_map(|r| r.ok()).collect();

    // 3. Decision-Logs parsen
    let parsed: Vec<(ParsedLog, &RawEntry)> = raw_entries.iter()
        .map(|e| (parse_decision_log(&e.decision_log), e))
        .collect();

    let total_entries = parsed.len();

    // 4. Summary berechnen
    let scores: Vec<f64> = parsed.iter().map(|(p, _)| p.total_score).collect();
    let (average_score, min_score, max_score, entries_below_threshold) = if scores.is_empty() {
        (0.0, 0.0, 0.0, 0)
    } else {
        let sum: f64 = scores.iter().sum();
        let avg = sum / scores.len() as f64;
        let min = scores.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = scores.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let below = scores.iter().filter(|&&s| s < 0.4).count();
        (avg, min, max, below)
    };

    // Theoretische Slots: Anzahl Klassen * Anzahl Zeitslots
    let class_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM classes", [], |row| row.get(0),
    )?;
    let slot_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM time_slots", [], |row| row.get(0),
    )?;
    let theoretical = class_count * slot_count;
    let coverage_percent = if theoretical > 0 {
        (total_entries as f64 / theoretical as f64) * 100.0
    } else {
        0.0
    };

    let summary = ReportSummary {
        total_entries,
        average_score: (average_score * 1000.0).round() / 1000.0,
        min_score: (min_score * 1000.0).round() / 1000.0,
        max_score: (max_score * 1000.0).round() / 1000.0,
        entries_below_threshold,
        coverage_percent: (coverage_percent * 10.0).round() / 10.0,
    };

    // 5. Constraint-Analyse
    let mut constraint_scores: HashMap<String, Vec<f64>> = HashMap::new();
    for (log, _) in &parsed {
        for (key, value) in &log.soft_scores {
            constraint_scores.entry(key.clone()).or_default().push(*value);
        }
    }

    let constraint_analysis: Vec<ConstraintAnalysisItem> = CONSTRAINT_LABELS.iter()
        .filter_map(|(key, label)| {
            let scores = constraint_scores.get(*key)?;
            if scores.is_empty() { return None; }
            let sum: f64 = scores.iter().sum();
            let avg = sum / scores.len() as f64;
            let min = scores.iter().cloned().fold(f64::INFINITY, f64::min);
            let violations = scores.iter().filter(|&&s| s == 0.0).count();
            Some(ConstraintAnalysisItem {
                constraint_name: key.to_string(),
                label: label.to_string(),
                average_score: (avg * 1000.0).round() / 1000.0,
                min_score: (min * 1000.0).round() / 1000.0,
                violations_count: violations,
            })
        })
        .collect();

    // 6. ReportEntry-Liste
    let entries: Vec<ReportEntry> = parsed.iter()
        .map(|(log, raw)| ReportEntry {
            entry_id: raw.entry_id,
            period: raw.period,
            day_of_week: raw.day_of_week,
            class_name: raw.class_name.clone(),
            subject_name: raw.subject_name.clone(),
            teacher_name: raw.teacher_name.clone(),
            room_name: raw.room_name.clone(),
            total_score: (log.total_score * 1000.0).round() / 1000.0,
            soft_scores: log.soft_scores.clone(),
            reason: log.reason.clone(),
        })
        .collect();

    // 7. Teacher-Workload
    struct TeacherAgg {
        name: String,
        hours: usize,
        subjects: HashSet<i64>,
        classes: HashSet<i64>,
        score_sum: f64,
    }
    let mut teacher_map: HashMap<i64, TeacherAgg> = HashMap::new();
    for (log, raw) in &parsed {
        let agg = teacher_map.entry(raw.teacher_id).or_insert_with(|| TeacherAgg {
            name: raw.teacher_name.clone(),
            hours: 0,
            subjects: HashSet::new(),
            classes: HashSet::new(),
            score_sum: 0.0,
        });
        agg.hours += 1;
        agg.subjects.insert(raw.subject_id);
        agg.classes.insert(raw.class_id);
        agg.score_sum += log.total_score;
    }

    let mut teacher_workloads: Vec<TeacherWorkloadItem> = teacher_map.into_iter()
        .map(|(id, agg)| {
            let avg = if agg.hours > 0 { agg.score_sum / agg.hours as f64 } else { 0.0 };
            TeacherWorkloadItem {
                teacher_id: id,
                teacher_name: agg.name,
                total_hours: agg.hours,
                unique_subjects: agg.subjects.len(),
                unique_classes: agg.classes.len(),
                average_score: (avg * 1000.0).round() / 1000.0,
            }
        })
        .collect();
    teacher_workloads.sort_by(|a, b| b.total_hours.cmp(&a.total_hours));

    Ok(ScheduleReport {
        schedule_id,
        schedule_name,
        summary,
        constraint_analysis,
        entries,
        teacher_workloads,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        schema::create_all_tables(&conn).unwrap();
        conn
    }

    fn seed_base_data(conn: &Connection) -> (i64, i64, i64, i64, i64) {
        // Teacher
        conn.execute(
            "INSERT INTO teachers (name, email, engagement_score, pedagogical_score)
             VALUES ('Max Mustermann', 'max@schule.de', 0.8, 0.7)",
            [],
        ).unwrap();
        let teacher_id = conn.last_insert_rowid();

        // Subject
        conn.execute(
            "INSERT INTO subjects (name, short_name) VALUES ('Mathematik', 'Ma')",
            [],
        ).unwrap();
        let subject_id = conn.last_insert_rowid();

        // Class
        conn.execute(
            "INSERT INTO classes (name, grade_level) VALUES ('5a', 5)",
            [],
        ).unwrap();
        let class_id = conn.last_insert_rowid();

        // Room
        conn.execute(
            "INSERT INTO rooms (name, room_type) VALUES ('R101', 'standard')",
            [],
        ).unwrap();
        let room_id = conn.last_insert_rowid();

        // Time Slot
        conn.execute(
            "INSERT INTO time_slots (day_of_week, period, start_time, end_time)
             VALUES (1, 1, '07:45', '08:30')",
            [],
        ).unwrap();
        let ts_id = conn.last_insert_rowid();

        (teacher_id, subject_id, class_id, room_id, ts_id)
    }

    fn create_schedule(conn: &Connection, name: &str) -> i64 {
        conn.execute(
            "INSERT INTO schedules (name, status) VALUES (?1, 'draft')",
            [name],
        ).unwrap();
        conn.last_insert_rowid()
    }

    fn create_entry(conn: &Connection, schedule_id: i64, ts_id: i64, class_id: i64,
                    subject_id: i64, teacher_id: i64, room_id: i64, decision_log: &str) {
        conn.execute(
            "INSERT INTO schedule_entries (schedule_id, time_slot_id, class_id, subject_id,
             teacher_id, room_id, decision_log) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![schedule_id, ts_id, class_id, subject_id, teacher_id, room_id, decision_log],
        ).unwrap();
    }

    #[test]
    fn test_empty_schedule() {
        let conn = setup_db();
        let sid = create_schedule(&conn, "Leer");
        let report = generate_schedule_report(&conn, sid).unwrap();
        assert_eq!(report.summary.total_entries, 0);
        assert_eq!(report.summary.average_score, 0.0);
        assert!(report.entries.is_empty());
        assert!(report.teacher_workloads.is_empty());
        assert!(report.constraint_analysis.is_empty());
    }

    #[test]
    fn test_summary_calculation() {
        let conn = setup_db();
        let (tid, sid_subj, cid, rid, ts1) = seed_base_data(&conn);
        let schedule_id = create_schedule(&conn, "Test");

        // Zweiten Zeitslot
        conn.execute(
            "INSERT INTO time_slots (day_of_week, period, start_time, end_time)
             VALUES (1, 2, '08:35', '09:20')",
            [],
        ).unwrap();
        let ts2 = conn.last_insert_rowid();

        let log1 = r#"{"total_score": 0.8, "soft_scores": {"minimize_gaps": 0.9}, "reason": "Gut"}"#;
        let log2 = r#"{"total_score": 0.3, "soft_scores": {"minimize_gaps": 0.1}, "reason": "Schlecht"}"#;

        create_entry(&conn, schedule_id, ts1, cid, sid_subj, tid, rid, log1);
        create_entry(&conn, schedule_id, ts2, cid, sid_subj, tid, rid, log2);

        let report = generate_schedule_report(&conn, schedule_id).unwrap();
        assert_eq!(report.summary.total_entries, 2);
        assert!((report.summary.average_score - 0.55).abs() < 0.01);
        assert!((report.summary.min_score - 0.3).abs() < 0.01);
        assert!((report.summary.max_score - 0.8).abs() < 0.01);
        assert_eq!(report.summary.entries_below_threshold, 1);
    }

    #[test]
    fn test_constraint_analysis() {
        let conn = setup_db();
        let (tid, sid_subj, cid, rid, ts1) = seed_base_data(&conn);
        let schedule_id = create_schedule(&conn, "Constraint-Test");

        let log = r#"{"total_score": 0.7, "soft_scores": {
            "no_sports_after_math": 1.0,
            "even_weekly_distribution": 0.6,
            "avoid_edge_periods": 0.0,
            "minimize_gaps": 0.8,
            "class_teacher_first_period": 1.0,
            "main_subjects_morning": 0.9,
            "teacher_preferences": 0.5
        }, "reason": "Test"}"#;

        create_entry(&conn, schedule_id, ts1, cid, sid_subj, tid, rid, log);

        let report = generate_schedule_report(&conn, schedule_id).unwrap();
        assert_eq!(report.constraint_analysis.len(), 7);

        let edge = report.constraint_analysis.iter()
            .find(|c| c.constraint_name == "avoid_edge_periods").unwrap();
        assert_eq!(edge.violations_count, 1);
        assert!((edge.average_score - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_teacher_workload() {
        let conn = setup_db();
        let (tid1, sid_subj, cid, rid, ts1) = seed_base_data(&conn);

        // Zweiter Lehrer
        conn.execute(
            "INSERT INTO teachers (name, email) VALUES ('Anna Schmidt', 'anna@schule.de')",
            [],
        ).unwrap();
        let tid2 = conn.last_insert_rowid();

        // Zweiter Zeitslot
        conn.execute(
            "INSERT INTO time_slots (day_of_week, period, start_time, end_time)
             VALUES (1, 2, '08:35', '09:20')",
            [],
        ).unwrap();
        let ts2 = conn.last_insert_rowid();

        let schedule_id = create_schedule(&conn, "Workload-Test");
        let log = r#"{"total_score": 0.75, "soft_scores": {}, "reason": "Ok"}"#;

        create_entry(&conn, schedule_id, ts1, cid, sid_subj, tid1, rid, log);
        create_entry(&conn, schedule_id, ts2, cid, sid_subj, tid2, rid, log);

        let report = generate_schedule_report(&conn, schedule_id).unwrap();
        assert_eq!(report.teacher_workloads.len(), 2);

        let max_teacher = &report.teacher_workloads[0];
        assert_eq!(max_teacher.total_hours, 1);
    }
}
