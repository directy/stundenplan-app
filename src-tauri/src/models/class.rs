use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchoolClass {
    pub id: i64,
    pub name: String,
    pub grade_level: i32,
    pub class_teacher_id: Option<i64>,
    pub student_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewSchoolClass {
    pub name: String,
    pub grade_level: i32,
    pub class_teacher_id: Option<i64>,
    pub student_count: Option<i32>,
}
