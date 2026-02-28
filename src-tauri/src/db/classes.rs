use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{SchoolClass, NewSchoolClass};

pub fn create_class(conn: &Connection, class: &NewSchoolClass) -> Result<SchoolClass, AppError> {
    conn.execute(
        "INSERT INTO classes (name, grade_level, class_teacher_id, student_count)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            class.name,
            class.grade_level,
            class.class_teacher_id,
            class.student_count.unwrap_or(25),
        ],
    )?;
    get_class(conn, conn.last_insert_rowid())
}

pub fn get_classes(conn: &Connection) -> Result<Vec<SchoolClass>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, grade_level, class_teacher_id, student_count
         FROM classes ORDER BY grade_level, name"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(SchoolClass {
            id: row.get(0)?,
            name: row.get(1)?,
            grade_level: row.get(2)?,
            class_teacher_id: row.get(3)?,
            student_count: row.get(4)?,
        })
    })?;

    let mut classes = Vec::new();
    for row in rows {
        classes.push(row?);
    }
    Ok(classes)
}

pub fn get_class(conn: &Connection, id: i64) -> Result<SchoolClass, AppError> {
    conn.query_row(
        "SELECT id, name, grade_level, class_teacher_id, student_count
         FROM classes WHERE id = ?1",
        [id],
        |row| {
            Ok(SchoolClass {
                id: row.get(0)?,
                name: row.get(1)?,
                grade_level: row.get(2)?,
                class_teacher_id: row.get(3)?,
                student_count: row.get(4)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Klasse mit ID {} nicht gefunden", id)))
}

pub fn update_class(conn: &Connection, id: i64, class: &NewSchoolClass) -> Result<SchoolClass, AppError> {
    let rows = conn.execute(
        "UPDATE classes SET name = ?1, grade_level = ?2, class_teacher_id = ?3,
         student_count = ?4 WHERE id = ?5",
        params![
            class.name,
            class.grade_level,
            class.class_teacher_id,
            class.student_count.unwrap_or(25),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Klasse mit ID {} nicht gefunden", id)));
    }
    get_class(conn, id)
}

pub fn delete_class(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM classes WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Klasse mit ID {} nicht gefunden", id)));
    }
    Ok(())
}
