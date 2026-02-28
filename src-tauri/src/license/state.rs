use serde::Serialize;

/// License validation status exposed to the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub valid: bool,
    pub reason: String,
    pub licensee_name: String,
    pub licensee_email: String,
    pub license_type: String,
    pub features: Vec<String>,
    pub expires_at: Option<String>,
    pub max_version: Option<String>,
}

impl LicenseStatus {
    /// Status when no license file exists or cannot be read.
    pub fn missing(reason: &str) -> Self {
        Self {
            valid: false,
            reason: reason.to_string(),
            licensee_name: String::new(),
            licensee_email: String::new(),
            license_type: String::new(),
            features: Vec::new(),
            expires_at: None,
            max_version: None,
        }
    }
}
