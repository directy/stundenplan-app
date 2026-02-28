use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{SchoolClass, NewSchoolClass};

#[tauri::command]
pub async fn create_class(
    db: State<'_, Mutex<Database>>,
    class: NewSchoolClass,
) -> Result<SchoolClass, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::classes::create_class(&db.conn, &class).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_classes(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<SchoolClass>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::classes::get_classes(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_class(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<SchoolClass, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::classes::get_class(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_class(
    db: State<'_, Mutex<Database>>,
    id: i64,
    class: NewSchoolClass,
) -> Result<SchoolClass, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::classes::update_class(&db.conn, id, &class).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_class(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::classes::delete_class(&db.conn, id).map_err(|e| e.to_string())
}
