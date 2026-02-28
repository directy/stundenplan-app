use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::ScheduleReport;

#[tauri::command]
pub async fn get_schedule_report(
    db: State<'_, Mutex<Database>>,
    schedule_id: i64,
) -> Result<ScheduleReport, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::reports::generate_schedule_report(&db.conn, schedule_id).map_err(|e| e.to_string())
}
