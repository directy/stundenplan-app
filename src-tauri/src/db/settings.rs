use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::AppSetting;

pub fn get_all_settings(conn: &Connection) -> Result<Vec<AppSetting>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT key, value, updated_at FROM app_settings ORDER BY key"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(AppSetting {
            key: row.get(0)?,
            value: row.get(1)?,
            updated_at: row.get(2)?,
        })
    })?;
    let mut settings = Vec::new();
    for row in rows {
        settings.push(row?);
    }
    Ok(settings)
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let result = conn.query_row(
        "SELECT value FROM app_settings WHERE key = ?1",
        [key],
        |row| row.get(0),
    );
    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn get_setting_bool(conn: &Connection, key: &str, default: bool) -> Result<bool, AppError> {
    match get_setting(conn, key)? {
        Some(v) => Ok(v == "true"),
        None => Ok(default),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<AppSetting, AppError> {
    conn.execute(
        "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')",
        params![key, value],
    )?;
    let setting = conn.query_row(
        "SELECT key, value, updated_at FROM app_settings WHERE key = ?1",
        [key],
        |row| {
            Ok(AppSetting {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        },
    )?;
    Ok(setting)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;

    #[test]
    fn test_set_and_get_setting() {
        let db = Database::new_in_memory().unwrap();
        set_setting(&db.conn, "test_key", "test_value").unwrap();
        assert_eq!(get_setting(&db.conn, "test_key").unwrap(), Some("test_value".to_string()));
    }

    #[test]
    fn test_get_setting_bool() {
        let db = Database::new_in_memory().unwrap();
        set_setting(&db.conn, "flag", "true").unwrap();
        assert!(get_setting_bool(&db.conn, "flag", false).unwrap());
        set_setting(&db.conn, "flag", "false").unwrap();
        assert!(!get_setting_bool(&db.conn, "flag", true).unwrap());
    }

    #[test]
    fn test_get_setting_bool_default() {
        let db = Database::new_in_memory().unwrap();
        assert!(get_setting_bool(&db.conn, "nonexistent", true).unwrap());
        assert!(!get_setting_bool(&db.conn, "nonexistent", false).unwrap());
    }

    #[test]
    fn test_get_all_settings() {
        let db = Database::new_in_memory().unwrap();
        set_setting(&db.conn, "a", "1").unwrap();
        set_setting(&db.conn, "b", "2").unwrap();
        let settings = get_all_settings(&db.conn).unwrap();
        // Migration seeds 2 defaults + our 2 = at least 2
        assert!(settings.len() >= 2);
    }

    #[test]
    fn test_upsert_setting() {
        let db = Database::new_in_memory().unwrap();
        set_setting(&db.conn, "key", "old").unwrap();
        set_setting(&db.conn, "key", "new").unwrap();
        assert_eq!(get_setting(&db.conn, "key").unwrap(), Some("new".to_string()));
    }
}
