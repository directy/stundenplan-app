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

    /// Fuegt einen Eintrag zum State hinzu (spiegelt greedy::update_state).
    pub fn add_entry(&mut self, entry: &EntrySnapshot) {
        self.teacher_slots
            .entry(entry.time_slot_id)
            .or_default()
            .insert(entry.teacher_id);

        self.room_slots
            .entry(entry.time_slot_id)
            .or_default()
            .insert(entry.room_id);

        self.class_slots
            .entry(entry.time_slot_id)
            .or_default()
            .insert(entry.class_id);

        *self
            .teacher_daily_hours
            .entry((entry.teacher_id, entry.day_of_week))
            .or_insert(0) += 1;

        *self
            .class_subject_hours
            .entry((entry.class_id, entry.subject_id))
            .or_insert(0) += 1;

        self.class_day_periods
            .entry((entry.class_id, entry.day_of_week))
            .or_default()
            .insert(entry.period);

        self.class_day_subjects
            .entry((entry.class_id, entry.day_of_week))
            .or_default()
            .push((entry.period, entry.subject_id));

        self.class_subject_days
            .entry((entry.class_id, entry.subject_id))
            .or_default()
            .insert(entry.day_of_week);
    }

    /// Entfernt einen Eintrag aus dem State (Gegenstueck zu add_entry).
    pub fn remove_entry(&mut self, entry: &EntrySnapshot) {
        if let Some(set) = self.teacher_slots.get_mut(&entry.time_slot_id) {
            set.remove(&entry.teacher_id);
        }
        if let Some(set) = self.room_slots.get_mut(&entry.time_slot_id) {
            set.remove(&entry.room_id);
        }
        if let Some(set) = self.class_slots.get_mut(&entry.time_slot_id) {
            set.remove(&entry.class_id);
        }
        if let Some(hours) = self.teacher_daily_hours.get_mut(&(entry.teacher_id, entry.day_of_week)) {
            *hours = (*hours - 1).max(0);
        }
        if let Some(hours) = self.class_subject_hours.get_mut(&(entry.class_id, entry.subject_id)) {
            *hours = (*hours - 1).max(0);
        }
        if let Some(set) = self.class_day_periods.get_mut(&(entry.class_id, entry.day_of_week)) {
            set.remove(&entry.period);
        }
        if let Some(vec) = self.class_day_subjects.get_mut(&(entry.class_id, entry.day_of_week)) {
            vec.retain(|&(p, s)| !(p == entry.period && s == entry.subject_id));
        }
        // class_subject_days: Nur entfernen wenn kein weiterer Eintrag dieses Fachs an diesem Tag
        let still_has_subject_on_day = self.class_day_subjects
            .get(&(entry.class_id, entry.day_of_week))
            .is_some_and(|v| v.iter().any(|&(_, s)| s == entry.subject_id));
        if !still_has_subject_on_day {
            if let Some(set) = self.class_subject_days.get_mut(&(entry.class_id, entry.subject_id)) {
                set.remove(&entry.day_of_week);
            }
        }
    }

    /// Baut den State aus einer Liste von EntrySnapshots auf.
    pub fn from_entries(entries: &[EntrySnapshot]) -> Self {
        let mut state = Self::new();
        for entry in entries {
            state.add_entry(entry);
        }
        state
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

// ============================================================================
// Tabu Search Typen
// ============================================================================

/// Schnappschuss eines schedule_entry fuer In-Memory-Verarbeitung
#[derive(Debug, Clone)]
pub struct EntrySnapshot {
    pub db_id: i64,
    pub schedule_id: i64,
    pub time_slot_id: i64,
    pub day_of_week: i32,
    pub period: i32,
    pub class_id: i64,
    pub subject_id: i64,
    pub teacher_id: i64,
    pub room_id: i64,
    pub subject_short_name: String,
    pub required_room_type: String,
}

/// Konfiguration fuer den Tabu-Search-Algorithmus
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabuSearchConfig {
    pub max_iterations: usize,
    pub tabu_tenure: usize,
    pub max_no_improve: usize,
    pub neighborhood_sample_size: usize,
}

impl Default for TabuSearchConfig {
    fn default() -> Self {
        Self {
            max_iterations: 1000,
            tabu_tenure: 7,
            max_no_improve: 200,
            neighborhood_sample_size: 50,
        }
    }
}

/// Ergebnis der Tabu-Search-Optimierung
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimizationResult {
    pub initial_score: f64,
    pub final_score: f64,
    pub improvement_percent: f64,
    pub iterations_run: usize,
    pub moves_applied: usize,
    pub entries_modified: usize,
}
