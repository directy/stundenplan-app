use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{SubstitutionRecord, NewSubstitutionRecord};

pub fn create_substitution(conn: &Connection, sub: &NewSubstitutionRecord) -> Result<SubstitutionRecord, AppError> {
    conn.execute(
        "INSERT INTO substitution_history (original_entry_id, substitute_teacher_id,
         date, decision_reason, score)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            sub.original_entry_id,
            sub.substitute_teacher_id,
            sub.date,
            sub.decision_reason.as_deref().unwrap_or(""),
            sub.score.unwrap_or(0.0),
        ],
    )?;
    get_substitution(conn, conn.last_insert_rowid())
}

pub fn get_substitutions(conn: &Connection) -> Result<Vec<SubstitutionRecord>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, original_entry_id, substitute_teacher_id, date,
         decision_reason, score, created_at
         FROM substitution_history ORDER BY created_at DESC"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(SubstitutionRecord {
            id: row.get(0)?,
            original_entry_id: row.get(1)?,
            substitute_teacher_id: row.get(2)?,
            date: row.get(3)?,
            decision_reason: row.get(4)?,
            score: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;

    let mut subs = Vec::new();
    for row in rows {
        subs.push(row?);
    }
    Ok(subs)
}

pub fn get_substitution(conn: &Connection, id: i64) -> Result<SubstitutionRecord, AppError> {
    conn.query_row(
        "SELECT id, original_entry_id, substitute_teacher_id, date,
         decision_reason, score, created_at
         FROM substitution_history WHERE id = ?1",
        [id],
        |row| {
            Ok(SubstitutionRecord {
                id: row.get(0)?,
                original_entry_id: row.get(1)?,
                substitute_teacher_id: row.get(2)?,
                date: row.get(3)?,
                decision_reason: row.get(4)?,
                score: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Vertretung mit ID {} nicht gefunden", id)))
}

pub fn get_substitutions_by_date(conn: &Connection, date: &str) -> Result<Vec<SubstitutionRecord>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, original_entry_id, substitute_teacher_id, date,
         decision_reason, score, created_at
         FROM substitution_history WHERE date = ?1
         ORDER BY created_at DESC"
    )?;

    let rows = stmt.query_map([date], |row| {
        Ok(SubstitutionRecord {
            id: row.get(0)?,
            original_entry_id: row.get(1)?,
            substitute_teacher_id: row.get(2)?,
            date: row.get(3)?,
            decision_reason: row.get(4)?,
            score: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;

    let mut subs = Vec::new();
    for row in rows {
        subs.push(row?);
    }
    Ok(subs)
}
