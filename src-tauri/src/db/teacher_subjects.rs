use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{Subject, Teacher};

pub fn add_teacher_subject(conn: &Connection, teacher_id: i64, subject_id: i64) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?1, ?2)",
        params![teacher_id, subject_id],
    )?;
    Ok(())
}

pub fn remove_teacher_subject(conn: &Connection, teacher_id: i64, subject_id: i64) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM teacher_subjects WHERE teacher_id = ?1 AND subject_id = ?2",
        params![teacher_id, subject_id],
    )?;
    Ok(())
}

pub fn get_subjects_for_teacher(conn: &Connection, teacher_id: i64) -> Result<Vec<Subject>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.short_name, s.room_type, s.weekly_hours_default
         FROM subjects s
         INNER JOIN teacher_subjects ts ON s.id = ts.subject_id
         WHERE ts.teacher_id = ?1
         ORDER BY s.name"
    )?;

    let rows = stmt.query_map([teacher_id], |row| {
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

pub fn get_teachers_for_subject(conn: &Connection, subject_id: i64) -> Result<Vec<Teacher>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.email, t.engagement_score, t.pedagogical_score,
         t.part_time_quota, t.max_hours_per_day, t.created_at, t.updated_at
         FROM teachers t
         INNER JOIN teacher_subjects ts ON t.id = ts.teacher_id
         WHERE ts.subject_id = ?1
         ORDER BY t.name"
    )?;

    let rows = stmt.query_map([subject_id], |row| {
        Ok(Teacher {
            id: row.get(0)?,
            name: row.get(1)?,
            email: row.get(2)?,
            engagement_score: row.get(3)?,
            pedagogical_score: row.get(4)?,
            part_time_quota: row.get(5)?,
            max_hours_per_day: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    let mut teachers = Vec::new();
    for row in rows {
        teachers.push(row?);
    }
    Ok(teachers)
}
