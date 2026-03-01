use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{RewardPoint, NewRewardPoint, TeacherRanking};

#[tauri::command]
pub async fn create_reward_point(
    db: State<'_, Mutex<Database>>,
    reward: NewRewardPoint,
) -> Result<RewardPoint, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rewards::create_reward_point(&db.conn, &reward).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_reward_points(
    db: State<'_, Mutex<Database>>,
    teacher_id: i64,
) -> Result<Vec<RewardPoint>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rewards::get_reward_points_for_teacher(&db.conn, teacher_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_reward_point(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rewards::delete_reward_point(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_teacher_rankings(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<TeacherRanking>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::rewards::get_teacher_rankings(&db.conn).map_err(|e| e.to_string())
}
