use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::db;
use crate::models::{TeacherClassRestriction, NewTeacherClassRestriction};

#[tauri::command]
pub fn get_teacher_class_restrictions(teacher_id: i64, database: State<Mutex<Database>>) -> Result<Vec<TeacherClassRestriction>, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::teacher_classes::get_restrictions_for_teacher(&db.conn, teacher_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_teacher_class_restrictions(database: State<Mutex<Database>>) -> Result<Vec<TeacherClassRestriction>, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::teacher_classes::get_all_restrictions(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_teacher_class_restriction(data: NewTeacherClassRestriction, database: State<Mutex<Database>>) -> Result<TeacherClassRestriction, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::teacher_classes::create_restriction(&db.conn, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_teacher_class_restriction(id: i64, restriction_type: String, database: State<Mutex<Database>>) -> Result<TeacherClassRestriction, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::teacher_classes::update_restriction(&db.conn, id, &restriction_type).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_teacher_class_restriction(id: i64, database: State<Mutex<Database>>) -> Result<(), String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::teacher_classes::delete_restriction(&db.conn, id).map_err(|e| e.to_string())
}
