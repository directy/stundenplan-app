use rusqlite::Connection;
use crate::error::AppError;

/// Erstellt alle Tabellen in Abhaengigkeitsreihenfolge.
/// Verwendet IF NOT EXISTS fuer idempotente Ausfuehrung.
pub fn create_all_tables(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch("
        -- Lehrkraefte
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            engagement_score REAL NOT NULL DEFAULT 0.5,
            pedagogical_score REAL NOT NULL DEFAULT 0.5,
            part_time_quota REAL NOT NULL DEFAULT 1.0,
            max_hours_per_day INTEGER NOT NULL DEFAULT 6,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Faecher
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            short_name TEXT NOT NULL,
            room_type TEXT NOT NULL DEFAULT 'standard'
                CHECK(room_type IN ('standard', 'sports', 'lab', 'music')),
            weekly_hours_default INTEGER NOT NULL DEFAULT 2
        );

        -- Lehrkraft-Fach-Zuordnung (Many-to-Many)
        CREATE TABLE IF NOT EXISTS teacher_subjects (
            teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
            subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            PRIMARY KEY (teacher_id, subject_id)
        );

        -- Klassen
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            grade_level INTEGER NOT NULL,
            class_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
            student_count INTEGER NOT NULL DEFAULT 25
        );

        -- Raeume
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            room_type TEXT NOT NULL DEFAULT 'standard'
                CHECK(room_type IN ('standard', 'sports', 'lab', 'music')),
            capacity INTEGER NOT NULL DEFAULT 30
        );

        -- Zeitslots (5 Tage x 9 Stunden)
        CREATE TABLE IF NOT EXISTS time_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 5),
            period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 9),
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            UNIQUE(day_of_week, period)
        );

        -- Stundenplan-Versionen
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft'
                CHECK(status IN ('draft', 'active', 'archived')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Einzelne Stundenplaneintraege mit Entscheidungsprotokoll
        CREATE TABLE IF NOT EXISTS schedule_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
            time_slot_id INTEGER NOT NULL REFERENCES time_slots(id),
            class_id INTEGER NOT NULL REFERENCES classes(id),
            subject_id INTEGER NOT NULL REFERENCES subjects(id),
            teacher_id INTEGER NOT NULL REFERENCES teachers(id),
            room_id INTEGER NOT NULL REFERENCES rooms(id),
            decision_log TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Konfigurierbare Constraint-Regeln mit Gewichtung
        CREATE TABLE IF NOT EXISTS constraint_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_type TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL DEFAULT '',
            weight REAL NOT NULL DEFAULT 1.0,
            is_active INTEGER NOT NULL DEFAULT 1,
            parameters TEXT NOT NULL DEFAULT '{}'
        );

        -- Vertretungshistorie mit Scoring-Details
        CREATE TABLE IF NOT EXISTS substitution_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_entry_id INTEGER NOT NULL REFERENCES schedule_entries(id),
            substitute_teacher_id INTEGER NOT NULL REFERENCES teachers(id),
            date TEXT NOT NULL,
            decision_reason TEXT NOT NULL DEFAULT '',
            score REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Lehrkraft-Praeferenzen (Wunschzeiten, freie Tage)
        CREATE TABLE IF NOT EXISTS teacher_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
            day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 5),
            period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 9),
            preference_type TEXT NOT NULL
                CHECK(preference_type IN ('preferred', 'unavailable')),
            reason TEXT DEFAULT ''
        );
    ")?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_create_all_tables() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        create_all_tables(&conn).unwrap();

        // Pruefe ob alle Tabellen existiert
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert!(tables.contains(&"teachers".to_string()));
        assert!(tables.contains(&"subjects".to_string()));
        assert!(tables.contains(&"teacher_subjects".to_string()));
        assert!(tables.contains(&"classes".to_string()));
        assert!(tables.contains(&"rooms".to_string()));
        assert!(tables.contains(&"time_slots".to_string()));
        assert!(tables.contains(&"schedules".to_string()));
        assert!(tables.contains(&"schedule_entries".to_string()));
        assert!(tables.contains(&"constraint_rules".to_string()));
        assert!(tables.contains(&"substitution_history".to_string()));
        assert!(tables.contains(&"teacher_preferences".to_string()));
    }

    #[test]
    fn test_create_all_tables_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        create_all_tables(&conn).unwrap();
        // Zweites Mal ausfuehren darf keinen Fehler werfen
        create_all_tables(&conn).unwrap();
    }
}
