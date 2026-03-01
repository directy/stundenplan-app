use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::{RewardPoint, NewRewardPoint, TeacherRanking};

pub fn create_reward_point(conn: &Connection, reward: &NewRewardPoint) -> Result<RewardPoint, AppError> {
    conn.execute(
        "INSERT INTO reward_points (teacher_id, points, category, reason, date)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            reward.teacher_id,
            reward.points,
            reward.category,
            reward.reason.as_deref().unwrap_or(""),
            reward.date.as_deref().unwrap_or(&chrono::Local::now().format("%Y-%m-%d").to_string()),
        ],
    )?;
    get_reward_point(conn, conn.last_insert_rowid())
}

pub fn get_reward_point(conn: &Connection, id: i64) -> Result<RewardPoint, AppError> {
    conn.query_row(
        "SELECT id, teacher_id, points, category, reason, date, created_at
         FROM reward_points WHERE id = ?1",
        [id],
        |row| {
            Ok(RewardPoint {
                id: row.get(0)?,
                teacher_id: row.get(1)?,
                points: row.get(2)?,
                category: row.get(3)?,
                reason: row.get(4)?,
                date: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    ).map_err(|_| AppError::NotFound(format!("Belohnungspunkt mit ID {} nicht gefunden", id)))
}

pub fn get_reward_points_for_teacher(conn: &Connection, teacher_id: i64) -> Result<Vec<RewardPoint>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, teacher_id, points, category, reason, date, created_at
         FROM reward_points WHERE teacher_id = ?1
         ORDER BY date DESC, id DESC"
    )?;

    let rows = stmt.query_map([teacher_id], |row| {
        Ok(RewardPoint {
            id: row.get(0)?,
            teacher_id: row.get(1)?,
            points: row.get(2)?,
            category: row.get(3)?,
            reason: row.get(4)?,
            date: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;

    let mut rewards = Vec::new();
    for row in rows {
        rewards.push(row?);
    }
    Ok(rewards)
}

pub fn delete_reward_point(conn: &Connection, id: i64) -> Result<(), AppError> {
    let rows = conn.execute("DELETE FROM reward_points WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound(format!("Belohnungspunkt mit ID {} nicht gefunden", id)));
    }
    Ok(())
}

/// Berechnet das Ranking aller Lehrer basierend auf ihren Gesamtpunkten.
/// ranking_multiplier reicht von 0.5 (niedrigster Rang) bis 1.5 (höchster Rang).
/// Wenn alle Lehrer 0 Punkte haben, bekommen alle Multiplier 1.0 (neutral).
pub fn get_teacher_rankings(conn: &Connection) -> Result<Vec<TeacherRanking>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, COALESCE(SUM(rp.points), 0) as total_points
         FROM teachers t
         LEFT JOIN reward_points rp ON t.id = rp.teacher_id
         GROUP BY t.id
         ORDER BY total_points DESC, t.name ASC"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, i32>(2)?,
        ))
    })?;

    let mut entries: Vec<(i64, String, i32)> = Vec::new();
    for row in rows {
        entries.push(row?);
    }

    let count = entries.len();
    let all_zero = entries.iter().all(|(_, _, pts)| *pts == 0);

    let rankings: Vec<TeacherRanking> = entries
        .into_iter()
        .enumerate()
        .map(|(idx, (teacher_id, teacher_name, total_points))| {
            let rank = (idx + 1) as i32;
            let ranking_multiplier = if all_zero || count <= 1 {
                1.0
            } else {
                0.5 + (1.0 * (count - 1 - idx) as f64 / (count - 1) as f64)
            };

            TeacherRanking {
                teacher_id,
                teacher_name,
                total_points,
                rank,
                ranking_multiplier,
            }
        })
        .collect();

    Ok(rankings)
}
