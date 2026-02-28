use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::SeedResult;

#[tauri::command]
pub async fn seed_example_data(
    db: State<'_, Mutex<Database>>,
    school_type: String,
) -> Result<SeedResult, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::seed::seed_example_data(&db.conn, &school_type).map_err(|e| e.to_string())
}
