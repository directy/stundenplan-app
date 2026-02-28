use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedResult {
    pub teachers_created: usize,
    pub subjects_created: usize,
    pub classes_created: usize,
    pub rooms_created: usize,
    pub assignments_created: usize,
}
