pub mod error;
pub mod models;
pub mod db;
pub mod commands;
pub mod solver;
pub mod substitution;

use std::sync::Mutex;
use tauri::Manager;
use db::connection::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .map_err(|e| format!("App-Datenverzeichnis nicht gefunden: {}", e))?;
            std::fs::create_dir_all(&app_data_dir)
                .map_err(|e| format!("Verzeichnis konnte nicht erstellt werden: {}", e))?;

            let db_path = app_data_dir.join("stundenplan.db");
            let database = Database::new(&db_path)
                .map_err(|e| format!("Datenbank-Initialisierung fehlgeschlagen: {}", e))?;

            // Seed-Daten beim ersten Start
            db::time_slots::seed_default_time_slots(&database.conn)
                .map_err(|e| format!("Zeitslot-Seed fehlgeschlagen: {}", e))?;
            db::constraints::seed_default_constraints(&database.conn)
                .map_err(|e| format!("Constraint-Seed fehlgeschlagen: {}", e))?;

            app.manage(Mutex::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Teachers
            commands::teacher::create_teacher,
            commands::teacher::get_teachers,
            commands::teacher::get_teacher,
            commands::teacher::update_teacher,
            commands::teacher::delete_teacher,
            commands::teacher::add_teacher_subject,
            commands::teacher::remove_teacher_subject,
            commands::teacher::get_teacher_subjects,
            // Subjects
            commands::subject::create_subject,
            commands::subject::get_subjects,
            commands::subject::get_subject,
            commands::subject::update_subject,
            commands::subject::delete_subject,
            // Classes
            commands::class::create_class,
            commands::class::get_classes,
            commands::class::get_class,
            commands::class::update_class,
            commands::class::delete_class,
            // Rooms
            commands::room::create_room,
            commands::room::get_rooms,
            commands::room::get_room,
            commands::room::update_room,
            commands::room::delete_room,
            // Time Slots
            commands::time_slot::get_time_slots,
            commands::time_slot::seed_default_time_slots,
            // Schedules
            commands::schedule::create_schedule,
            commands::schedule::get_schedules,
            commands::schedule::get_schedule,
            commands::schedule::update_schedule,
            commands::schedule::delete_schedule,
            commands::schedule::create_schedule_entry,
            commands::schedule::get_schedule_entries,
            commands::schedule::update_schedule_entry,
            commands::schedule::delete_schedule_entry,
            commands::schedule::generate_schedule,
            // Constraints
            commands::constraint::get_constraint_rules,
            commands::constraint::create_constraint_rule,
            commands::constraint::update_constraint_rule,
            commands::constraint::seed_default_constraints,
            // Preferences
            commands::preference::create_preference,
            commands::preference::get_teacher_preferences,
            commands::preference::update_preference,
            commands::preference::delete_preference,
            // Substitutions
            commands::substitution::create_substitution,
            commands::substitution::get_substitutions,
            commands::substitution::get_substitutions_by_date,
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}
