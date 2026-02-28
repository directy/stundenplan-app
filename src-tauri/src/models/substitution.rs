use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubstitutionRecord {
    pub id: i64,
    pub original_entry_id: i64,
    pub substitute_teacher_id: i64,
    pub date: String,
    pub decision_reason: String,
    pub score: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewSubstitutionRecord {
    pub original_entry_id: i64,
    pub substitute_teacher_id: i64,
    pub date: String,
    pub decision_reason: Option<String>,
    pub score: Option<f64>,
}
