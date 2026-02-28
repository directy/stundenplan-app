use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
    pub id: i64,
    pub name: String,
    pub short_name: String,
    pub room_type: String,
    pub weekly_hours_default: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewSubject {
    pub name: String,
    pub short_name: String,
    pub room_type: Option<String>,
    pub weekly_hours_default: Option<i32>,
}
