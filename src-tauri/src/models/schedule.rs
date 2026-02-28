use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    pub id: i64,
    pub name: String,
    pub status: String,
    pub valid_from: Option<String>,
    pub valid_to: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewSchedule {
    pub name: String,
    pub status: Option<String>,
    pub valid_from: Option<String>,
    pub valid_to: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleEntry {
    pub id: i64,
    pub schedule_id: i64,
    pub time_slot_id: i64,
    pub class_id: i64,
    pub subject_id: i64,
    pub teacher_id: i64,
    pub room_id: i64,
    pub decision_log: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewScheduleEntry {
    pub schedule_id: i64,
    pub time_slot_id: i64,
    pub class_id: i64,
    pub subject_id: i64,
    pub teacher_id: i64,
    pub room_id: i64,
    pub decision_log: Option<String>,
}
