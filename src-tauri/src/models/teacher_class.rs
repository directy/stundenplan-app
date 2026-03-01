use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherClassRestriction {
    pub id: i64,
    pub teacher_id: i64,
    pub class_id: i64,
    pub restriction_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTeacherClassRestriction {
    pub teacher_id: i64,
    pub class_id: i64,
    pub restriction_type: Option<String>,
}
