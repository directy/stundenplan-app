use std::collections::{HashMap, HashSet};
use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{TeacherClassRestriction, NewTeacherClassRestriction};

/// (qualification_map, preference_map) — maps teacher_id to set of class_ids
pub type RestrictionMaps = (HashMap<i64, HashSet<i64>>, HashMap<i64, HashSet<i64>>);

pub fn get_restrictions_for_teacher(conn: &Connection, teacher_id: i64) -> Result<Vec<TeacherClassRestriction>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, teacher_id, class_id, restriction_type
         FROM teacher_class_restrictions WHERE teacher_id = ?1 ORDER BY class_id"
    )?;
    let rows = stmt.query_map([teacher_id], |row| {
        Ok(TeacherClassRestriction {
            id: row.get(0)?,
            teacher_id: row.get(1)?,
            class_id: row.get(2)?,
            restriction_type: row.get(3)?,
        })
    })?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn get_all_restrictions(conn: &Connection) -> Result<Vec<TeacherClassRestriction>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, teacher_id, class_id, restriction_type
         FROM teacher_class_restrictions ORDER BY teacher_id, class_id"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(TeacherClassRestriction {
            id: row.get(0)?,
            teacher_id: row.get(1)?,
            class_id: row.get(2)?,
            restriction_type: row.get(3)?,
        })
    })?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row?);
    }
    Ok(result)
}

pub fn create_restriction(conn: &Connection, data: &NewTeacherClassRestriction) -> Result<TeacherClassRestriction, AppError> {
    let rtype = data.restriction_type.as_deref().unwrap_or("preference");
    conn.execute(
        "INSERT INTO teacher_class_restrictions (teacher_id, class_id, restriction_type)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(teacher_id, class_id) DO UPDATE SET restriction_type = ?3",
        params![data.teacher_id, data.class_id, rtype],
    )?;
    let id = conn.last_insert_rowid();
    Ok(TeacherClassRestriction {
        id,
        teacher_id: data.teacher_id,
        class_id: data.class_id,
        restriction_type: rtype.to_string(),
    })
}

pub fn update_restriction(conn: &Connection, id: i64, restriction_type: &str) -> Result<TeacherClassRestriction, AppError> {
    conn.execute(
        "UPDATE teacher_class_restrictions SET restriction_type = ?1 WHERE id = ?2",
        params![restriction_type, id],
    )?;
    let r = conn.query_row(
        "SELECT id, teacher_id, class_id, restriction_type FROM teacher_class_restrictions WHERE id = ?1",
        [id],
        |row| {
            Ok(TeacherClassRestriction {
                id: row.get(0)?,
                teacher_id: row.get(1)?,
                class_id: row.get(2)?,
                restriction_type: row.get(3)?,
            })
        },
    )?;
    Ok(r)
}

pub fn delete_restriction(conn: &Connection, id: i64) -> Result<(), AppError> {
    conn.execute("DELETE FROM teacher_class_restrictions WHERE id = ?1", [id])?;
    Ok(())
}

