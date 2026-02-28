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

/// Einzelner Vertretungskandidat mit Score-Aufschluesselung
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubstitutionCandidate {
    pub teacher_id: i64,
    pub teacher_name: String,
    pub score: f64,
    pub score_breakdown: ScoreBreakdown,
    pub decision_reason: String,
    pub is_qualified: bool,
}

/// Aufschluesselung der einzelnen Score-Komponenten
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreBreakdown {
    pub engagement: f64,
    pub substitution_load: f64,
    pub pedagogical: f64,
    pub weekly_load: f64,
    pub subject_qualification: f64,
}

/// Betroffener Stundeneintrag eines Tages (Lehrkraft abwesend)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AffectedEntry {
    pub entry_id: i64,
    pub time_slot_id: i64,
    pub period: i32,
    pub start_time: String,
    pub end_time: String,
    pub class_id: i64,
    pub class_name: String,
    pub subject_id: i64,
    pub subject_name: String,
    pub original_teacher_id: i64,
    pub original_teacher_name: String,
    pub room_id: i64,
    pub room_name: String,
    pub is_substituted: bool,
    pub substitute_teacher_name: Option<String>,
}
