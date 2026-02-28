use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Datenbankfehler: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Nicht gefunden: {0}")]
    NotFound(String),

    #[error("Validierungsfehler: {0}")]
    Validation(String),

    #[error("Serialisierungsfehler: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Interner Fehler: {0}")]
    Internal(String),
}

impl From<AppError> for String {
    fn from(err: AppError) -> String {
        err.to_string()
    }
}
