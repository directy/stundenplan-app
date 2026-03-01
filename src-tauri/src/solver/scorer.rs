use std::collections::HashMap;
use crate::models::{TeacherPreference, TeacherWish};
use super::constraints;
use super::types::{AssignmentCandidate, ConstraintWeights, ScheduleState, ScoredCandidate};

/// Berechnet alle 8 Soft Scores für einen Kandidaten,
/// gewichtet mit den ConstraintWeights und normalisiert auf 0.0-1.0.
#[allow(clippy::too_many_arguments)]
pub fn score_candidate(
    state: &ScheduleState,
    candidate: &AssignmentCandidate,
    class_id: i64,
    subject_id: i64,
    subject_short_name: &str,
    weekly_hours: i32,
    class_teacher_id: Option<i64>,
    teacher_preferences: &[TeacherPreference],
    teacher_wishes: &[TeacherWish],
    ranking_multiplier: f64,
    weights: &ConstraintWeights,
    subject_name_map: &HashMap<i64, String>,
    forbidden_pairs: &[(String, String)],
) -> ScoredCandidate {
    let mut soft_scores = HashMap::new();

    // 1. Verbotene Fachfolgen
    let s1 = constraints::score_no_subject_after_subject(
        state, class_id, subject_short_name, candidate, subject_name_map, forbidden_pairs,
    );
    soft_scores.insert("forbidden_subject_sequence".to_string(), s1);

    // 2. Gleichmäßige Wochenverteilung
    let s2 = constraints::score_even_weekly_distribution(state, class_id, subject_id, candidate, weekly_hours);
    soft_scores.insert("even_weekly_distribution".to_string(), s2);

    // 3. Randstunden vermeiden
    let s3 = constraints::score_avoid_edge_periods(candidate);
    soft_scores.insert("avoid_edge_periods".to_string(), s3);

    // 4. Hohlstunden minimieren
    let s4 = constraints::score_minimize_gaps(state, class_id, candidate);
    soft_scores.insert("minimize_gaps".to_string(), s4);

    // 5. Klassenlehrer 1. Stunde
    let s5 = constraints::score_class_teacher_first_period(candidate, class_teacher_id);
    soft_scores.insert("class_teacher_first_period".to_string(), s5);

    // 6. Hauptfächer vormittags
    let s6 = constraints::score_main_subjects_morning(subject_short_name, candidate);
    soft_scores.insert("main_subjects_morning".to_string(), s6);

    // 7. Lehrer-Präferenzen (mit Ranking-Multiplier)
    let s7 = constraints::score_teacher_preferences(teacher_preferences, candidate, ranking_multiplier);
    soft_scores.insert("teacher_preferences".to_string(), s7);

    // 8. Sonderwünsche der Lehrkräfte (mit Ranking-Multiplier)
    let s8 = constraints::score_teacher_wishes(teacher_wishes, candidate, state, ranking_multiplier);
    soft_scores.insert("teacher_wishes".to_string(), s8);

    // Gewichtete Summe, normalisiert
    let weighted_sum = s1 * weights.forbidden_subject_sequence
        + s2 * weights.even_weekly_distribution
        + s3 * weights.avoid_edge_periods
        + s4 * weights.minimize_gaps
        + s5 * weights.class_teacher_first_period
        + s6 * weights.main_subjects_morning
        + s7 * weights.teacher_preferences
        + s8 * weights.teacher_wishes;

    let total_weight = weights.total();
    let total_score = if total_weight > 0.0 {
        weighted_sum / total_weight
    } else {
        0.5 // Fallback wenn alle Gewichte 0
    };

    ScoredCandidate {
        candidate: candidate.clone(),
        total_score,
        soft_scores,
    }
}

/// Erzeugt den Decision-Log als JSON-String für einen schedule_entry.
pub fn build_decision_log(
    scored: &ScoredCandidate,
    candidates_evaluated: usize,
) -> String {
    let soft_scores_json: serde_json::Value = scored
        .soft_scores
        .iter()
        .map(|(k, v)| (k.clone(), serde_json::json!((*v * 1000.0).round() / 1000.0)))
        .collect::<serde_json::Map<String, serde_json::Value>>()
        .into();

    let log = serde_json::json!({
        "algorithm": "greedy",
        "candidates_evaluated": candidates_evaluated,
        "hard_constraints_checked": [
            "no_double_booking_teacher",
            "no_double_booking_room",
            "no_double_booking_class",
            "max_hours_per_day",
            "room_type_match"
        ],
        "soft_scores": soft_scores_json,
        "total_score": (scored.total_score * 1000.0).round() / 1000.0,
        "reason": format!(
            "Bester verfügbarer Kandidat mit Score {:.3} (von {} geprüft)",
            scored.total_score, candidates_evaluated
        )
    });

    log.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solver::types::ScheduleState;

    #[test]
    fn test_score_candidate_neutral() {
        let state = ScheduleState::new();
        let candidate = AssignmentCandidate {
            time_slot_id: 1,
            day_of_week: 1,
            period: 3,
            teacher_id: 10,
            room_id: 100,
        };
        let weights = ConstraintWeights {
            forbidden_subject_sequence: 0.3,
            even_weekly_distribution: 0.8,
            avoid_edge_periods: 0.5,
            minimize_gaps: 0.9,
            class_teacher_first_period: 0.6,
            main_subjects_morning: 0.7,
            teacher_preferences: 0.4,
            teacher_wishes: 0.5,
        };

        let subject_name_map = HashMap::new();
        let forbidden_pairs = vec![];
        let scored = score_candidate(
            &state, &candidate, 1, 1, "Kunst", 3, None, &[], &[], 1.0, &weights,
            &subject_name_map, &forbidden_pairs,
        );

        assert!(scored.total_score > 0.0);
        assert!(scored.total_score <= 1.0);
        assert_eq!(scored.soft_scores.len(), 8);
    }

    #[test]
    fn test_build_decision_log() {
        let scored = ScoredCandidate {
            candidate: AssignmentCandidate {
                time_slot_id: 1,
                day_of_week: 1,
                period: 3,
                teacher_id: 10,
                room_id: 100,
            },
            total_score: 0.76,
            soft_scores: HashMap::from([
                ("minimize_gaps".to_string(), 0.85),
                ("avoid_edge_periods".to_string(), 1.0),
            ]),
        };

        let log = build_decision_log(&scored, 42);
        let parsed: serde_json::Value = serde_json::from_str(&log).unwrap();

        assert_eq!(parsed["algorithm"], "greedy");
        assert_eq!(parsed["candidates_evaluated"], 42);
        assert!(parsed["soft_scores"].is_object());
        assert!(parsed["reason"].as_str().unwrap().contains("0.760"));
    }
}
