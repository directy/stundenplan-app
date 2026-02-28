use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{TeacherAbsence, NewTeacherAbsence};

#[tauri::command]
pub async fn create_absence(
    db: State<'_, Mutex<Database>>,
    absence: NewTeacherAbsence,
) -> Result<TeacherAbsence, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::absences::create_absence(&db.conn, &absence).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_absences(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<TeacherAbsence>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::absences::get_absences(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_teacher_absences(
    db: State<'_, Mutex<Database>>,
    teacher_id: i64,
) -> Result<Vec<TeacherAbsence>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::absences::get_absences_for_teacher(&db.conn, teacher_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_absence(
    db: State<'_, Mutex<Database>>,
    id: i64,
    absence: NewTeacherAbsence,
) -> Result<TeacherAbsence, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::absences::update_absence(&db.conn, id, &absence).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_absence(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::absences::delete_absence(&db.conn, id).map_err(|e| e.to_string())
}
