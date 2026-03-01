pub mod error;
pub mod models;
pub mod db;
pub mod commands;
pub mod solver;
pub mod substitution;
pub mod license;

use std::sync::Mutex;
use tauri::Manager;
use db::connection::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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

            // License validation
            let license_path = license::locate_license_path(app.handle());
            let license_status = license::load_and_validate(&license_path);
            app.manage(Mutex::new(license_status));

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
            commands::schedule::swap_schedule_entries,
            commands::schedule::generate_schedule,
            commands::schedule::optimize_schedule,
            // Constraints
            commands::constraint::get_constraint_rules,
            commands::constraint::create_constraint_rule,
            commands::constraint::update_constraint_rule,
            commands::constraint::delete_constraint_rule,
            commands::constraint::update_constraint_order,
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
            commands::substitution::get_substitution_candidates,
            commands::substitution::get_affected_entries,
            commands::substitution::check_holiday,
            // Holidays
            commands::holiday::import_holidays,
            commands::holiday::get_holidays,
            commands::holiday::delete_all_holidays,
            // Absences
            commands::absence::create_absence,
            commands::absence::get_absences,
            commands::absence::get_teacher_absences,
            commands::absence::update_absence,
            commands::absence::delete_absence,
            // Reports
            commands::report::get_schedule_report,
            // Seed
            commands::seed::seed_example_data,
            // Rewards
            commands::reward::create_reward_point,
            commands::reward::get_reward_points,
            commands::reward::delete_reward_point,
            commands::reward::get_teacher_rankings,
            // Wishes
            commands::wish::create_teacher_wish,
            commands::wish::get_teacher_wishes,
            commands::wish::update_teacher_wish,
            commands::wish::delete_teacher_wish,
            // License
            commands::license::get_license_status,
            commands::license::import_license_file,
            // Settings
            commands::setting::get_all_settings,
            commands::setting::set_setting,
            // Class Subjects (Stundentafel)
            commands::class_subject::get_all_class_subjects,
            commands::class_subject::get_class_subjects_for_class,
            commands::class_subject::upsert_class_subject,
            commands::class_subject::batch_upsert_class_subjects,
            commands::class_subject::delete_class_subject,
            // Teacher-Class Restrictions
            commands::teacher_class::get_teacher_class_restrictions,
            commands::teacher_class::get_all_teacher_class_restrictions,
            commands::teacher_class::create_teacher_class_restriction,
            commands::teacher_class::update_teacher_class_restriction,
            commands::teacher_class::delete_teacher_class_restriction,
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}
