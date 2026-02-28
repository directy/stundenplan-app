use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{ConstraintRule, NewConstraintRule, ConstraintOrderUpdate};

#[tauri::command]
pub async fn get_constraint_rules(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<ConstraintRule>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::constraints::get_constraint_rules(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_constraint_rule(
    db: State<'_, Mutex<Database>>,
    rule: NewConstraintRule,
) -> Result<ConstraintRule, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::constraints::create_constraint_rule(&db.conn, &rule).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_constraint_rule(
    db: State<'_, Mutex<Database>>,
    id: i64,
    rule: NewConstraintRule,
) -> Result<ConstraintRule, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::constraints::update_constraint_rule(&db.conn, id, &rule).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_constraint_rule(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::constraints::delete_constraint_rule(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_constraint_order(
    db: State<'_, Mutex<Database>>,
    updates: Vec<ConstraintOrderUpdate>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::constraints::update_constraint_order(&db.conn, &updates).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn seed_default_constraints(
    db: State<'_, Mutex<Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::constraints::seed_default_constraints(&db.conn).map_err(|e| e.to_string())
}
