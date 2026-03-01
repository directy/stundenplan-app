use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RewardPoint {
    pub id: i64,
    pub teacher_id: i64,
    pub points: i32,
    pub category: String,
    pub reason: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewRewardPoint {
    pub teacher_id: i64,
    pub points: i32,
    pub category: String,
    pub reason: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherRanking {
    pub teacher_id: i64,
    pub teacher_name: String,
    pub total_points: i32,
    pub rank: i32,
    /// Normalized ranking multiplier 0.5–1.5 for solver use
    pub ranking_multiplier: f64,
}
