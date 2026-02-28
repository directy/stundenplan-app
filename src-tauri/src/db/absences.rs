use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{TeacherAbsence, NewTeacherAbsence};

pub fn create_absence(conn: &Connection, absence: &NewTeacherAbsence) -> Result<TeacherAbsence, AppError> {
    if absence.start_date > absence.end_date {
        return Err(AppError::Validation(format!(
            "Startdatum {} liegt nach Enddatum {}",
            absence.start_date, absence.end_date
        )));
    }

    conn.execute(
        "INSERT INTO teacher_absences (teacher_id, absence_type, start_date, end_date, note)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            absence.teacher_id,
            absence.absence_type,
            absence.start_date,
            absence.end_date,
            absence.note.as_deref().unwrap_or(""),
        ],
    )?;
    get_absence(conn, conn.last_insert_rowid())
}

pub fn get_absences(conn: &Connection) -> Result<Vec<TeacherAbsence>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, teacher_id, absence_type, start_date, end_date, note, created_at, updated_at
         FROM teacher_absences ORDER BY start_date DESC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(TeacherAbsence {
            id: row.get(0)?,
            teacher_id: row.get(1)?,
            absence_type: row.get(2)?,
            start_date: row.get(3)?,
            end_date: row.get(4)?,
            note: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    let mut absences = Vec::new();
    for row in rows {
        absences.push(row?);
    }
    Ok(absences)
}

pub fn get_absences_for_teacher(conn: &Connection, teacher_id: i64) -> Result<Vec<TeacherAbsence>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, teacher_id, absence_type, start_date, end_date, note, created_at, updated_at
         FROM teacher_absences WHERE teacher_id = ?1
         ORDER BY start_date DESC"
    )?;
    let rows = stmt.query_map([teacher_id], |row| {
        Ok(TeacherAbsence {
            id: row.get(0)?,
            teacher_id: row.get(1)?,
            absence_type: row.get(2)?,
            start_date: row.get(3)?,
            end_date: row.get(4)?,
            note: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    let mut absences = Vec::new();
    for row in rows {
        absences.push(row?);
    }
    Ok(absences)
}

pub fn get_absence(conn: &Connection, id: i64) -> Result<TeacherAbsence, AppError> {
    conn.query_row(
        "SELECT id, teacher_id, absence_type, start_date, end_date, note, created_at, updated_at
         FROM teacher_absences WHERE id = ?1",
        [id],
        |row| {
            Ok(TeacherAbsence {
                id: row.get(0)?,
                teacher_id: row.get(1)?,
                absence_type: row.get(2)?,
                start_date: row.get(3)?,
                end_date: row.get(4)?,
                note: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Abwesenheit mit ID {} nicht gefunden", id)))
}

pub fn update_absence(conn: &Connection, id: i64, absence: &NewTeacherAbsence) -> Result<TeacherAbsence, AppError> {
    if absence.start_date > absence.end_date {
        return Err(AppError::Validation(format!(
            "Startdatum {} liegt nach Enddatum {}",
            absence.start_date, absence.end_date
        )));
    }

    let rows = conn.execute(
        "UPDATE teacher_absences SET teacher_id = ?1, absence_type = ?2,
         start_date = ?3, end_date = ?4, note = ?5, updated_at = datetime('now')
         WHERE id = ?6",
        params![
            absence.teacher_id,
            absence.absence_type,
            absence.start_date,
            absence.end_date,
            absence.note.as_deref().unwrap_or(""),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Abwesenheit mit ID {} nicht gefunden", id)));
    }
    get_absence(conn, id)
}

pub fn delete_absence(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM teacher_absences WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Abwesenheit mit ID {} nicht gefunden", id)));
    }
    Ok(())
}

/// Gibt alle Lehrer-IDs zurueck, die an einem bestimmten Datum abwesend sind.
pub fn get_absent_teacher_ids_on_date(conn: &Connection, date: &str) -> Result<Vec<i64>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT teacher_id FROM teacher_absences
         WHERE ?1 BETWEEN start_date AND end_date"
    )?;
    let rows = stmt.query_map([date], |row| row.get(0))?;
    let mut ids = Vec::new();
    for row in rows {
        ids.push(row?);
    }
    Ok(ids)
}

/// Prueft ob ein Lehrer in einem bestimmten Zeitraum abwesend ist.
/// Gibt true zurueck wenn eine Abwesenheit den gesamten Zeitraum abdeckt.
pub fn is_teacher_absent_in_range(
    conn: &Connection,
    teacher_id: i64,
    range_start: &str,
    range_end: &str,
) -> Result<bool, AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM teacher_absences
         WHERE teacher_id = ?1 AND start_date <= ?2 AND end_date >= ?3",
        params![teacher_id, range_start, range_end],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::create_all_tables;
    use crate::db::migrations::run_migrations;
    use crate::db;
    use crate::models::NewTeacher;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        create_all_tables(&conn).unwrap();
        run_migrations(&conn).unwrap();
        conn
    }

    fn create_test_teacher(conn: &Connection) -> i64 {
        let teacher = db::teachers::create_teacher(conn, &NewTeacher {
            name: "Herr Test".into(),
            email: None,
            engagement_score: None,
            pedagogical_score: None,
            part_time_quota: None,
            max_hours_per_day: None,
        }).unwrap();
        teacher.id
    }

    #[test]
    fn test_create_and_get_absence() {
        let conn = setup();
        let teacher_id = create_test_teacher(&conn);

        let absence = create_absence(&conn, &NewTeacherAbsence {
            teacher_id,
            absence_type: "illness".into(),
            start_date: "2026-01-10".into(),
            end_date: "2026-01-20".into(),
            note: Some("Grippe".into()),
        }).unwrap();

        assert_eq!(absence.teacher_id, teacher_id);
        assert_eq!(absence.absence_type, "illness");
        assert_eq!(absence.note, Some("Grippe".to_string()));

        let fetched = get_absence(&conn, absence.id).unwrap();
        assert_eq!(fetched.id, absence.id);
    }

    #[test]
    fn test_get_absences_for_teacher() {
        let conn = setup();
        let teacher_id = create_test_teacher(&conn);

        create_absence(&conn, &NewTeacherAbsence {
            teacher_id,
            absence_type: "illness".into(),
            start_date: "2026-01-10".into(),
            end_date: "2026-01-20".into(),
            note: None,
        }).unwrap();

        create_absence(&conn, &NewTeacherAbsence {
            teacher_id,
            absence_type: "sabbatical".into(),
            start_date: "2026-06-01".into(),
            end_date: "2026-12-31".into(),
            note: None,
        }).unwrap();

        let absences = get_absences_for_teacher(&conn, teacher_id).unwrap();
        assert_eq!(absences.len(), 2);
    }

    #[test]
    fn test_update_absence() {
        let conn = setup();
        let teacher_id = create_test_teacher(&conn);

        let absence = create_absence(&conn, &NewTeacherAbsence {
            teacher_id,
            absence_type: "illness".into(),
            start_date: "2026-01-10".into(),
            end_date: "2026-01-20".into(),
            note: None,
        }).unwrap();

        let updated = update_absence(&conn, absence.id, &NewTeacherAbsence {
            teacher_id,
            absence_type: "illness".into(),
            start_date: "2026-01-10".into(),
            end_date: "2026-02-10".into(),
            note: Some("Verlaengert".into()),
        }).unwrap();

        assert_eq!(updated.end_date, "2026-02-10");
        assert_eq!(updated.note, Some("Verlaengert".to_string()));
    }

    #[test]
    fn test_delete_absence() {
        let conn = setup();
        let teacher_id = create_test_teacher(&conn);

        let absence = create_absence(&conn, &NewTeacherAbsence {
            teacher_id,
            absence_type: "training".into(),
            start_date: "2026-03-01".into(),
            end_date: "2026-03-05".into(),
            note: None,
        }).unwrap();

        delete_absence(&conn, absence.id).unwrap();
        assert!(get_absence(&conn, absence.id).is_err());
    }

    #[test]
    fn test_absent_teacher_ids_on_date() {
        let conn = setup();
        let t1 = create_test_teacher(&conn);
        let t2 = db::teachers::create_teacher(&conn, &NewTeacher {
            name: "Frau Zwei".into(),
            email: None,
            engagement_score: None,
            pedagogical_score: None,
            part_time_quota: None,
            max_hours_per_day: None,
        }).unwrap().id;

        create_absence(&conn, &NewTeacherAbsence {
            teacher_id: t1,
            absence_type: "illness".into(),
            start_date: "2026-01-10".into(),
            end_date: "2026-01-20".into(),
            note: None,
        }).unwrap();

        create_absence(&conn, &NewTeacherAbsence {
            teacher_id: t2,
            absence_type: "maternity".into(),
            start_date: "2026-01-01".into(),
            end_date: "2026-06-30".into(),
            note: None,
        }).unwrap();

        let absent = get_absent_teacher_ids_on_date(&conn, "2026-01-15").unwrap();
        assert_eq!(absent.len(), 2);

        let absent2 = get_absent_teacher_ids_on_date(&conn, "2026-02-01").unwrap();
        assert_eq!(absent2.len(), 1);
        assert_eq!(absent2[0], t2);
    }

    #[test]
    fn test_is_teacher_absent_in_range() {
        let conn = setup();
        let teacher_id = create_test_teacher(&conn);

        create_absence(&conn, &NewTeacherAbsence {
            teacher_id,
            absence_type: "sabbatical".into(),
            start_date: "2026-01-01".into(),
            end_date: "2026-12-31".into(),
            note: None,
        }).unwrap();

        // Abwesenheit deckt den gesamten Zeitraum ab
        assert!(is_teacher_absent_in_range(&conn, teacher_id, "2026-02-01", "2026-06-30").unwrap());
        // Abwesenheit deckt nicht den gesamten Zeitraum ab (endet vorher)
        assert!(!is_teacher_absent_in_range(&conn, teacher_id, "2025-06-01", "2026-06-30").unwrap());
    }

    #[test]
    fn test_validation_start_after_end() {
        let conn = setup();
        let teacher_id = create_test_teacher(&conn);

        let result = create_absence(&conn, &NewTeacherAbsence {
            teacher_id,
            absence_type: "illness".into(),
            start_date: "2026-03-10".into(),
            end_date: "2026-03-01".into(),
            note: None,
        });
        assert!(result.is_err());
    }
}
