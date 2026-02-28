use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{TimeSlot, NewTimeSlot};

pub fn create_time_slot(conn: &Connection, slot: &NewTimeSlot) -> Result<TimeSlot, AppError> {
    conn.execute(
        "INSERT INTO time_slots (day_of_week, period, start_time, end_time)
         VALUES (?1, ?2, ?3, ?4)",
        params![slot.day_of_week, slot.period, slot.start_time, slot.end_time],
    )?;
    get_time_slot(conn, conn.last_insert_rowid())
}

pub fn get_time_slots(conn: &Connection) -> Result<Vec<TimeSlot>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, day_of_week, period, start_time, end_time
         FROM time_slots ORDER BY day_of_week, period"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(TimeSlot {
            id: row.get(0)?,
            day_of_week: row.get(1)?,
            period: row.get(2)?,
            start_time: row.get(3)?,
            end_time: row.get(4)?,
        })
    })?;

    let mut slots = Vec::new();
    for row in rows {
        slots.push(row?);
    }
    Ok(slots)
}

pub fn get_time_slot(conn: &Connection, id: i64) -> Result<TimeSlot, AppError> {
    conn.query_row(
        "SELECT id, day_of_week, period, start_time, end_time
         FROM time_slots WHERE id = ?1",
        [id],
        |row| {
            Ok(TimeSlot {
                id: row.get(0)?,
                day_of_week: row.get(1)?,
                period: row.get(2)?,
                start_time: row.get(3)?,
                end_time: row.get(4)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Zeitslot mit ID {} nicht gefunden", id)))
}

pub fn delete_time_slot(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM time_slots WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Zeitslot mit ID {} nicht gefunden", id)));
    }
    Ok(())
}

/// Erstellt die 45 Standard-Zeitslots (5 Tage x 9 Stunden) mit deutschen Schulzeiten.
pub fn seed_default_time_slots(conn: &Connection) -> Result<(), AppError> {
    // Pruefen ob bereits Zeitslots vorhanden
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM time_slots", [], |row| row.get(0),
    )?;
    if count > 0 {
        return Ok(());
    }

    let periods = [
        (1, "07:45", "08:30"),
        (2, "08:35", "09:20"),
        (3, "09:35", "10:20"),
        (4, "10:25", "11:10"),
        (5, "11:25", "12:10"),
        (6, "12:15", "13:00"),
        (7, "13:45", "14:30"),
        (8, "14:35", "15:20"),
        (9, "15:25", "16:10"),
    ];

    for day in 1..=5 {
        for (period, start, end) in &periods {
            conn.execute(
                "INSERT INTO time_slots (day_of_week, period, start_time, end_time)
                 VALUES (?1, ?2, ?3, ?4)",
                params![day, period, start, end],
            )?;
        }
    }

    Ok(())
}
