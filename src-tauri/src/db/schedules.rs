use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{Schedule, NewSchedule};

pub fn create_schedule(conn: &Connection, schedule: &NewSchedule) -> Result<Schedule, AppError> {
    conn.execute(
        "INSERT INTO schedules (name, status) VALUES (?1, ?2)",
        params![
            schedule.name,
            schedule.status.as_deref().unwrap_or("draft"),
        ],
    )?;
    get_schedule(conn, conn.last_insert_rowid())
}

pub fn get_schedules(conn: &Connection) -> Result<Vec<Schedule>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, status, created_at, updated_at
         FROM schedules ORDER BY updated_at DESC"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(Schedule {
            id: row.get(0)?,
            name: row.get(1)?,
            status: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;

    let mut schedules = Vec::new();
    for row in rows {
        schedules.push(row?);
    }
    Ok(schedules)
}

pub fn get_schedule(conn: &Connection, id: i64) -> Result<Schedule, AppError> {
    conn.query_row(
        "SELECT id, name, status, created_at, updated_at
         FROM schedules WHERE id = ?1",
        [id],
        |row| {
            Ok(Schedule {
                id: row.get(0)?,
                name: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Stundenplan mit ID {} nicht gefunden", id)))
}

pub fn update_schedule(conn: &Connection, id: i64, schedule: &NewSchedule) -> Result<Schedule, AppError> {
    let rows = conn.execute(
        "UPDATE schedules SET name = ?1, status = ?2, updated_at = datetime('now')
         WHERE id = ?3",
        params![
            schedule.name,
            schedule.status.as_deref().unwrap_or("draft"),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Stundenplan mit ID {} nicht gefunden", id)));
    }
    get_schedule(conn, id)
}

pub fn delete_schedule(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM schedules WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Stundenplan mit ID {} nicht gefunden", id)));
    }
    Ok(())
}
