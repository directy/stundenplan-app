use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleReport {
    pub schedule_id: i64,
    pub schedule_name: String,
    pub summary: ReportSummary,
    pub constraint_analysis: Vec<ConstraintAnalysisItem>,
    pub entries: Vec<ReportEntry>,
    pub teacher_workloads: Vec<TeacherWorkloadItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportSummary {
    pub total_entries: usize,
    pub average_score: f64,
    pub min_score: f64,
    pub max_score: f64,
    pub entries_below_threshold: usize,
    pub coverage_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConstraintAnalysisItem {
    pub constraint_name: String,
    pub label: String,
    pub average_score: f64,
    pub min_score: f64,
    pub violations_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportEntry {
    pub entry_id: i64,
    pub period: i32,
    pub day_of_week: i32,
    pub class_name: String,
    pub subject_name: String,
    pub teacher_name: String,
    pub room_name: String,
    pub total_score: f64,
    pub soft_scores: HashMap<String, f64>,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeacherWorkloadItem {
    pub teacher_id: i64,
    pub teacher_name: String,
    pub total_hours: usize,
    pub unique_subjects: usize,
    pub unique_classes: usize,
    pub average_score: f64,
}
