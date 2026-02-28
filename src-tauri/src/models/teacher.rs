use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Teacher {
    pub id: i64,
    pub name: String,
    pub email: Option<String>,
    pub engagement_score: f64,
    pub pedagogical_score: f64,
    pub part_time_quota: f64,
    pub max_hours_per_day: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTeacher {
    pub name: String,
    pub email: Option<String>,
    pub engagement_score: Option<f64>,
    pub pedagogical_score: Option<f64>,
    pub part_time_quota: Option<f64>,
    pub max_hours_per_day: Option<i32>,
}
