use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{ConstraintRule, NewConstraintRule};

pub fn create_constraint_rule(conn: &Connection, rule: &NewConstraintRule) -> Result<ConstraintRule, AppError> {
    conn.execute(
        "INSERT INTO constraint_rules (rule_type, description, weight, is_active, parameters)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            rule.rule_type,
            rule.description,
            rule.weight.unwrap_or(1.0),
            rule.is_active.unwrap_or(true),
            rule.parameters.as_deref().unwrap_or("{}"),
        ],
    )?;
    get_constraint_rule(conn, conn.last_insert_rowid())
}

pub fn get_constraint_rules(conn: &Connection) -> Result<Vec<ConstraintRule>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, rule_type, description, weight, is_active, parameters
         FROM constraint_rules ORDER BY rule_type"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(ConstraintRule {
            id: row.get(0)?,
            rule_type: row.get(1)?,
            description: row.get(2)?,
            weight: row.get(3)?,
            is_active: row.get(4)?,
            parameters: row.get(5)?,
        })
    })?;

    let mut rules = Vec::new();
    for row in rows {
        rules.push(row?);
    }
    Ok(rules)
}

pub fn get_constraint_rule(conn: &Connection, id: i64) -> Result<ConstraintRule, AppError> {
    conn.query_row(
        "SELECT id, rule_type, description, weight, is_active, parameters
         FROM constraint_rules WHERE id = ?1",
        [id],
        |row| {
            Ok(ConstraintRule {
                id: row.get(0)?,
                rule_type: row.get(1)?,
                description: row.get(2)?,
                weight: row.get(3)?,
                is_active: row.get(4)?,
                parameters: row.get(5)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Constraint mit ID {} nicht gefunden", id)))
}

pub fn update_constraint_rule(conn: &Connection, id: i64, rule: &NewConstraintRule) -> Result<ConstraintRule, AppError> {
    let rows = conn.execute(
        "UPDATE constraint_rules SET rule_type = ?1, description = ?2, weight = ?3,
         is_active = ?4, parameters = ?5 WHERE id = ?6",
        params![
            rule.rule_type,
            rule.description,
            rule.weight.unwrap_or(1.0),
            rule.is_active.unwrap_or(true),
            rule.parameters.as_deref().unwrap_or("{}"),
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Constraint mit ID {} nicht gefunden", id)));
    }
    get_constraint_rule(conn, id)
}

/// Erstellt die Standard-Soft-Constraints gemaess CLAUDE.md.
pub fn seed_default_constraints(conn: &Connection) -> Result<(), AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM constraint_rules", [], |row| row.get(0),
    )?;
    if count > 0 {
        return Ok(());
    }

    let defaults = [
        ("no_sports_after_math", "Kein Sport nach Mathe (und umgekehrt)", 0.3),
        ("even_weekly_distribution", "Gleichmaessige Wochenverteilung", 0.8),
        ("avoid_edge_periods", "Randstunden vermeiden", 0.5),
        ("minimize_gaps", "Hohlstunden minimieren", 0.9),
        ("class_teacher_first_period", "Klassenleiter bevorzugt 1. Stunde", 0.6),
        ("main_subjects_morning", "Hauptfaecher vormittags", 0.7),
        ("teacher_preferences", "Wunschzeiten der Lehrkraefte", 0.4),
    ];

    for (rule_type, description, weight) in &defaults {
        conn.execute(
            "INSERT INTO constraint_rules (rule_type, description, weight, is_active, parameters)
             VALUES (?1, ?2, ?3, 1, '{}')",
            params![rule_type, description, weight],
        )?;
    }

    Ok(())
}
