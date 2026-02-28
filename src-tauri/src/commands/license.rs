use std::sync::Mutex;
use tauri::State;

use crate::license::{self, LicenseStatus};

/// Get the current license validation status.
#[tauri::command]
pub async fn get_license_status(
    status: State<'_, Mutex<LicenseStatus>>,
) -> Result<LicenseStatus, String> {
    Ok(status
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?
        .clone())
}

/// Import a license file and re-validate.
#[tauri::command]
pub async fn import_license_file(
    app: tauri::AppHandle,
    path: String,
    status: State<'_, Mutex<LicenseStatus>>,
) -> Result<LicenseStatus, String> {
    let target = license::locate_license_path(&app);
    license::import_license(std::path::Path::new(&path), &target)?;
    let new_status = license::load_and_validate(&target);
    *status.lock().map_err(|e| format!("Lock error: {}", e))? = new_status.clone();
    Ok(new_status)
}
