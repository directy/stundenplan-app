//! Stundenplan License Core
//!
//! Ed25519-signed license verification for the `.lic` format.
//! The `.lic` file contains a JSON object with two fields:
//! `payload` (Base64-encoded JSON) and `signature`
//! (Base64-encoded Ed25519 signature over the payload string).

use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use chrono::{DateTime, Utc};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

/// The `.lic` file format: Base64-encoded payload + Base64-encoded signature.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedLicense {
    pub payload: String,
    pub signature: String,
}

/// The decoded license payload (inside `SignedLicense.payload`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicensePayload {
    pub license_id: String,
    pub product_id: String,
    pub licensee_name: String,
    pub licensee_email: String,
    pub license_type: LicenseType,
    pub issued_at: String,
    pub expires_at: Option<String>,
    pub features: Vec<String>,
    pub max_version: Option<String>,
    pub machine_fingerprint: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LicenseType {
    Trial,
    Standard,
    Professional,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[derive(Debug)]
pub enum LicenseError {
    InvalidSignature,
    Expired { expires_at: String },
    InvalidFormat(String),
}

impl std::fmt::Display for LicenseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidSignature => write!(f, "Signaturpruefung fehlgeschlagen"),
            Self::Expired { expires_at } => {
                write!(f, "Lizenz abgelaufen am {}", expires_at)
            }
            Self::InvalidFormat(msg) => write!(f, "Ungueltiges Lizenzformat: {}", msg),
        }
    }
}

impl std::error::Error for LicenseError {}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/// Verify a `.lic` file and return the decoded payload.
///
/// 1. Decode the public key from Base64
/// 2. Decode the signature from Base64
/// 3. Verify Ed25519 signature over `signed.payload.as_bytes()`
/// 4. Decode payload from Base64 → JSON → `LicensePayload`
/// 5. Check expiry date
pub fn verify_license(
    signed: &SignedLicense,
    public_key_b64: &str,
) -> Result<LicensePayload, LicenseError> {
    // Decode public key
    let pk_bytes = BASE64_STANDARD
        .decode(public_key_b64)
        .map_err(|e| LicenseError::InvalidFormat(format!("Public Key Base64: {}", e)))?;
    let pk_arr: [u8; 32] = pk_bytes
        .try_into()
        .map_err(|_| LicenseError::InvalidFormat("Public Key muss 32 Bytes sein".into()))?;
    let verifying_key = VerifyingKey::from_bytes(&pk_arr)
        .map_err(|e| LicenseError::InvalidFormat(format!("Public Key ungueltig: {}", e)))?;

    // Decode signature
    let sig_bytes = BASE64_STANDARD
        .decode(&signed.signature)
        .map_err(|e| LicenseError::InvalidFormat(format!("Signatur Base64: {}", e)))?;
    let sig = Signature::from_slice(&sig_bytes)
        .map_err(|_| LicenseError::InvalidFormat("Signatur muss 64 Bytes sein".into()))?;

    // Verify signature over the raw payload string
    verifying_key
        .verify(signed.payload.as_bytes(), &sig)
        .map_err(|_| LicenseError::InvalidSignature)?;

    // Decode payload: Base64 → JSON → LicensePayload
    let payload_json = BASE64_STANDARD
        .decode(&signed.payload)
        .map_err(|e| LicenseError::InvalidFormat(format!("Payload Base64: {}", e)))?;
    let payload: LicensePayload = serde_json::from_slice(&payload_json)
        .map_err(|e| LicenseError::InvalidFormat(format!("Payload JSON: {}", e)))?;

    // Expiry check
    if let Some(ref exp_str) = payload.expires_at {
        let expires = exp_str
            .parse::<DateTime<Utc>>()
            .map_err(|e| LicenseError::InvalidFormat(format!("Ablaufdatum: {}", e)))?;
        if Utc::now() > expires {
            return Err(LicenseError::Expired {
                expires_at: exp_str.clone(),
            });
        }
    }

    Ok(payload)
}

// ---------------------------------------------------------------------------
// Signing (for the license generator)
// ---------------------------------------------------------------------------

/// Sign a `LicensePayload` and produce a `SignedLicense`.
///
/// 1. Serialize payload to JSON
/// 2. Base64-encode → `payload_b64`
/// 3. Ed25519 sign over `payload_b64.as_bytes()`
/// 4. Base64-encode signature
pub fn sign_license(payload: &LicensePayload, signing_key: &SigningKey) -> SignedLicense {
    let json = serde_json::to_vec(payload).expect("Payload must be serializable");
    let payload_b64 = BASE64_STANDARD.encode(&json);
    let sig = signing_key.sign(payload_b64.as_bytes());
    let sig_b64 = BASE64_STANDARD.encode(sig.to_bytes());
    SignedLicense {
        payload: payload_b64,
        signature: sig_b64,
    }
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/// Generate a fresh Ed25519 keypair.
pub fn generate_keypair() -> (SigningKey, VerifyingKey) {
    let mut rng = rand::thread_rng();
    let signing = SigningKey::generate(&mut rng);
    let verifying = signing.verifying_key();
    (signing, verifying)
}

/// Encode a verifying key as Base64.
pub fn verifying_key_to_base64(vk: &VerifyingKey) -> String {
    BASE64_STANDARD.encode(vk.as_bytes())
}

/// Reconstruct a SigningKey from raw bytes.
pub fn signing_key_from_bytes(bytes: &[u8]) -> Result<SigningKey, String> {
    let arr: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "Private Key muss 32 Bytes sein".to_string())?;
    Ok(SigningKey::from_bytes(&arr))
}

