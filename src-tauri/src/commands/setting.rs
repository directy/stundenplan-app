use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::db;
use crate::models::AppSetting;

#[tauri::command]
pub async fn get_all_settings(database: State<'_, Mutex<Database>>) -> Result<Vec<AppSetting>, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::settings::get_all_settings(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_setting(key: String, value: String, database: State<'_, Mutex<Database>>) -> Result<AppSetting, String> {
    let db = database.lock().map_err(|e| e.to_string())?;
    db::settings::set_setting(&db.conn, &key, &value).map_err(|e| e.to_string())
}
