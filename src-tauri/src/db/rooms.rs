use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{Room, NewRoom};

pub fn create_room(conn: &Connection, room: &NewRoom) -> Result<Room, AppError> {
    conn.execute(
        "INSERT INTO rooms (name, room_type, capacity) VALUES (?1, ?2, ?3)",
        params![
            room.name,
            room.room_type.as_deref().unwrap_or("standard"),
            room.capacity.unwrap_or(30),
        ],
    )?;
    get_room(conn, conn.last_insert_rowid())
}

pub fn get_rooms(conn: &Connection) -> Result<Vec<Room>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, room_type, capacity FROM rooms ORDER BY name"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(Room {
            id: row.get(0)?,
            name: row.get(1)?,
            room_type: row.get(2)?,
            capacity: row.get(3)?,
        })
    })?;

    let mut rooms = Vec::new();
    for row in rows {
        rooms.push(row?);
    }
    Ok(rooms)
}

pub fn get_room(conn: &Connection, id: i64) -> Result<Room, AppError> {
    conn.query_row(
        "SELECT id, name, room_type, capacity FROM rooms WHERE id = ?1",
        [id],
        |row| {
            Ok(Room {
                id: row.get(0)?,
                name: row.get(1)?,
                room_type: row.get(2)?,
                capacity: row.get(3)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Raum mit ID {} nicht gefunden", id)))
}

pub fn update_room(conn: &Connection, id: i64, room: &NewRoom) -> Result<Room, AppError> {
    let rows = conn.execute(
        "UPDATE rooms SET name = ?1, room_type = ?2, capacity = ?3 WHERE id = ?4",
        params![
            room.name,
            room.room_type.as_deref().unwrap_or("standard"),
            room.capacity.unwrap_or(30),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Raum mit ID {} nicht gefunden", id)));
    }
    get_room(conn, id)
}

pub fn delete_room(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM rooms WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Raum mit ID {} nicht gefunden", id)));
    }
    Ok(())
}
