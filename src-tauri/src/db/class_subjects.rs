use std::collections::HashMap;
use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{ClassSubject, NewClassSubject};

pub fn get_all_class_subjects(conn: &Connection) -> Result<Vec<ClassSubject>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT class_id, subject_id, weekly_hours FROM class_subjects ORDER BY class_id, subject_id"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ClassSubject {
            class_id: row.get(0)?,
            subject_id: row.get(1)?,
            weekly_hours: row.get(2)?,
        })
    })?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn get_class_subjects_for_class(conn: &Connection, class_id: i64) -> Result<Vec<ClassSubject>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT class_id, subject_id, weekly_hours FROM class_subjects WHERE class_id = ?1 ORDER BY subject_id"
    )?;
    let rows = stmt.query_map([class_id], |row| {
        Ok(ClassSubject {
            class_id: row.get(0)?,
            subject_id: row.get(1)?,
            weekly_hours: row.get(2)?,
        })
    })?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn upsert_class_subject(conn: &Connection, data: &NewClassSubject) -> Result<ClassSubject, AppError> {
    conn.execute(
        "INSERT INTO class_subjects (class_id, subject_id, weekly_hours)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(class_id, subject_id) DO UPDATE SET weekly_hours = ?3",
        params![data.class_id, data.subject_id, data.weekly_hours],
    )?;
    Ok(ClassSubject {
        class_id: data.class_id,
        subject_id: data.subject_id,
        weekly_hours: data.weekly_hours,
    })
}

pub fn batch_upsert_class_subjects(conn: &Connection, entries: &[NewClassSubject]) -> Result<Vec<ClassSubject>, AppError> {
    let mut result = Vec::new();
    for entry in entries {
        result.push(upsert_class_subject(conn, entry)?);
    }
    Ok(result)
}

pub fn delete_class_subject(conn: &Connection, class_id: i64, subject_id: i64) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM class_subjects WHERE class_id = ?1 AND subject_id = ?2",
        params![class_id, subject_id],
    )?;
    Ok(())
}

/// Returns a HashMap of (class_id, subject_id) -> weekly_hours for solver use.
pub fn get_all_class_subject_hours(conn: &Connection) -> Result<HashMap<(i64, i64), i32>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT class_id, subject_id, weekly_hours FROM class_subjects"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?, row.get::<_, i32>(2)?))
    })?;
    let mut map = HashMap::new();
    for row in rows {
        let (cid, sid, hours) = row?;
        map.insert((cid, sid), hours);
    }
    Ok(map)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;
    use crate::db;
    use crate::models::*;

    fn setup() -> Database {
        let db = Database::new_in_memory().unwrap();
        db::time_slots::seed_default_time_slots(&db.conn).unwrap();
        db
    }

    #[test]
    fn test_upsert_and_get() {
        let db = setup();
        let class = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(), grade_level: 5, class_teacher_id: None, student_count: None,
        }).unwrap();
        let subject = db::subjects::create_subject(&db.conn, &NewSubject {
            name: "Mathe".into(), short_name: "Ma".into(), room_type: None, weekly_hours_default: Some(4),
        }).unwrap();

        upsert_class_subject(&db.conn, &NewClassSubject {
            class_id: class.id, subject_id: subject.id, weekly_hours: 5,
        }).unwrap();

        let all = get_class_subjects_for_class(&db.conn, class.id).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].weekly_hours, 5);

        // Upsert updates
        upsert_class_subject(&db.conn, &NewClassSubject {
            class_id: class.id, subject_id: subject.id, weekly_hours: 3,
        }).unwrap();
        let all = get_class_subjects_for_class(&db.conn, class.id).unwrap();
        assert_eq!(all[0].weekly_hours, 3);
    }

    #[test]
    fn test_delete_class_subject() {
        let db = setup();
        let class = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(), grade_level: 5, class_teacher_id: None, student_count: None,
        }).unwrap();
        let subject = db::subjects::create_subject(&db.conn, &NewSubject {
            name: "Mathe".into(), short_name: "Ma".into(), room_type: None, weekly_hours_default: Some(4),
        }).unwrap();

        upsert_class_subject(&db.conn, &NewClassSubject {
            class_id: class.id, subject_id: subject.id, weekly_hours: 5,
        }).unwrap();

        delete_class_subject(&db.conn, class.id, subject.id).unwrap();
        let all = get_class_subjects_for_class(&db.conn, class.id).unwrap();
        assert!(all.is_empty());
    }

    #[test]
    fn test_get_all_class_subject_hours() {
        let db = setup();
        let c1 = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(), grade_level: 5, class_teacher_id: None, student_count: None,
        }).unwrap();
        let s1 = db::subjects::create_subject(&db.conn, &NewSubject {
            name: "Mathe".into(), short_name: "Ma".into(), room_type: None, weekly_hours_default: Some(4),
        }).unwrap();

        upsert_class_subject(&db.conn, &NewClassSubject {
            class_id: c1.id, subject_id: s1.id, weekly_hours: 6,
        }).unwrap();

        let map = get_all_class_subject_hours(&db.conn).unwrap();
        assert_eq!(*map.get(&(c1.id, s1.id)).unwrap(), 6);
    }
}
