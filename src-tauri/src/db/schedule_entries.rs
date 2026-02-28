use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{ScheduleEntry, NewScheduleEntry};

pub fn create_schedule_entry(conn: &Connection, entry: &NewScheduleEntry) -> Result<ScheduleEntry, AppError> {
    conn.execute(
        "INSERT INTO schedule_entries (schedule_id, time_slot_id, class_id, subject_id,
         teacher_id, room_id, decision_log)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            entry.schedule_id,
            entry.time_slot_id,
            entry.class_id,
            entry.subject_id,
            entry.teacher_id,
            entry.room_id,
            entry.decision_log.as_deref().unwrap_or("{}"),
        ],
    )?;
    get_schedule_entry(conn, conn.last_insert_rowid())
}

pub fn get_schedule_entries(conn: &Connection, schedule_id: i64) -> Result<Vec<ScheduleEntry>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, schedule_id, time_slot_id, class_id, subject_id,
         teacher_id, room_id, decision_log, created_at
         FROM schedule_entries WHERE schedule_id = ?1
         ORDER BY time_slot_id"
    )?;

    let rows = stmt.query_map([schedule_id], |row| {
        Ok(ScheduleEntry {
            id: row.get(0)?,
            schedule_id: row.get(1)?,
            time_slot_id: row.get(2)?,
            class_id: row.get(3)?,
            subject_id: row.get(4)?,
            teacher_id: row.get(5)?,
            room_id: row.get(6)?,
            decision_log: row.get(7)?,
            created_at: row.get(8)?,
        })
    })?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row?);
    }
    Ok(entries)
}

pub fn get_schedule_entry(conn: &Connection, id: i64) -> Result<ScheduleEntry, AppError> {
    conn.query_row(
        "SELECT id, schedule_id, time_slot_id, class_id, subject_id,
         teacher_id, room_id, decision_log, created_at
         FROM schedule_entries WHERE id = ?1",
        [id],
        |row| {
            Ok(ScheduleEntry {
                id: row.get(0)?,
                schedule_id: row.get(1)?,
                time_slot_id: row.get(2)?,
                class_id: row.get(3)?,
                subject_id: row.get(4)?,
                teacher_id: row.get(5)?,
                room_id: row.get(6)?,
                decision_log: row.get(7)?,
                created_at: row.get(8)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Eintrag mit ID {} nicht gefunden", id)))
}

pub fn update_schedule_entry(conn: &Connection, id: i64, entry: &NewScheduleEntry) -> Result<ScheduleEntry, AppError> {
    let rows = conn.execute(
        "UPDATE schedule_entries SET schedule_id = ?1, time_slot_id = ?2, class_id = ?3,
         subject_id = ?4, teacher_id = ?5, room_id = ?6, decision_log = ?7
         WHERE id = ?8",
        params![
            entry.schedule_id,
            entry.time_slot_id,
            entry.class_id,
            entry.subject_id,
            entry.teacher_id,
            entry.room_id,
            entry.decision_log.as_deref().unwrap_or("{}"),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Eintrag mit ID {} nicht gefunden", id)));
    }
    get_schedule_entry(conn, id)
}

pub fn swap_schedule_entries(conn: &Connection, id_a: i64, id_b: i64) -> Result<(ScheduleEntry, ScheduleEntry), AppError> {
    let slot_a: i64 = conn.query_row(
        "SELECT time_slot_id FROM schedule_entries WHERE id = ?1",
        [id_a],
        |row| row.get(0),
    ).map_err(|_| AppError::NotFound(format!("Eintrag mit ID {} nicht gefunden", id_a)))?;

    let slot_b: i64 = conn.query_row(
        "SELECT time_slot_id FROM schedule_entries WHERE id = ?1",
        [id_b],
        |row| row.get(0),
    ).map_err(|_| AppError::NotFound(format!("Eintrag mit ID {} nicht gefunden", id_b)))?;

    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "UPDATE schedule_entries SET time_slot_id = ?1 WHERE id = ?2",
        params![slot_b, id_a],
    )?;
    tx.execute(
        "UPDATE schedule_entries SET time_slot_id = ?1 WHERE id = ?2",
        params![slot_a, id_b],
    )?;
    tx.commit()?;

    let entry_a = get_schedule_entry(conn, id_a)?;
    let entry_b = get_schedule_entry(conn, id_b)?;
    Ok((entry_a, entry_b))
}

pub fn delete_schedule_entry(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM schedule_entries WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Eintrag mit ID {} nicht gefunden", id)));
    }
    Ok(())
}
