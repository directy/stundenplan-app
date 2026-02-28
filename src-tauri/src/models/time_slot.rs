use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSlot {
    pub id: i64,
    pub day_of_week: i32,
    pub period: i32,
    pub start_time: String,
    pub end_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTimeSlot {
    pub day_of_week: i32,
    pub period: i32,
    pub start_time: String,
    pub end_time: String,
}
