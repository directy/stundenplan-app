use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{ConstraintRule, NewConstraintRule, ConstraintOrderUpdate};

pub fn create_constraint_rule(conn: &Connection, rule: &NewConstraintRule) -> Result<ConstraintRule, AppError> {
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM constraint_rules", [], |row| row.get(0),
    )?;

    conn.execute(
        "INSERT INTO constraint_rules (rule_type, description, weight, is_active, parameters, sort_order, scope_type, scope_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            rule.rule_type,
            rule.description,
            rule.weight.unwrap_or(1.0),
            rule.is_active.unwrap_or(true),
            rule.parameters.as_deref().unwrap_or("{}"),
            max_order + 1,
            rule.scope_type.as_deref().unwrap_or("global"),
            rule.scope_id,
        ],
    )?;
    get_constraint_rule(conn, conn.last_insert_rowid())
}

pub fn get_constraint_rules(conn: &Connection) -> Result<Vec<ConstraintRule>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, rule_type, description, weight, is_active, parameters, sort_order, scope_type, scope_id
         FROM constraint_rules ORDER BY sort_order, id"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(ConstraintRule {
            id: row.get(0)?,
            rule_type: row.get(1)?,
            description: row.get(2)?,
            weight: row.get(3)?,
            is_active: row.get(4)?,
            parameters: row.get(5)?,
            sort_order: row.get(6)?,
            scope_type: row.get(7)?,
            scope_id: row.get(8)?,
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
        "SELECT id, rule_type, description, weight, is_active, parameters, sort_order, scope_type, scope_id
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
                sort_order: row.get(6)?,
                scope_type: row.get(7)?,
                scope_id: row.get(8)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Constraint mit ID {} nicht gefunden", id)))
}

pub fn update_constraint_rule(conn: &Connection, id: i64, rule: &NewConstraintRule) -> Result<ConstraintRule, AppError> {
    let rows = conn.execute(
        "UPDATE constraint_rules SET rule_type = ?1, description = ?2, weight = ?3,
         is_active = ?4, parameters = ?5, scope_type = ?6, scope_id = ?7 WHERE id = ?8",
        params![
            rule.rule_type,
            rule.description,
            rule.weight.unwrap_or(1.0),
            rule.is_active.unwrap_or(true),
            rule.parameters.as_deref().unwrap_or("{}"),
            rule.scope_type.as_deref().unwrap_or("global"),
            rule.scope_id,
            id,
        ],
    )?;

    if rows == 0 {
        return Err(AppError::NotFound(format!("Constraint mit ID {} nicht gefunden", id)));
    }
    get_constraint_rule(conn, id)
}

pub fn delete_constraint_rule(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM constraint_rules WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Constraint mit ID {} nicht gefunden", id)));
    }
    Ok(())
}

pub fn update_constraint_order(conn: &Connection, updates: &[ConstraintOrderUpdate]) -> Result<(), AppError> {
    let tx = conn.unchecked_transaction()?;
    for update in updates {
        tx.execute(
            "UPDATE constraint_rules SET sort_order = ?1 WHERE id = ?2",
            params![update.sort_order, update.id],
        )?;
    }
    tx.commit()?;
    Ok(())
}

/// Erstellt die Standard-Soft-Constraints.
pub fn seed_default_constraints(conn: &Connection) -> Result<(), AppError> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM constraint_rules", [], |row| row.get(0),
    )?;
    if count > 0 {
        return Ok(());
    }

    // Einzelne Fachfolge-Paare als separate Regeln
    let defaults: Vec<(&str, &str, f64, i32, &str)> = vec![
        ("forbidden_subject_sequence", "Kein Sport nach Mathe", 0.3, 0,
         r#"{"first":"Sport","second":"Mathe"}"#),
        ("forbidden_subject_sequence", "Kein Sp nach Ma", 0.3, 1,
         r#"{"first":"Sp","second":"Ma"}"#),
        ("even_weekly_distribution", "Gleichmäßige Wochenverteilung", 0.8, 2, "{}"),
        ("avoid_edge_periods", "Randstunden vermeiden", 0.5, 3, "{}"),
        ("minimize_gaps", "Hohlstunden minimieren", 0.9, 4, "{}"),
        ("class_teacher_first_period", "Klassenleiter bevorzugt 1. Stunde", 0.6, 5, "{}"),
        ("main_subjects_morning", "Hauptfächer vormittags", 0.7, 6, "{}"),
        ("teacher_preferences", "Wunschzeiten der Lehrkräfte", 0.4, 7, "{}"),
        ("teacher_wishes", "Sonderwünsche der Lehrkräfte", 0.5, 8, "{}"),
    ];

    for (rule_type, description, weight, sort_order, parameters) in &defaults {
        conn.execute(
            "INSERT INTO constraint_rules (rule_type, description, weight, is_active, parameters, sort_order, scope_type, scope_id)
             VALUES (?1, ?2, ?3, 1, ?4, ?5, 'global', NULL)",
            params![rule_type, description, weight, parameters, sort_order],
        )?;
    }

    Ok(())
}
