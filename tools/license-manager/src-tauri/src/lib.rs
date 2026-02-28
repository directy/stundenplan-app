use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use license_core::{
    generate_keypair, sign_license, signing_key_from_bytes, verify_license,
    verifying_key_from_bytes, verifying_key_to_base64, LicensePayload, LicenseType,
    SignedLicense,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct KeypairResult {
    private_path: String,
    public_path: String,
    public_key_b64: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LoadKeyResult {
    public_key_b64: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SignResult {
    lic_path: String,
    licensee_name: String,
    license_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VerifyResult {
    valid: bool,
    error: Option<String>,
    license_id: Option<String>,
    licensee_name: Option<String>,
    licensee_email: Option<String>,
    license_type: Option<String>,
    product_id: Option<String>,
    issued_at: Option<String>,
    expires_at: Option<String>,
    features: Option<Vec<String>>,
    max_version: Option<String>,
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LicenseFormData {
    license_id: String,
    product_id: String,
    licensee_name: String,
    licensee_email: String,
    license_type: String,
    issued_at: String,
    expires_at: Option<String>,
    features: String,
    max_version: Option<String>,
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn cmd_generate_keypair(output_dir: String) -> Result<KeypairResult, String> {
    let dir = PathBuf::from(&output_dir);
    fs::create_dir_all(&dir).map_err(|e| format!("Verzeichnis-Fehler: {}", e))?;

    let (sk, vk) = generate_keypair();

    let sk_path = dir.join("private.key");
    let vk_path = dir.join("public.key");

    fs::write(&sk_path, BASE64_STANDARD.encode(sk.to_bytes()))
        .map_err(|e| format!("Private Key schreiben: {}", e))?;
    fs::write(&vk_path, BASE64_STANDARD.encode(vk.to_bytes()))
        .map_err(|e| format!("Public Key schreiben: {}", e))?;

    Ok(KeypairResult {
        private_path: sk_path.to_string_lossy().to_string(),
        public_path: vk_path.to_string_lossy().to_string(),
        public_key_b64: verifying_key_to_base64(&vk),
    })
}

#[tauri::command]
async fn cmd_load_private_key(path: String) -> Result<LoadKeyResult, String> {
    let key_b64 = fs::read_to_string(&path).map_err(|e| format!("Datei lesen: {}", e))?;
    let key_bytes = BASE64_STANDARD
        .decode(key_b64.trim())
        .map_err(|e| format!("Base64 ungueltig: {}", e))?;
    let sk = signing_key_from_bytes(&key_bytes)?;
    let vk = sk.verifying_key();

    Ok(LoadKeyResult {
        public_key_b64: verifying_key_to_base64(&vk),
    })
}

#[tauri::command]
async fn cmd_sign_license(
    key_path: String,
    form_data: LicenseFormData,
    output_path: String,
) -> Result<SignResult, String> {
    // Load private key
    let key_b64 = fs::read_to_string(&key_path).map_err(|e| format!("Key lesen: {}", e))?;
    let key_bytes = BASE64_STANDARD
        .decode(key_b64.trim())
        .map_err(|e| format!("Base64 ungueltig: {}", e))?;
    let sk = signing_key_from_bytes(&key_bytes)?;

    // Parse license type
    let license_type = match form_data.license_type.as_str() {
        "trial" => LicenseType::Trial,
        "standard" => LicenseType::Standard,
        "professional" => LicenseType::Professional,
        other => return Err(format!("Unbekannter Lizenztyp: {}", other)),
    };

    // Parse features
    let features: Vec<String> = form_data
        .features
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    // Build payload
    let payload = LicensePayload {
        license_id: form_data.license_id,
        product_id: form_data.product_id,
        licensee_name: form_data.licensee_name.clone(),
        licensee_email: form_data.licensee_email,
        license_type: license_type.clone(),
        issued_at: form_data.issued_at,
        expires_at: form_data.expires_at.filter(|s| !s.is_empty()),
        features,
        max_version: form_data.max_version.filter(|s| !s.is_empty()),
        machine_fingerprint: None,
        metadata: HashMap::new(),
    };

    // Sign
    let signed = sign_license(&payload, &sk);

    // Write .lic file
    let json = serde_json::to_string_pretty(&signed)
        .map_err(|e| format!("JSON-Fehler: {}", e))?;
    fs::write(&output_path, json).map_err(|e| format!("Datei schreiben: {}", e))?;

    Ok(SignResult {
        lic_path: output_path,
        licensee_name: form_data.licensee_name,
        license_type: format!("{:?}", license_type),
    })
}

#[tauri::command]
async fn cmd_verify_license(pubkey_path: String, lic_path: String) -> Result<VerifyResult, String> {
    // Load public key
    let pk_b64 = fs::read_to_string(&pubkey_path).map_err(|e| format!("Key lesen: {}", e))?;
    let pk_bytes = BASE64_STANDARD
        .decode(pk_b64.trim())
        .map_err(|e| format!("Base64 ungueltig: {}", e))?;
    let vk = verifying_key_from_bytes(&pk_bytes)?;
    let pk_b64_str = verifying_key_to_base64(&vk);

    // Load signed license
    let json_str = fs::read_to_string(&lic_path).map_err(|e| format!("Datei lesen: {}", e))?;
    let signed: SignedLicense =
        serde_json::from_str(&json_str).map_err(|e| format!("JSON ungueltig: {}", e))?;

    // Verify
    match verify_license(&signed, &pk_b64_str) {
        Ok(payload) => Ok(VerifyResult {
            valid: true,
            error: None,
            license_id: Some(payload.license_id),
            licensee_name: Some(payload.licensee_name),
            licensee_email: Some(payload.licensee_email),
            license_type: Some(format!("{:?}", payload.license_type)),
            product_id: Some(payload.product_id),
            issued_at: Some(payload.issued_at),
            expires_at: payload.expires_at,
            features: Some(payload.features),
            max_version: payload.max_version,
        }),
        Err(e) => Ok(VerifyResult {
            valid: false,
            error: Some(format!("{}", e)),
            license_id: None,
            licensee_name: None,
            licensee_email: None,
            license_type: None,
            product_id: None,
            issued_at: None,
            expires_at: None,
            features: None,
            max_version: None,
        }),
    }
}

// ---------------------------------------------------------------------------
// App entry
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            cmd_generate_keypair,
            cmd_load_private_key,
            cmd_sign_license,
            cmd_verify_license,
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}
