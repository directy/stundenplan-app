use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{Room, NewRoom};

#[tauri::command]
pub async fn create_room(
    db: State<'_, Mutex<Database>>,
    room: NewRoom,
) -> Result<Room, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rooms::create_room(&db.conn, &room).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_rooms(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<Room>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rooms::get_rooms(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_room(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<Room, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rooms::get_room(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_room(
    db: State<'_, Mutex<Database>>,
    id: i64,
    room: NewRoom,
) -> Result<Room, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rooms::update_room(&db.conn, id, &room).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_room(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rooms::delete_room(&db.conn, id).map_err(|e| e.to_string())
}
