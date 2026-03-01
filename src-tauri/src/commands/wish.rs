use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{TeacherWish, NewTeacherWish};

#[tauri::command]
pub async fn create_teacher_wish(
    db: State<'_, Mutex<Database>>,
    wish: NewTeacherWish,
) -> Result<TeacherWish, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::wishes::create_wish(&db.conn, &wish).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_teacher_wishes(
    db: State<'_, Mutex<Database>>,
    teacher_id: i64,
) -> Result<Vec<TeacherWish>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::wishes::get_wishes_for_teacher(&db.conn, teacher_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_teacher_wish(
    db: State<'_, Mutex<Database>>,
    id: i64,
    wish: NewTeacherWish,
) -> Result<TeacherWish, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::wishes::update_wish(&db.conn, id, &wish).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_teacher_wish(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::wishes::delete_wish(&db.conn, id).map_err(|e| e.to_string())
}
