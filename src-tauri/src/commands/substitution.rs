use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{SubstitutionRecord, NewSubstitutionRecord, SubstitutionCandidate, AffectedEntry};

#[tauri::command]
pub async fn create_substitution(
    db: State<'_, Mutex<Database>>,
    substitution: NewSubstitutionRecord,
) -> Result<SubstitutionRecord, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::substitutions::create_substitution(&db.conn, &substitution).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_substitutions(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<SubstitutionRecord>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::substitutions::get_substitutions(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_substitutions_by_date(
    db: State<'_, Mutex<Database>>,
    date: String,
) -> Result<Vec<SubstitutionRecord>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::substitutions::get_substitutions_by_date(&db.conn, &date).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_substitution_candidates(
    db: State<'_, Mutex<Database>>,
    entry_id: i64,
    date: String,
) -> Result<Vec<SubstitutionCandidate>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::substitution::get_substitution_candidates(&db.conn, entry_id, &date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_affected_entries(
    db: State<'_, Mutex<Database>>,
    schedule_id: i64,
    date: String,
) -> Result<Vec<AffectedEntry>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::substitution::get_affected_entries(&db.conn, schedule_id, &date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn check_holiday(
    db: State<'_, Mutex<Database>>,
    date: String,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::holidays::is_holiday(&db.conn, &date).map_err(|e| e.to_string())
}
