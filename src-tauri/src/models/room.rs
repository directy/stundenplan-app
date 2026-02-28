use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Room {
    pub id: i64,
    pub name: String,
    pub room_type: String,
    pub capacity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewRoom {
    pub name: String,
    pub room_type: Option<String>,
    pub capacity: Option<i32>,
}
