use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassSubject {
    pub class_id: i64,
    pub subject_id: i64,
    pub weekly_hours: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewClassSubject {
    pub class_id: i64,
    pub subject_id: i64,
    pub weekly_hours: i32,
}
