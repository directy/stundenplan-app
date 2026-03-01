use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::db;
use crate::models::{ClassSubject, NewClassSubject};

#[tauri::command]
pub fn get_all_class_subjects(database: State<Mutex<Database>>) -> Result<Vec<ClassSubject>, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::class_subjects::get_all_class_subjects(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_class_subjects_for_class(class_id: i64, database: State<Mutex<Database>>) -> Result<Vec<ClassSubject>, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::class_subjects::get_class_subjects_for_class(&db.conn, class_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_class_subject(data: NewClassSubject, database: State<Mutex<Database>>) -> Result<ClassSubject, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::class_subjects::upsert_class_subject(&db.conn, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn batch_upsert_class_subjects(entries: Vec<NewClassSubject>, database: State<Mutex<Database>>) -> Result<Vec<ClassSubject>, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::class_subjects::batch_upsert_class_subjects(&db.conn, &entries).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_class_subject(class_id: i64, subject_id: i64, database: State<Mutex<Database>>) -> Result<(), String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::class_subjects::delete_class_subject(&db.conn, class_id, subject_id).map_err(|e| e.to_string())
}
