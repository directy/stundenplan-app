use rusqlite::Connection;
use std::path::Path;
use crate::error::AppError;

pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self, AppError> {
        let conn = Connection::open(path)?;

        // PRAGMAs fuer Performance und Integritaet
        conn.execute_batch("
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
            PRAGMA synchronous = NORMAL;
            PRAGMA cache_size = -8000;
        ")?;

        let db = Self { conn };
        db.initialize()?;
        Ok(db)
    }

    /// Erstellt eine In-Memory-Datenbank (fuer Tests)
    #[cfg(test)]
    pub fn new_in_memory() -> Result<Self, AppError> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        let db = Self { conn };
        db.initialize()?;
        Ok(db)
    }

    fn initialize(&self) -> Result<(), AppError> {
        crate::db::schema::create_all_tables(&self.conn)?;
        crate::db::migrations::run_migrations(&self.conn)?;
        Ok(())
    }
}
