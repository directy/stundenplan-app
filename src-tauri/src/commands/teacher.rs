use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{Teacher, NewTeacher, Subject};

#[tauri::command]
pub async fn create_teacher(
    db: State<'_, Mutex<Database>>,
    teacher: NewTeacher,
) -> Result<Teacher, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::teachers::create_teacher(&db.conn, &teacher).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_teachers(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<Teacher>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::teachers::get_teachers(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_teacher(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<Teacher, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::teachers::get_teacher(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_teacher(
    db: State<'_, Mutex<Database>>,
    id: i64,
    teacher: NewTeacher,
) -> Result<Teacher, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::teachers::update_teacher(&db.conn, id, &teacher).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_teacher(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::teachers::delete_teacher(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_teacher_subject(
    db: State<'_, Mutex<Database>>,
    teacher_id: i64,
    subject_id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::teacher_subjects::add_teacher_subject(&db.conn, teacher_id, subject_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_teacher_subject(
    db: State<'_, Mutex<Database>>,
    teacher_id: i64,
    subject_id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::teacher_subjects::remove_teacher_subject(&db.conn, teacher_id, subject_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_teacher_subjects(
    db: State<'_, Mutex<Database>>,
    teacher_id: i64,
) -> Result<Vec<Subject>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::teacher_subjects::get_subjects_for_teacher(&db.conn, teacher_id)
        .map_err(|e| e.to_string())
}
