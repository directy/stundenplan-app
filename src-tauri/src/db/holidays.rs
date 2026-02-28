use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{Holiday, HolidayImportData};

/// Importiert Feriendaten aus einer JSON-Struktur.
/// Loescht zuerst alle bestehenden Ferien fuer dasselbe Schuljahr+Bundesland.
pub fn import_holidays(conn: &Connection, data: &HolidayImportData) -> Result<Vec<Holiday>, AppError> {
    conn.execute(
        "DELETE FROM holidays WHERE school_year = ?1 AND state = ?2",
        params![data.school_year, data.state],
    )?;

    let mut imported = Vec::new();
    for period in &data.holidays {
        if period.start_date > period.end_date {
            return Err(AppError::Validation(format!(
                "Startdatum {} liegt nach Enddatum {} fuer '{}'",
                period.start_date, period.end_date, period.name
            )));
        }

        conn.execute(
            "INSERT INTO holidays (school_year, state, name, start_date, end_date)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![data.school_year, data.state, period.name, period.start_date, period.end_date],
        )?;
        imported.push(get_holiday(conn, conn.last_insert_rowid())?);
    }
    Ok(imported)
}

pub fn get_holidays(conn: &Connection) -> Result<Vec<Holiday>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, school_year, state, name, start_date, end_date, created_at
         FROM holidays ORDER BY start_date"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Holiday {
            id: row.get(0)?,
            school_year: row.get(1)?,
            state: row.get(2)?,
            name: row.get(3)?,
            start_date: row.get(4)?,
            end_date: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;
    let mut holidays = Vec::new();
    for row in rows {
        holidays.push(row?);
    }
    Ok(holidays)
}

fn get_holiday(conn: &Connection, id: i64) -> Result<Holiday, AppError> {
    conn.query_row(
        "SELECT id, school_year, state, name, start_date, end_date, created_at
         FROM holidays WHERE id = ?1",
        [id],
        |row| {
            Ok(Holiday {
                id: row.get(0)?,
                school_year: row.get(1)?,
                state: row.get(2)?,
                name: row.get(3)?,
                start_date: row.get(4)?,
                end_date: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Ferieneintrag mit ID {} nicht gefunden", id)))
}

pub fn delete_all_holidays(conn: &Connection) -> Result<(), AppError> {
    conn.execute("DELETE FROM holidays", [])?;
    Ok(())
}

/// Prueft ob ein bestimmtes Datum in einen Ferienzeitraum faellt.
pub fn is_holiday(conn: &Connection, date: &str) -> Result<bool, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM holidays WHERE ?1 BETWEEN start_date AND end_date",
        [date],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::create_all_tables;
    use crate::db::migrations::run_migrations;
    use crate::models::HolidayPeriod;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        create_all_tables(&conn).unwrap();
        run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn test_import_and_get_holidays() {
        let conn = setup();
        let data = HolidayImportData {
            school_year: "2025/2026".into(),
            state: "Sachsen".into(),
            holidays: vec![
                HolidayPeriod {
                    name: "Herbstferien".into(),
                    start_date: "2025-10-20".into(),
                    end_date: "2025-10-31".into(),
                },
                HolidayPeriod {
                    name: "Weihnachtsferien".into(),
                    start_date: "2025-12-22".into(),
                    end_date: "2026-01-02".into(),
                },
            ],
        };

        let imported = import_holidays(&conn, &data).unwrap();
        assert_eq!(imported.len(), 2);
        assert_eq!(imported[0].name, "Herbstferien");

        let all = get_holidays(&conn).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn test_import_replaces_existing() {
        let conn = setup();
        let data = HolidayImportData {
            school_year: "2025/2026".into(),
            state: "Sachsen".into(),
            holidays: vec![HolidayPeriod {
                name: "Herbstferien".into(),
                start_date: "2025-10-20".into(),
                end_date: "2025-10-31".into(),
            }],
        };
        import_holidays(&conn, &data).unwrap();

        // Nochmal importieren – alte werden ersetzt
        let data2 = HolidayImportData {
            school_year: "2025/2026".into(),
            state: "Sachsen".into(),
            holidays: vec![HolidayPeriod {
                name: "Winterferien".into(),
                start_date: "2026-02-09".into(),
                end_date: "2026-02-20".into(),
            }],
        };
        import_holidays(&conn, &data2).unwrap();

        let all = get_holidays(&conn).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].name, "Winterferien");
    }

    #[test]
    fn test_is_holiday() {
        let conn = setup();
        let data = HolidayImportData {
            school_year: "2025/2026".into(),
            state: "Sachsen".into(),
            holidays: vec![HolidayPeriod {
                name: "Herbstferien".into(),
                start_date: "2025-10-20".into(),
                end_date: "2025-10-31".into(),
            }],
        };
        import_holidays(&conn, &data).unwrap();

        assert!(is_holiday(&conn, "2025-10-25").unwrap());
        assert!(!is_holiday(&conn, "2025-11-01").unwrap());
    }

    #[test]
    fn test_delete_all_holidays() {
        let conn = setup();
        let data = HolidayImportData {
            school_year: "2025/2026".into(),
            state: "Sachsen".into(),
            holidays: vec![HolidayPeriod {
                name: "Herbstferien".into(),
                start_date: "2025-10-20".into(),
                end_date: "2025-10-31".into(),
            }],
        };
        import_holidays(&conn, &data).unwrap();
        delete_all_holidays(&conn).unwrap();

        let all = get_holidays(&conn).unwrap();
        assert!(all.is_empty());
    }
}
