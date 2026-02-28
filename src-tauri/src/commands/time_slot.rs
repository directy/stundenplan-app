use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::TimeSlot;

#[tauri::command]
pub async fn get_time_slots(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<TimeSlot>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::time_slots::get_time_slots(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn seed_default_time_slots(
    db: State<'_, Mutex<Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::time_slots::seed_default_time_slots(&db.conn).map_err(|e| e.to_string())
}
