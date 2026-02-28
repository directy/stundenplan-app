use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherPreference {
    pub id: i64,
    pub teacher_id: i64,
    pub day_of_week: i32,
    pub period: i32,
    pub preference_type: String,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTeacherPreference {
    pub teacher_id: i64,
    pub day_of_week: i32,
    pub period: i32,
    pub preference_type: String,
    pub reason: Option<String>,
}
