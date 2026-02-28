use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Eine Planungsaufgabe: "Klasse X braucht 1 Stunde Fach Y"
#[derive(Debug, Clone)]
pub struct SchedulingTask {
    pub class_id: i64,
    pub subject_id: i64,
    /// Schwierigkeitsgrad: hoeher = schwieriger zu platzieren
    pub difficulty: f64,
    /// Benoetigter Raumtyp fuer dieses Fach
    pub required_room_type: String,
    /// Qualifizierte Lehrer fuer dieses Fach
    pub qualified_teacher_ids: Vec<i64>,
}

/// Ein moeglicher Slot: Zeitslot + Lehrer + Raum
#[derive(Debug, Clone)]
pub struct AssignmentCandidate {
    pub time_slot_id: i64,
    pub day_of_week: i32,
    pub period: i32,
    pub teacher_id: i64,
    pub room_id: i64,
}

/// Kandidat mit Bewertung
#[derive(Debug, Clone)]
pub struct ScoredCandidate {
    pub candidate: AssignmentCandidate,
    pub total_score: f64,
    pub soft_scores: HashMap<String, f64>,
}

/// Belegungszustand waehrend der Generierung.
/// Ermoeglicht O(1)-Pruefung auf Doppelbelegungen.
#[derive(Debug, Clone, Default)]
pub struct ScheduleState {
    /// time_slot_id -> Menge belegter teacher_ids
    pub teacher_slots: HashMap<i64, HashSet<i64>>,
    /// time_slot_id -> Menge belegter room_ids
    pub room_slots: HashMap<i64, HashSet<i64>>,
    /// time_slot_id -> Menge belegter class_ids
    pub class_slots: HashMap<i64, HashSet<i64>>,
    /// (teacher_id, day_of_week) -> Anzahl Stunden an diesem Tag
    pub teacher_daily_hours: HashMap<(i64, i32), i32>,
    /// (class_id, subject_id) -> Anzahl bereits verplanter Stunden
    pub class_subject_hours: HashMap<(i64, i64), i32>,
    /// (class_id, day_of_week) -> Menge belegter Perioden
    pub class_day_periods: HashMap<(i64, i32), HashSet<i32>>,
    /// (class_id, day_of_week) -> geordnete Liste (period, subject_id)
    pub class_day_subjects: HashMap<(i64, i32), Vec<(i32, i64)>>,
    /// (class_id, subject_id) -> Menge der Tage, an denen dieses Fach stattfindet
    pub class_subject_days: HashMap<(i64, i64), HashSet<i32>>,
}

impl ScheduleState {
    pub fn new() -> Self {
        Self::default()
    }
}

/// Gewichte fuer alle 7 Soft Constraints, aus DB geladen
#[derive(Debug, Clone)]
pub struct ConstraintWeights {
    pub no_sports_after_math: f64,
    pub even_weekly_distribution: f64,
    pub avoid_edge_periods: f64,
    pub minimize_gaps: f64,
    pub class_teacher_first_period: f64,
    pub main_subjects_morning: f64,
    pub teacher_preferences: f64,
}

impl ConstraintWeights {
    /// Summe aller aktiven Gewichte (fuer Normalisierung)
    pub fn total(&self) -> f64 {
        self.no_sports_after_math
            + self.even_weekly_distribution
            + self.avoid_edge_periods
            + self.minimize_gaps
            + self.class_teacher_first_period
            + self.main_subjects_morning
            + self.teacher_preferences
    }
}

/// Ergebnis der Plangenerierung (wird ans Frontend gesendet)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationResult {
    pub entries_created: usize,
    pub total_score: f64,
    pub average_score: f64,
    pub unplaced_tasks: Vec<UnplacedTask>,
}

/// Nicht platzierbare Aufgabe mit Begruendung
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnplacedTask {
    pub class_id: i64,
    pub subject_id: i64,
    pub reason: String,
}
