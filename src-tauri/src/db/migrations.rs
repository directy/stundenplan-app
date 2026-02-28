use rusqlite::Connection;
use crate::error::AppError;

/// Fuehrt Schema-Migrationen basierend auf Versionsnummern aus.
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

    // Zukuenftige Migrationen:
    // if current_version < 2 {
    //     conn.execute_batch("ALTER TABLE ...")?;
    //     conn.execute("INSERT INTO schema_version (version) VALUES (?1)", [2])?;
    // }

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
        assert_eq!(version, 1);
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
        assert_eq!(count, 1);
    }
}