/// Reconstruct a VerifyingKey from raw bytes.
pub fn verifying_key_from_bytes(bytes: &[u8]) -> Result<VerifyingKey, String> {
    let arr: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "Public Key muss 32 Bytes sein".to_string())?;
    VerifyingKey::from_bytes(&arr).map_err(|e| format!("Public Key ungueltig: {}", e))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_payload() -> LicensePayload {
        LicensePayload {
            license_id: "550e8400-e29b-41d4-a716-446655440000".into(),
            product_id: "stundenplan".into(),
            licensee_name: "Max Mustermann".into(),
            licensee_email: "kontakt@mustermann.de".into(),
            license_type: LicenseType::Standard,
            issued_at: "2026-02-28T10:00:00Z".into(),
            expires_at: None,
            features: vec!["all".into()],
            max_version: None,
            machine_fingerprint: None,
            metadata: HashMap::new(),
        }
    }

    #[test]
    fn sign_verify_roundtrip() {
        let (sk, vk) = generate_keypair();
        let payload = sample_payload();
        let signed = sign_license(&payload, &sk);
        let pk_b64 = verifying_key_to_base64(&vk);

        let decoded = verify_license(&signed, &pk_b64).unwrap();
        assert_eq!(decoded.license_id, payload.license_id);
        assert_eq!(decoded.licensee_name, payload.licensee_name);
        assert_eq!(decoded.license_type, LicenseType::Standard);
        assert_eq!(decoded.features, payload.features);
    }

    #[test]
    fn tamper_payload_fails() {
        let (sk, vk) = generate_keypair();
        let payload = sample_payload();
        let mut signed = sign_license(&payload, &sk);
        let pk_b64 = verifying_key_to_base64(&vk);

        signed.payload = BASE64_STANDARD.encode(b"{\"tampered\":true}");
        let result = verify_license(&signed, &pk_b64);
        assert!(matches!(result, Err(LicenseError::InvalidSignature)));
    }

    #[test]
    fn wrong_key_fails() {
        let (sk, _) = generate_keypair();
        let (_, other_vk) = generate_keypair();
        let payload = sample_payload();
        let signed = sign_license(&payload, &sk);
        let other_pk_b64 = verifying_key_to_base64(&other_vk);

        let result = verify_license(&signed, &other_pk_b64);
        assert!(matches!(result, Err(LicenseError::InvalidSignature)));
    }

    #[test]
    fn expiry_future_valid() {
        let (sk, vk) = generate_keypair();
        let mut payload = sample_payload();
        payload.expires_at = Some("2099-12-31T23:59:59Z".into());
        let signed = sign_license(&payload, &sk);
        let pk_b64 = verifying_key_to_base64(&vk);

        assert!(verify_license(&signed, &pk_b64).is_ok());
    }

    #[test]
    fn expiry_past_fails() {
        let (sk, vk) = generate_keypair();
        let mut payload = sample_payload();
        payload.expires_at = Some("2020-01-01T00:00:00Z".into());
        let signed = sign_license(&payload, &sk);
        let pk_b64 = verifying_key_to_base64(&vk);

        let result = verify_license(&signed, &pk_b64);
        assert!(matches!(result, Err(LicenseError::Expired { .. })));
    }

    #[test]
    fn no_expiry_always_valid() {
        let (sk, vk) = generate_keypair();
        let mut payload = sample_payload();
        payload.expires_at = None;
        let signed = sign_license(&payload, &sk);
        let pk_b64 = verifying_key_to_base64(&vk);

        assert!(verify_license(&signed, &pk_b64).is_ok());
    }

    #[test]
    fn license_type_serialization() {
        let (sk, vk) = generate_keypair();
        let pk_b64 = verifying_key_to_base64(&vk);

        for lt in [LicenseType::Trial, LicenseType::Standard, LicenseType::Professional] {
            let mut payload = sample_payload();
            payload.license_type = lt.clone();
            let signed = sign_license(&payload, &sk);
            let decoded = verify_license(&signed, &pk_b64).unwrap();
            assert_eq!(decoded.license_type, lt);
        }
    }
}
