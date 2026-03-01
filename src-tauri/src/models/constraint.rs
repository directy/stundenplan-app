use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConstraintRule {
    pub id: i64,
    pub rule_type: String,
    pub description: String,
    pub weight: f64,
    pub is_active: bool,
    pub parameters: String,
    pub sort_order: i32,
    pub scope_type: String,
    pub scope_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewConstraintRule {
    pub rule_type: String,
    pub description: String,
    pub weight: Option<f64>,
    pub is_active: Option<bool>,
    pub parameters: Option<String>,
    pub scope_type: Option<String>,
    pub scope_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConstraintOrderUpdate {
    pub id: i64,
    pub sort_order: i32,
}
