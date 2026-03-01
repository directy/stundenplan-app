use std::sync::Mutex;
use tauri::State;
use crate::db::connection::Database;
use crate::models::{Schedule, NewSchedule, ScheduleEntry, NewScheduleEntry};
use crate::solver::types::{GenerationResult, OptimizationResult, TabuSearchConfig};

#[tauri::command]
pub async fn create_schedule(
    db: State<'_, Mutex<Database>>,
    schedule: NewSchedule,
) -> Result<Schedule, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedules::create_schedule(&db.conn, &schedule).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_schedules(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<Schedule>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedules::get_schedules(&db.conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_schedule(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<Schedule, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedules::get_schedule(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_schedule(
    db: State<'_, Mutex<Database>>,
    id: i64,
    schedule: NewSchedule,
) -> Result<Schedule, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedules::update_schedule(&db.conn, id, &schedule).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_schedule(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedules::delete_schedule(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_schedule_entry(
    db: State<'_, Mutex<Database>>,
    entry: NewScheduleEntry,
) -> Result<ScheduleEntry, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedule_entries::create_schedule_entry(&db.conn, &entry).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_schedule_entries(
    db: State<'_, Mutex<Database>>,
    schedule_id: i64,
) -> Result<Vec<ScheduleEntry>, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedule_entries::get_schedule_entries(&db.conn, schedule_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_schedule_entry(
    db: State<'_, Mutex<Database>>,
    id: i64,
    entry: NewScheduleEntry,
) -> Result<ScheduleEntry, String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedule_entries::update_schedule_entry(&db.conn, id, &entry).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_schedule_entry(
    db: State<'_, Mutex<Database>>,
    id: i64,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedule_entries::delete_schedule_entry(&db.conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn swap_schedule_entries(
    db: State<'_, Mutex<Database>>,
    id_a: i64,
    id_b: i64,
) -> Result<(ScheduleEntry, ScheduleEntry), String> {
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::db::schedule_entries::swap_schedule_entries(&db.conn, id_a, id_b).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_schedule(
    db: State<'_, Mutex<Database>>,
    schedule_id: i64,
) -> Result<GenerationResult, String> {
    // Phase 1: Lock → Daten laden + alte Einträge löschen → Release
    let input = {
        let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
        crate::solver::greedy::load_greedy_input(&db.conn, schedule_id).map_err(|e| e.to_string())?
    };

    // Phase 2: Berechnung OHNE Lock (andere Commands können parallel laufen)
    let solution = crate::solver::greedy::solve_greedy(input);

    // Phase 3: Lock → Ergebnisse schreiben → Release
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    crate::solver::greedy::write_greedy_results(&db.conn, schedule_id, &solution).map_err(|e| e.to_string())?;

    Ok(GenerationResult {
        entries_created: solution.entries.len(),
        total_score: solution.total_score,
        average_score: solution.average_score,
        unplaced_tasks: solution.unplaced_tasks,
    })
}

#[tauri::command]
pub async fn optimize_schedule(
    db: State<'_, Mutex<Database>>,
    schedule_id: i64,
    config: Option<TabuSearchConfig>,
) -> Result<OptimizationResult, String> {
    // Phase 1: Lock → Daten laden → Release
    let input = {
        let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
        crate::solver::tabu_search::load_tabu_input(&db.conn, schedule_id).map_err(|e| e.to_string())?
    };

    // Phase 2: Tabu Search OHNE Lock (andere Commands können parallel laufen)
    let cfg = config.unwrap_or_default();
    let solution = crate::solver::tabu_search::solve_tabu(input, cfg);

    // Phase 3: Lock → Änderungen schreiben → Release
    let db = db.lock().map_err(|e| format!("Lock-Fehler: {}", e))?;
    let entries_modified = crate::solver::tabu_search::write_tabu_results(&db.conn, &solution).map_err(|e| e.to_string())?;

    let improvement = if solution.initial_score > 0.0 {
        ((solution.best_score - solution.initial_score) / solution.initial_score) * 100.0
    } else {
        0.0
    };

    Ok(OptimizationResult {
        initial_score: (solution.initial_score * 1000.0).round() / 1000.0,
        final_score: (solution.best_score * 1000.0).round() / 1000.0,
        improvement_percent: (improvement * 10.0).round() / 10.0,
        iterations_run: solution.iterations_run,
        moves_applied: solution.moves_applied,
        entries_modified,
    })
}
