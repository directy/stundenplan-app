use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{TeacherPreference, NewTeacherPreference};

pub fn create_preference(conn: &Connection, pref: &NewTeacherPreference) -> Result<TeacherPreference, AppError> {
    conn.execute(
        "INSERT INTO teacher_preferences (teacher_id, day_of_week, period, preference_type, reason)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            pref.teacher_id,
            pref.day_of_week,
            pref.period,
            pref.preference_type,
            pref.reason.as_deref().unwrap_or(""),
        ],
    )?;
    get_preference(conn, conn.last_insert_rowid())
}

pub fn get_preferences_for_teacher(conn: &Connection, teacher_id: i64) -> Result<Vec<TeacherPreference>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, teacher_id, day_of_week, period, preference_type, reason
         FROM teacher_preferences WHERE teacher_id = ?1
         ORDER BY day_of_week, period"
    )?;

    let rows = stmt.query_map([teacher_id], |row| {
        Ok(TeacherPreference {
            id: row.get(0)?,
            teacher_id: row.get(1)?,
            day_of_week: row.get(2)?,
            period: row.get(3)?,
            preference_type: row.get(4)?,
            reason: row.get(5)?,
        })
    })?;

    let mut prefs = Vec::new();
    for row in rows {
        prefs.push(row?);
    }
    Ok(prefs)
}

pub fn get_preference(conn: &Connection, id: i64) -> Result<TeacherPreference, AppError> {
    conn.query_row(
        "SELECT id, teacher_id, day_of_week, period, preference_type, reason
         FROM teacher_preferences WHERE id = ?1",
        [id],
        |row| {
            Ok(TeacherPreference {
                id: row.get(0)?,
                teacher_id: row.get(1)?,
                day_of_week: row.get(2)?,
                period: row.get(3)?,
                preference_type: row.get(4)?,
                reason: row.get(5)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Präferenz mit ID {} nicht gefunden", id)))
}

pub fn update_preference(conn: &Connection, id: i64, pref: &NewTeacherPreference) -> Result<TeacherPreference, AppError> {
    let rows = conn.execute(
        "UPDATE teacher_preferences SET teacher_id = ?1, day_of_week = ?2, period = ?3,
         preference_type = ?4, reason = ?5 WHERE id = ?6",
        params![
            pref.teacher_id,
            pref.day_of_week,
            pref.period,
            pref.preference_type,
            pref.reason.as_deref().unwrap_or(""),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Präferenz mit ID {} nicht gefunden", id)));
    }
    get_preference(conn, id)
}

pub fn delete_preference(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM teacher_preferences WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Präferenz mit ID {} nicht gefunden", id)));
    }
    Ok(())
}
