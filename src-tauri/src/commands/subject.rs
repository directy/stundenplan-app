use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{Subject, NewSubject};

#[tauri::command]
pub async fn create_subject(
    db: State<'_, Mutex<Database>>,
    subject: NewSubject,
) -> Result<Subject, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::subjects::create_subject(&db.conn, &subject).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_subjects(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<Subject>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::subjects::get_subjects(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_subject(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<Subject, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::subjects::get_subject(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_subject(
    db: State<'_, Mutex<Database>>,
    id: i64,
    subject: NewSubject,
) -> Result<Subject, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::subjects::update_subject(&db.conn, id, &subject).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_subject(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::subjects::delete_subject(&db.conn, id).map_err(|e| e.to_string())
}
