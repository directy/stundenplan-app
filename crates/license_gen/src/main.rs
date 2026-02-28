//! Stundenplan License Generator CLI
//!
//! Subcommands:
//! - `generate-keypair`  — create Ed25519 keypair files
//! - `sign-license`      — sign a JSON license payload and produce a .lic file
//! - `verify-license`    — verify a signed .lic file

use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use clap::{Parser, Subcommand};
use license_core::{
    generate_keypair, sign_license, signing_key_from_bytes, verify_license,
    verifying_key_from_bytes, LicensePayload, SignedLicense,
};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "license-gen", about = "Stundenplan License Generator")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate a new Ed25519 keypair (private.key + public.key)
    GenerateKeypair {
        /// Output directory (default: current directory)
        #[arg(short, long, default_value = ".")]
        output: PathBuf,
    },
    /// Sign a license JSON file and produce a .lic file
    SignLicense {
        /// Path to the private key file (Base64)
        #[arg(short, long)]
        key: PathBuf,
        /// Path to the unsigned license JSON (LicensePayload)
        #[arg(short, long)]
        input: PathBuf,
        /// Output path for the signed .lic file
        #[arg(short, long)]
        output: PathBuf,
    },
    /// Verify a signed .lic file
    VerifyLicense {
        /// Path to the public key file (Base64)
        #[arg(short, long)]
        pubkey: PathBuf,
        /// Path to the signed .lic file
        #[arg(short, long)]
        input: PathBuf,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::GenerateKeypair { output } => cmd_generate_keypair(&output),
        Commands::SignLicense { key, input, output } => cmd_sign(&key, &input, &output),
        Commands::VerifyLicense { pubkey, input } => cmd_verify(&pubkey, &input),
    }
}

fn cmd_generate_keypair(dir: &PathBuf) {
    fs::create_dir_all(dir).expect("Failed to create output directory");

    let (sk, vk) = generate_keypair();

    let sk_path = dir.join("private.key");
    let vk_path = dir.join("public.key");

    fs::write(&sk_path, BASE64_STANDARD.encode(sk.to_bytes()))
        .expect("Failed to write private key");
    fs::write(&vk_path, BASE64_STANDARD.encode(vk.to_bytes()))
        .expect("Failed to write public key");

    println!("Keypair generated:");
    println!("  Private key: {}", sk_path.display());
    println!("  Public key:  {}", vk_path.display());
    println!();
    println!("Public key (Base64 — embed in app):");
    println!("  {}", BASE64_STANDARD.encode(vk.to_bytes()));
}

fn cmd_sign(key_path: &PathBuf, input_path: &PathBuf, output_path: &PathBuf) {
    let key_b64 = fs::read_to_string(key_path).expect("Failed to read private key file");
    let key_bytes = BASE64_STANDARD
        .decode(key_b64.trim())
        .expect("Private key is not valid Base64");
    let sk = signing_key_from_bytes(&key_bytes).expect("Invalid private key");

    let json_str = fs::read_to_string(input_path).expect("Failed to read license file");
    let payload: LicensePayload =
        serde_json::from_str(&json_str).expect("Failed to parse license JSON");

    let signed = sign_license(&payload, &sk);

    let signed_json =
        serde_json::to_string_pretty(&signed).expect("Failed to serialize signed license");
    fs::write(output_path, &signed_json).expect("Failed to write signed license");

    println!("License signed successfully: {}", output_path.display());
    println!("  Licensee: {}", payload.licensee_name);
    println!("  Type:     {:?}", payload.license_type);
    println!(
        "  Expires:  {}",
        payload.expires_at.as_deref().unwrap_or("unlimited")
    );
}

fn cmd_verify(pubkey_path: &PathBuf, input_path: &PathBuf) {
    let pk_b64 = fs::read_to_string(pubkey_path).expect("Failed to read public key file");
    let pk_bytes = BASE64_STANDARD
        .decode(pk_b64.trim())
        .expect("Public key is not valid Base64");
    let vk = verifying_key_from_bytes(&pk_bytes).expect("Invalid public key");

    let json_str = fs::read_to_string(input_path).expect("Failed to read license file");
    let signed: SignedLicense =
        serde_json::from_str(&json_str).expect("Failed to parse signed license JSON");

    let pk_b64_str = BASE64_STANDARD.encode(vk.as_bytes());

    match verify_license(&signed, &pk_b64_str) {
        Ok(payload) => {
            println!("License is VALID.");
            println!("  ID:        {}", payload.license_id);
            println!("  Licensee:  {}", payload.licensee_name);
            println!("  Email:     {}", payload.licensee_email);
            println!("  Type:      {:?}", payload.license_type);
            println!("  Product:   {}", payload.product_id);
            println!("  Issued:    {}", payload.issued_at);
            match &payload.expires_at {
                Some(d) => println!("  Expires:   {}", d),
                None => println!("  Expires:   unlimited"),
            }
            println!("  Features:  {:?}", payload.features);
        }
        Err(e) => {
            eprintln!("License verification FAILED: {}", e);
            std::process::exit(1);
        }
    }
}
