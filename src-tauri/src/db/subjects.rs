use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{Subject, NewSubject};

pub fn create_subject(conn: &Connection, subject: &NewSubject) -> Result<Subject, AppError> {
    conn.execute(
        "INSERT INTO subjects (name, short_name, room_type, weekly_hours_default)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            subject.name,
            subject.short_name,
            subject.room_type.as_deref().unwrap_or("standard"),
            subject.weekly_hours_default.unwrap_or(2),
        ],
    )?;
    get_subject(conn, conn.last_insert_rowid())
}

pub fn get_subjects(conn: &Connection) -> Result<Vec<Subject>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, short_name, room_type, weekly_hours_default
         FROM subjects ORDER BY name"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(Subject {
            id: row.get(0)?,
            name: row.get(1)?,
            short_name: row.get(2)?,
            room_type: row.get(3)?,
            weekly_hours_default: row.get(4)?,
        })
    })?;

    let mut subjects = Vec::new();
    for row in rows {
        subjects.push(row?);
    }
    Ok(subjects)
}

pub fn get_subject(conn: &Connection, id: i64) -> Result<Subject, AppError> {
    conn.query_row(
        "SELECT id, name, short_name, room_type, weekly_hours_default
         FROM subjects WHERE id = ?1",
        [id],
        |row| {
            Ok(Subject {
                id: row.get(0)?,
                name: row.get(1)?,
                short_name: row.get(2)?,
                room_type: row.get(3)?,
                weekly_hours_default: row.get(4)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Fach mit ID {} nicht gefunden", id)))
}

pub fn update_subject(conn: &Connection, id: i64, subject: &NewSubject) -> Result<Subject, AppError> {
    let rows = conn.execute(
        "UPDATE subjects SET name = ?1, short_name = ?2, room_type = ?3,
         weekly_hours_default = ?4 WHERE id = ?5",
        params![
            subject.name,
            subject.short_name,
            subject.room_type.as_deref().unwrap_or("standard"),
            subject.weekly_hours_default.unwrap_or(2),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Fach mit ID {} nicht gefunden", id)));
    }
    get_subject(conn, id)
}

pub fn delete_subject(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM subjects WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Fach mit ID {} nicht gefunden", id)));
    }
    Ok(())
}
