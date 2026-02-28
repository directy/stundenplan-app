use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{Teacher, NewTeacher};

pub fn create_teacher(conn: &Connection, teacher: &NewTeacher) -> Result<Teacher, AppError> {
    conn.execute(
        "INSERT INTO teachers (name, email, engagement_score, pedagogical_score,
         part_time_quota, max_hours_per_day)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            teacher.name,
            teacher.email,
            teacher.engagement_score.unwrap_or(0.5),
            teacher.pedagogical_score.unwrap_or(0.5),
            teacher.part_time_quota.unwrap_or(1.0),
            teacher.max_hours_per_day.unwrap_or(6),
        ],
    )?;
    get_teacher(conn, conn.last_insert_rowid())
}

pub fn get_teachers(conn: &Connection) -> Result<Vec<Teacher>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, email, engagement_score, pedagogical_score,
         part_time_quota, max_hours_per_day, created_at, updated_at
         FROM teachers ORDER BY name"
    )?;

    let rows = stmt.query_map([], |row| {
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

pub fn get_teacher(conn: &Connection, id: i64) -> Result<Teacher, AppError> {
    conn.query_row(
        "SELECT id, name, email, engagement_score, pedagogical_score,
         part_time_quota, max_hours_per_day, created_at, updated_at
         FROM teachers WHERE id = ?1",
        [id],
        |row| {
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
        },
    ).map_err(|_| AppError::NotFound(format!("Lehrkraft mit ID {} nicht gefunden", id)))
}

pub fn update_teacher(conn: &Connection, id: i64, teacher: &NewTeacher) -> Result<Teacher, AppError> {
    let rows = conn.execute(
        "UPDATE teachers SET name = ?1, email = ?2, engagement_score = ?3,
         pedagogical_score = ?4, part_time_quota = ?5, max_hours_per_day = ?6,
         updated_at = datetime('now') WHERE id = ?7",
        params![
            teacher.name,
            teacher.email,
            teacher.engagement_score.unwrap_or(0.5),
            teacher.pedagogical_score.unwrap_or(0.5),
            teacher.part_time_quota.unwrap_or(1.0),
            teacher.max_hours_per_day.unwrap_or(6),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Lehrkraft mit ID {} nicht gefunden", id)));
    }
    get_teacher(conn, id)
}

pub fn delete_teacher(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM teachers WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Lehrkraft mit ID {} nicht gefunden", id)));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;

    #[test]
    fn test_teacher_crud() {
        let db = Database::new_in_memory().unwrap();

        // Create
        let new = NewTeacher {
            name: "Max Mustermann".to_string(),
            email: Some("max@schule.de".to_string()),
            engagement_score: Some(0.8),
            pedagogical_score: Some(0.9),
            part_time_quota: Some(1.0),
            max_hours_per_day: Some(6),
        };
        let created = create_teacher(&db.conn, &new).unwrap();
        assert_eq!(created.name, "Max Mustermann");
        assert_eq!(created.engagement_score, 0.8);

        // Read
        let fetched = get_teacher(&db.conn, created.id).unwrap();
        assert_eq!(fetched.name, "Max Mustermann");

        // List
        let all = get_teachers(&db.conn).unwrap();
        assert_eq!(all.len(), 1);

        // Update
        let update = NewTeacher {
            name: "Max Mueller".to_string(),
            email: Some("max@schule.de".to_string()),
            engagement_score: Some(0.85),
            pedagogical_score: Some(0.9),
            part_time_quota: Some(1.0),
            max_hours_per_day: Some(6),
        };
        let updated = update_teacher(&db.conn, created.id, &update).unwrap();
        assert_eq!(updated.name, "Max Mueller");

        // Delete
        delete_teacher(&db.conn, created.id).unwrap();
        let all = get_teachers(&db.conn).unwrap();
        assert_eq!(all.len(), 0);
    }
}