/// Returns (qualification_map, preference_map) for solver use.
/// qualification_map: teacher_id -> set of class_ids the teacher CAN teach (hard constraint)
/// preference_map: teacher_id -> set of class_ids the teacher WANTS to teach (soft constraint)
pub fn get_restriction_maps(conn: &Connection) -> Result<RestrictionMaps, AppError> {
    let all = get_all_restrictions(conn)?;
    let mut qualification_map: HashMap<i64, HashSet<i64>> = HashMap::new();
    let mut preference_map: HashMap<i64, HashSet<i64>> = HashMap::new();

    for r in &all {
        match r.restriction_type.as_str() {
            "qualification" => {
                qualification_map.entry(r.teacher_id).or_default().insert(r.class_id);
            }
            "preference" => {
                preference_map.entry(r.teacher_id).or_default().insert(r.class_id);
            }
            _ => {}
        }
    }

    Ok((qualification_map, preference_map))
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
    fn test_create_and_get_restriction() {
        let db = setup();
        let teacher = db::teachers::create_teacher(&db.conn, &NewTeacher {
            name: "Test".into(), email: None, engagement_score: None, pedagogical_score: None,
            part_time_quota: None, max_hours_per_day: None,
        }).unwrap();
        let class = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(), grade_level: 5, class_teacher_id: None, student_count: None,
        }).unwrap();

        create_restriction(&db.conn, &NewTeacherClassRestriction {
            teacher_id: teacher.id, class_id: class.id, restriction_type: Some("qualification".into()),
        }).unwrap();

        let restrictions = get_restrictions_for_teacher(&db.conn, teacher.id).unwrap();
        assert_eq!(restrictions.len(), 1);
        assert_eq!(restrictions[0].restriction_type, "qualification");
    }

    #[test]
    fn test_upsert_restriction() {
        let db = setup();
        let teacher = db::teachers::create_teacher(&db.conn, &NewTeacher {
            name: "Test".into(), email: None, engagement_score: None, pedagogical_score: None,
            part_time_quota: None, max_hours_per_day: None,
        }).unwrap();
        let class = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(), grade_level: 5, class_teacher_id: None, student_count: None,
        }).unwrap();

        create_restriction(&db.conn, &NewTeacherClassRestriction {
            teacher_id: teacher.id, class_id: class.id, restriction_type: Some("preference".into()),
        }).unwrap();
        // Upsert changes type
        create_restriction(&db.conn, &NewTeacherClassRestriction {
            teacher_id: teacher.id, class_id: class.id, restriction_type: Some("qualification".into()),
        }).unwrap();

        let restrictions = get_restrictions_for_teacher(&db.conn, teacher.id).unwrap();
        assert_eq!(restrictions.len(), 1);
        assert_eq!(restrictions[0].restriction_type, "qualification");
    }

    #[test]
    fn test_restriction_maps() {
        let db = setup();
        let t1 = db::teachers::create_teacher(&db.conn, &NewTeacher {
            name: "T1".into(), email: None, engagement_score: None, pedagogical_score: None,
            part_time_quota: None, max_hours_per_day: None,
        }).unwrap();
        let c1 = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(), grade_level: 5, class_teacher_id: None, student_count: None,
        }).unwrap();
        let c2 = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5b".into(), grade_level: 5, class_teacher_id: None, student_count: None,
        }).unwrap();

        create_restriction(&db.conn, &NewTeacherClassRestriction {
            teacher_id: t1.id, class_id: c1.id, restriction_type: Some("qualification".into()),
        }).unwrap();
        create_restriction(&db.conn, &NewTeacherClassRestriction {
            teacher_id: t1.id, class_id: c2.id, restriction_type: Some("preference".into()),
        }).unwrap();

        let (qual_map, pref_map) = get_restriction_maps(&db.conn).unwrap();
        assert!(qual_map.get(&t1.id).unwrap().contains(&c1.id));
        assert!(!qual_map.get(&t1.id).unwrap().contains(&c2.id));
        assert!(pref_map.get(&t1.id).unwrap().contains(&c2.id));
    }

    #[test]
    fn test_delete_restriction() {
        let db = setup();
        let teacher = db::teachers::create_teacher(&db.conn, &NewTeacher {
            name: "T".into(), email: None, engagement_score: None, pedagogical_score: None,
            part_time_quota: None, max_hours_per_day: None,
        }).unwrap();
        let class = db::classes::create_class(&db.conn, &NewSchoolClass {
            name: "5a".into(), grade_level: 5, class_teacher_id: None, student_count: None,
        }).unwrap();

        let r = create_restriction(&db.conn, &NewTeacherClassRestriction {
            teacher_id: teacher.id, class_id: class.id, restriction_type: None,
        }).unwrap();
        delete_restriction(&db.conn, r.id).unwrap();
        let restrictions = get_restrictions_for_teacher(&db.conn, teacher.id).unwrap();
        assert!(restrictions.is_empty());
    }
}
