use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{TeacherWish, NewTeacherWish};

pub fn create_wish(conn: &Connection, wish: &NewTeacherWish) -> Result<TeacherWish, AppError> {
    conn.execute(
        "INSERT INTO teacher_wishes (teacher_id, wish_type, priority, parameters, note, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            wish.teacher_id,
            wish.wish_type,
            wish.priority.as_deref().unwrap_or("medium"),
            wish.parameters.as_deref().unwrap_or("{}"),
            wish.note.as_deref().unwrap_or(""),
            wish.is_active.unwrap_or(true),
        ],
    )?;
    get_wish(conn, conn.last_insert_rowid())
}

pub fn get_wish(conn: &Connection, id: i64) -> Result<TeacherWish, AppError> {
    conn.query_row(
        "SELECT id, teacher_id, wish_type, priority, parameters, note, is_active, created_at
         FROM teacher_wishes WHERE id = ?1",
        [id],
        |row| {
            Ok(TeacherWish {
                id: row.get(0)?,
                teacher_id: row.get(1)?,
                wish_type: row.get(2)?,
                priority: row.get(3)?,
                parameters: row.get(4)?,
                note: row.get(5)?,
                is_active: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Wunsch mit ID {} nicht gefunden", id)))
}

pub fn get_wishes_for_teacher(conn: &Connection, teacher_id: i64) -> Result<Vec<TeacherWish>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, teacher_id, wish_type, priority, parameters, note, is_active, created_at
         FROM teacher_wishes WHERE teacher_id = ?1
         ORDER BY created_at DESC"
    )?;

    let rows = stmt.query_map([teacher_id], |row| {
        Ok(TeacherWish {
            id: row.get(0)?,
            teacher_id: row.get(1)?,
            wish_type: row.get(2)?,
            priority: row.get(3)?,
            parameters: row.get(4)?,
            note: row.get(5)?,
            is_active: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;

    let mut wishes = Vec::new();
    for row in rows {
        wishes.push(row?);
    }
    Ok(wishes)
}

pub fn get_all_active_wishes(conn: &Connection) -> Result<Vec<TeacherWish>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, teacher_id, wish_type, priority, parameters, note, is_active, created_at
         FROM teacher_wishes WHERE is_active = 1
         ORDER BY teacher_id, wish_type"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(TeacherWish {
            id: row.get(0)?,
            teacher_id: row.get(1)?,
            wish_type: row.get(2)?,
            priority: row.get(3)?,
            parameters: row.get(4)?,
            note: row.get(5)?,
            is_active: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;

    let mut wishes = Vec::new();
    for row in rows {
        wishes.push(row?);
    }
    Ok(wishes)
}

pub fn update_wish(conn: &Connection, id: i64, wish: &NewTeacherWish) -> Result<TeacherWish, AppError> {
    let rows = conn.execute(
        "UPDATE teacher_wishes SET wish_type = ?1, priority = ?2, parameters = ?3,
         note = ?4, is_active = ?5 WHERE id = ?6",
        params![
            wish.wish_type,
            wish.priority.as_deref().unwrap_or("medium"),
            wish.parameters.as_deref().unwrap_or("{}"),
            wish.note.as_deref().unwrap_or(""),
            wish.is_active.unwrap_or(true),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Wunsch mit ID {} nicht gefunden", id)));
    }
    get_wish(conn, id)
}

pub fn delete_wish(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM teacher_wishes WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Wunsch mit ID {} nicht gefunden", id)));
    }
    Ok(())
}
