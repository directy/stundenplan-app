use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherAbsence {
    pub id: i64,
    pub teacher_id: i64,
    pub absence_type: String,
    pub start_date: String,
    pub end_date: String,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTeacherAbsence {
    pub teacher_id: i64,
    pub absence_type: String,
    pub start_date: String,
    pub end_date: String,
    pub note: Option<String>,
}
