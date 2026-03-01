use rusqlite::{params, Connection};
use crate::error::AppError;

/// Führt Schema-Migrationen basierend auf Versionsnummern aus.
pub fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ")?;

    let current_version: i64 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_version",
        [],
        |row| row.get(0),
    )?;

    if current_version < 1 {
        // Version 1: Initiales Schema (bereits durch schema.rs erstellt)
        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [1],
        )?;
    }

    if current_version < 2 {
        // Version 2: Ferien, Lehrer-Abwesenheiten, Gültigkeitszeitraum für Stundenpläne
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS holidays (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_year TEXT NOT NULL,
                state TEXT NOT NULL,
                name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS teacher_absences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
                absence_type TEXT NOT NULL
                    CHECK(absence_type IN ('illness', 'maternity', 'sabbatical', 'training', 'other')),
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                note TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ")?;

        // ALTER TABLE in separaten Statements (SQLite-Beschraenkung)
        // Ignoriere Fehler falls Spalten bereits existieren (idempotent)
        let _ = conn.execute("ALTER TABLE schedules ADD COLUMN valid_from TEXT", []);
        let _ = conn.execute("ALTER TABLE schedules ADD COLUMN valid_to TEXT", []);

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [2],
        )?;
    }

    if current_version < 3 {
        // Version 3: sort_order für Constraint-Regeln
        let _ = conn.execute(
            "ALTER TABLE constraint_rules ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        );

        // Bestehende Regeln bekommen aufsteigende sort_order
        conn.execute_batch("
            UPDATE constraint_rules SET sort_order = (
                SELECT COUNT(*) FROM constraint_rules AS cr2
                WHERE cr2.rowid < constraint_rules.rowid
            );
        ")?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [3],
        )?;
    }

    if current_version < 4 {
        // Version 4: Belohnungspunkte und Sonderwünsche
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS reward_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
                points INTEGER NOT NULL,
                category TEXT NOT NULL
                    CHECK(category IN (
                        'extra_tasks', 'mentoring', 'event_organization',
                        'training', 'committee_work', 'exam_supervision',
                        'project_lead', 'other'
                    )),
                reason TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL DEFAULT (date('now')),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS teacher_wishes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
                wish_type TEXT NOT NULL
                    CHECK(wish_type IN (
                        'prefer_morning', 'prefer_afternoon', 'free_day',
                        'max_consecutive', 'compact_schedule', 'custom'
                    )),
                priority TEXT NOT NULL DEFAULT 'medium'
                    CHECK(priority IN ('low', 'medium', 'high')),
                parameters TEXT NOT NULL DEFAULT '{}',
                note TEXT DEFAULT '',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ")?;

        // Seed teacher_wishes constraint rule if not present
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM constraint_rules WHERE rule_type = 'teacher_wishes'",
            [],
            |row| row.get(0),
        )?;
        if !exists {
            let max_order: i32 = conn.query_row(
                "SELECT COALESCE(MAX(sort_order), -1) FROM constraint_rules",
                [],
                |row| row.get(0),
            )?;
            conn.execute(
                "INSERT INTO constraint_rules (rule_type, description, weight, is_active, parameters, sort_order)
                 VALUES ('teacher_wishes', 'Sonderwünsche der Lehrkräfte', 0.5, 1, '{}', ?1)",
                [max_order + 1],
            )?;
        }

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [4],
        )?;
    }

    if current_version < 5 {
        // Version 5: Scope-Spalten + UNIQUE auf rule_type entfernen + no_sports_after_math umbenennen
        // SQLite kann kein DROP CONSTRAINT, daher Tabelle neu bauen
        conn.execute_batch("
            CREATE TABLE constraint_rules_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_type TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                weight REAL NOT NULL DEFAULT 1.0,
                is_active INTEGER NOT NULL DEFAULT 1,
                parameters TEXT NOT NULL DEFAULT '{}',
                sort_order INTEGER NOT NULL DEFAULT 0,
                scope_type TEXT NOT NULL DEFAULT 'global'
                    CHECK(scope_type IN ('global', 'class', 'teacher', 'room')),
                scope_id INTEGER
            );

            INSERT INTO constraint_rules_new
                (id, rule_type, description, weight, is_active, parameters, sort_order, scope_type, scope_id)
            SELECT id,
                CASE rule_type
                    WHEN 'no_sports_after_math' THEN 'forbidden_subject_sequence'
                    ELSE rule_type
                END,
                description, weight, is_active, parameters, sort_order, 'global', NULL
            FROM constraint_rules;

            DROP TABLE constraint_rules;
            ALTER TABLE constraint_rules_new RENAME TO constraint_rules;
        ")?;

        // Explode multi-pair forbidden_subject_sequence rules into individual rules
        let mut stmt = conn.prepare(
            "SELECT id, parameters, weight, is_active, sort_order FROM constraint_rules
             WHERE rule_type = 'forbidden_subject_sequence'"
        )?;

        struct PairRow { id: i64, parameters: String, weight: f64, is_active: bool, _sort_order: i32 }
        let rows: Vec<PairRow> = stmt.query_map([], |row| {
            Ok(PairRow {
                id: row.get(0)?,
                parameters: row.get(1)?,
                weight: row.get(2)?,
                is_active: row.get(3)?,
                _sort_order: row.get(4)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        drop(stmt);

        let max_order: i32 = conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM constraint_rules", [], |row| row.get(0),
        )?;
        let mut next_order = max_order + 1;

        for pr in &rows {
            if let Ok(params) = serde_json::from_str::<serde_json::Value>(&pr.parameters) {
                if let Some(pairs) = params["pairs"].as_array() {
                    if pairs.is_empty() { continue; }
                    let mut first = true;
                    for pair in pairs {
                        let a = pair["first"].as_str().unwrap_or("").to_string();
                        let b = pair["second"].as_str().unwrap_or("").to_string();
                        if a.is_empty() || b.is_empty() { continue; }

                        let new_params = serde_json::json!({"first": a, "second": b}).to_string();
                        let desc = format!("Kein {} nach {}", a, b);

                        if first {
                            conn.execute(
                                "UPDATE constraint_rules SET parameters = ?1, description = ?2 WHERE id = ?3",
                                params![new_params, desc, pr.id],
                            )?;
                            first = false;
                        } else {
                            conn.execute(
                                "INSERT INTO constraint_rules (rule_type, description, weight, is_active, parameters, sort_order, scope_type, scope_id)
                                 VALUES ('forbidden_subject_sequence', ?1, ?2, ?3, ?4, ?5, 'global', NULL)",
                                params![desc, pr.weight, pr.is_active, new_params, next_order],
                            )?;
                            next_order += 1;
                        }
                    }
                }
            }
        }

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [5],
        )?;
    }

    if current_version < 6 {
        // Version 6: Stundentafel, Lehrer-Klassen-Einschränkungen, App-Einstellungen
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS class_subjects (
                class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
                subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
                weekly_hours INTEGER NOT NULL,
                PRIMARY KEY (class_id, subject_id)
            );

            CREATE TABLE IF NOT EXISTS teacher_class_restrictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
                class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
                restriction_type TEXT NOT NULL DEFAULT 'preference'
                    CHECK(restriction_type IN ('preference', 'qualification')),
                UNIQUE(teacher_id, class_id)
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            INSERT OR IGNORE INTO app_settings (key, value) VALUES ('use_engagement_score', 'true');
            INSERT OR IGNORE INTO app_settings (key, value) VALUES ('use_pedagogical_score', 'true');
        ")?;

        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [6],
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::create_all_tables;
    use rusqlite::Connection;

    #[test]
    fn test_run_migrations() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        create_all_tables(&conn).unwrap();
        run_migrations(&conn).unwrap();

        let version: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, 6);
    }

    #[test]
    fn test_run_migrations_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        create_all_tables(&conn).unwrap();
        run_migrations(&conn).unwrap();
        run_migrations(&conn).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 6);
    }
}
