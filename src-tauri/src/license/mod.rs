pub mod state;

use std::path::{Path, PathBuf};

use license_core::{verify_license, SignedLicense};

pub use state::LicenseStatus;

/// Hard-coded Ed25519 public key (Base64).
/// Generated with: license-gen generate-keypair
const PUBLIC_KEY_B64: &str = "wzKM+ailEnh4gqjoQlcMM6kV20TlCLAZmBmiQTWKHfY=";

const LICENSE_FILENAME: &str = "license.lic";

/// Determine where the license file should live on this OS.
///
/// Priority:
/// 1. `<app_config_dir>/license.lic`
/// 2. Next to the executable (fallback)
pub fn locate_license_path(app: &tauri::AppHandle) -> PathBuf {
    use tauri::Manager;

    // Try app config dir first
    if let Ok(config_dir) = app.path().app_config_dir() {
        return config_dir.join(LICENSE_FILENAME);
    }

    // Fallback: next to the executable
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            return dir.join(LICENSE_FILENAME);
        }
    }

    // Last resort
    PathBuf::from(LICENSE_FILENAME)
}

/// Load a `.lic` file and validate it against the embedded public key.
pub fn load_and_validate(path: &Path) -> LicenseStatus {
    // Read file
    let json_str = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(_) => {
            return LicenseStatus::missing("Keine Lizenzdatei gefunden");
        }
    };

    // Parse as SignedLicense
    let signed: SignedLicense = match serde_json::from_str(&json_str) {
        Ok(l) => l,
        Err(e) => {
            return LicenseStatus::missing(&format!("Lizenzdatei ungültig: {}", e));
        }
    };

    // Verify signature and decode payload
    match verify_license(&signed, PUBLIC_KEY_B64) {
        Ok(payload) => LicenseStatus {
            valid: true,
            reason: "Lizenz gültig".to_string(),
            licensee_name: payload.licensee_name,
            licensee_email: payload.licensee_email,
            license_type: format!("{:?}", payload.license_type),
            features: payload.features,
            expires_at: payload.expires_at,
            max_version: payload.max_version,
        },
        Err(e) => LicenseStatus {
            valid: false,
            reason: format!("{}", e),
            licensee_name: String::new(),
            licensee_email: String::new(),
            license_type: String::new(),
            features: Vec::new(),
            expires_at: None,
            max_version: None,
        },
    }
}

/// Copy a license file from `source` to `target`.
pub fn import_license(source: &Path, target: &Path) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Verzeichnis konnte nicht erstellt werden: {}", e))?;
    }

    std::fs::copy(source, target)
        .map_err(|e| format!("Lizenzdatei konnte nicht kopiert werden: {}", e))?;

    Ok(())
}
