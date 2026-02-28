use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{Holiday, HolidayImportData};

#[tauri::command]
pub async fn import_holidays(
    db: State<'_, Mutex<Database>>,
    data: HolidayImportData,
) -> Result<Vec<Holiday>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::holidays::import_holidays(&db.conn, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_holidays(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<Holiday>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::holidays::get_holidays(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_all_holidays(
    db: State<'_, Mutex<Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::holidays::delete_all_holidays(&db.conn).map_err(|e| e.to_string())
}
