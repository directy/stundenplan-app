use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{TeacherPreference, NewTeacherPreference};

#[tauri::command]
pub async fn create_preference(
    db: State<'_, Mutex<Database>>,
    preference: NewTeacherPreference,
) -> Result<TeacherPreference, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::preferences::create_preference(&db.conn, &preference).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_teacher_preferences(
    db: State<'_, Mutex<Database>>,
    teacher_id: i64,
) -> Result<Vec<TeacherPreference>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::preferences::get_preferences_for_teacher(&db.conn, teacher_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_preference(
    db: State<'_, Mutex<Database>>,
    id: i64,
    preference: NewTeacherPreference,
) -> Result<TeacherPreference, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::preferences::update_preference(&db.conn, id, &preference).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_preference(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::preferences::delete_preference(&db.conn, id).map_err(|e| e.to_string())
}
