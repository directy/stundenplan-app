use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherWish {
    pub id: i64,
    pub teacher_id: i64,
    pub wish_type: String,
    pub priority: String,
    pub parameters: String,
    pub note: Option<String>,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTeacherWish {
    pub teacher_id: i64,
    pub wish_type: String,
    pub priority: Option<String>,
    pub parameters: Option<String>,
    pub note: Option<String>,
    pub is_active: Option<bool>,
}
