use std::collections::{HashMap, HashSet};
use crate::models::{Teacher, TeacherPreference, TeacherWish};
use super::types::{AssignmentCandidate, ScheduleState};

// =============================================================================
// Hard Constraints – müssen alle true sein, sonst wird Kandidat verworfen
// =============================================================================

/// Kein Lehrer doppelt im selben Zeitslot
pub fn check_no_teacher_double_booking(
    state: &ScheduleState,
    candidate: &AssignmentCandidate,
) -> bool {
    state
        .teacher_slots
        .get(&candidate.time_slot_id)
        .is_none_or(|teachers| !teachers.contains(&candidate.teacher_id))
}

/// Kein Raum doppelt im selben Zeitslot
pub fn check_no_room_double_booking(
    state: &ScheduleState,
    candidate: &AssignmentCandidate,
) -> bool {
    state
        .room_slots
        .get(&candidate.time_slot_id)
        .is_none_or(|rooms| !rooms.contains(&candidate.room_id))
}

/// Keine Klasse doppelt im selben Zeitslot
pub fn check_no_class_double_booking(
    state: &ScheduleState,
    class_id: i64,
    candidate: &AssignmentCandidate,
) -> bool {
    state
        .class_slots
        .get(&candidate.time_slot_id)
        .is_none_or(|classes| !classes.contains(&class_id))
}

/// Lehrer-Tageslimit nicht überschritten
pub fn check_max_hours_per_day(
    state: &ScheduleState,
    candidate: &AssignmentCandidate,
    teacher: &Teacher,
) -> bool {
    let current = state
        .teacher_daily_hours
        .get(&(candidate.teacher_id, candidate.day_of_week))
        .copied()
        .unwrap_or(0);
    current < teacher.max_hours_per_day
}

/// Raumtyp passt zum Fachtyp
pub fn check_room_type_match(
    room_type: &str,
    required_room_type: &str,
) -> bool {
    room_type == required_room_type
}

/// Sammelfunktion: Alle Hard Constraints prüfen
pub fn check_all_hard_constraints(
    state: &ScheduleState,
    class_id: i64,
    candidate: &AssignmentCandidate,
    teacher: &Teacher,
    room_type: &str,
    required_room_type: &str,
) -> bool {
    check_no_teacher_double_booking(state, candidate)
        && check_no_room_double_booking(state, candidate)
        && check_no_class_double_booking(state, class_id, candidate)
        && check_max_hours_per_day(state, candidate, teacher)
        && check_room_type_match(room_type, required_room_type)
}

// =============================================================================
// Soft Constraints – Score 0.0 bis 1.0, höher = besser
// =============================================================================

/// Verbotene Fachfolgen: Prüft, ob in benachbarten Perioden eine unerwünschte
/// Fachkombination vorliegt. Die Paare werden aus den constraint_rules.parameters geladen.
pub fn score_no_subject_after_subject(
    state: &ScheduleState,
    class_id: i64,
    subject_short_name: &str,
    candidate: &AssignmentCandidate,
    subject_name_map: &HashMap<i64, String>,
    forbidden_pairs: &[(String, String)],
) -> f64 {
    if forbidden_pairs.is_empty() {
        return 1.0;
    }

    // Prüfe, ob das aktuelle Fach überhaupt in einem verbotenen Paar vorkommt
    let current_lower = subject_short_name.to_lowercase();
    let relevant = forbidden_pairs.iter().any(|(a, b)| {
        a.to_lowercase() == current_lower || b.to_lowercase() == current_lower
    });
    if !relevant {
        return 1.0;
    }

    let key = (class_id, candidate.day_of_week);
    let subjects = match state.class_day_subjects.get(&key) {
        Some(s) => s,
        None => return 1.0,
    };

    // Prüfe Nachbar-Perioden
    let adjacent_periods = [candidate.period - 1, candidate.period + 1];
    for &adj_period in &adjacent_periods {
        for &(period, neighbor_subject_id) in subjects {
            if period == adj_period {
                if let Some(neighbor_name) = subject_name_map.get(&neighbor_subject_id) {
                    let neighbor_lower = neighbor_name.to_lowercase();
                    for (a, b) in forbidden_pairs {
                        let a_lower = a.to_lowercase();
                        let b_lower = b.to_lowercase();
                        if (a_lower == current_lower && b_lower == neighbor_lower)
                            || (a_lower == neighbor_lower && b_lower == current_lower)
                        {
                            return 0.3;
                        }
                    }
                }
            }
        }
    }

    1.0
}

/// Gleichmäßige Wochenverteilung: Fach auf verschiedene Tage verteilen.
/// Score sinkt, je mehr Stunden desselben Fachs am selben Tag.
pub fn score_even_weekly_distribution(
    state: &ScheduleState,
    class_id: i64,
    subject_id: i64,
    candidate: &AssignmentCandidate,
    weekly_hours: i32,
) -> f64 {
    let days_used = state
        .class_subject_days
        .get(&(class_id, subject_id))
        .map_or(0, |days| {
            // Zähle wie viele verschiedene Tage bereits belegt
            if days.contains(&candidate.day_of_week) {
                days.len()
            } else {
                days.len() + 1
            }
        });

    let already_on_this_day = state
        .class_subject_days
        .get(&(class_id, subject_id))
        .is_some_and(|days| days.contains(&candidate.day_of_week));

    if already_on_this_day {
        // Penalty: Dieses Fach ist schon an diesem Tag
        let max_days = weekly_hours.min(5) as f64;
        let used = days_used as f64;
        if max_days > 0.0 { (used / max_days).min(1.0) * 0.5 } else { 0.5 }
    } else {
        1.0
    }
}

/// Randstunden vermeiden: Perioden 8/9 stark bestraft, Periode 1 leicht.
pub fn score_avoid_edge_periods(candidate: &AssignmentCandidate) -> f64 {
    match candidate.period {
        1 => 0.9,
        2..=6 => 1.0,
        7 => 0.7,
        8 => 0.4,
        9 => 0.2,
        _ => 0.5,
    }
}

/// Hohlstunden minimieren: Verhältnis gefüllte Stunden zu Spannweite.
/// Je weniger Lücken, desto besser.
pub fn score_minimize_gaps(
    state: &ScheduleState,
    class_id: i64,
    candidate: &AssignmentCandidate,
) -> f64 {
    let key = (class_id, candidate.day_of_week);
    let periods = match state.class_day_periods.get(&key) {
        Some(p) if !p.is_empty() => p,
        _ => return 1.0, // Erster Eintrag an diesem Tag: keine Lücken
    };

    // Simuliere das Hinzufügen der neuen Periode
    let mut all_periods: HashSet<i32> = periods.clone();
    all_periods.insert(candidate.period);

    let min_p = *all_periods.iter().min().unwrap_or(&1);
    let max_p = *all_periods.iter().max().unwrap_or(&1);
    let span = (max_p - min_p + 1) as f64;
    let filled = all_periods.len() as f64;

    if span == 0.0 {
        1.0
    } else {
        filled / span
    }
}

/// Klassenlehrer bevorzugt in 1. Stunde.
pub fn score_class_teacher_first_period(
    candidate: &AssignmentCandidate,
    class_teacher_id: Option<i64>,
) -> f64 {
    if candidate.period == 1 {
        if let Some(ct_id) = class_teacher_id {
            if candidate.teacher_id == ct_id {
                return 1.0; // Klassenlehrer in 1. Stunde = perfekt
            }
        }
        0.7 // 1. Stunde, aber nicht Klassenlehrer
    } else {
        0.8 // Neutral für andere Stunden
    }
}

/// Hauptfächer (Ma, De, En) bevorzugt in Perioden 1-4.
pub fn score_main_subjects_morning(
    subject_short_name: &str,
    candidate: &AssignmentCandidate,
) -> f64 {
    let is_main = matches!(
        subject_short_name,
        "Ma" | "Mathe" | "Mathematik" | "De" | "Deutsch" | "En" | "Englisch" | "Eng"
    );

    if !is_main {
        return 0.8; // Neutral für Nebenfächer
    }

    match candidate.period {
        1..=4 => 1.0,   // Vormittags = ideal
        5..=6 => 0.6,   // Frueh-Nachmittag = akzeptabel
        _ => 0.3,        // Spaet = schlecht
    }
}

/// Wunschzeiten der Lehrkräfte: preferred=1.0, unavailable=0.0, neutral=0.8
/// ranking_multiplier verstärkt/dämpft den Score (0.5–1.5, default 1.0)
pub fn score_teacher_preferences(
    preferences: &[TeacherPreference],
    candidate: &AssignmentCandidate,
    ranking_multiplier: f64,
) -> f64 {
    let base_score = {
        let mut score = 0.8;
        for pref in preferences {
            if pref.day_of_week == candidate.day_of_week && pref.period == candidate.period {
                score = match pref.preference_type.as_str() {
                    "preferred" => 1.0,
                    "unavailable" => 0.0,
                    _ => 0.8,
                };
                break;
            }
        }
        score
    };
    (base_score * ranking_multiplier).clamp(0.0, 1.0)
}

/// Sonderwünsche der Lehrkräfte (dynamisch hinzufügbar).
/// Bewertet aktive Wünsche gewichtet nach Priorität und Ranking.
pub fn score_teacher_wishes(
    wishes: &[TeacherWish],
    candidate: &AssignmentCandidate,
    state: &ScheduleState,
    ranking_multiplier: f64,
) -> f64 {
    // Nur Wünsche dieses Lehrers
    let teacher_wishes: Vec<&TeacherWish> = wishes
        .iter()
        .filter(|w| w.teacher_id == candidate.teacher_id)
        .collect();

    if teacher_wishes.is_empty() {
        return 0.8; // Neutral wenn keine Wünsche
    }

    let mut weighted_sum = 0.0;
    let mut total_weight = 0.0;

    for wish in &teacher_wishes {
        let priority_weight = match wish.priority.as_str() {
            "low" => 0.5,
            "medium" => 1.0,
            "high" => 1.5,
            _ => 1.0,
        };

        let score = match wish.wish_type.as_str() {
            "prefer_morning" => {
                if candidate.period <= 4 { 1.0 } else { 0.3 }
            }
            "prefer_afternoon" => {
                if candidate.period >= 5 { 1.0 } else { 0.3 }
            }
            "free_day" => {
                let params: serde_json::Value =
                    serde_json::from_str(&wish.parameters).unwrap_or_default();
                let day = params["day_of_week"].as_i64().unwrap_or(0) as i32;
                if candidate.day_of_week == day { 0.0 } else { 1.0 }
            }
            "max_consecutive" => {
                let params: serde_json::Value =
                    serde_json::from_str(&wish.parameters).unwrap_or_default();
                let max_hours = params["max_hours"].as_i64().unwrap_or(4) as i32;
                let key = (candidate.teacher_id, candidate.day_of_week);
                if let Some(periods) = state.teacher_day_periods.get(&key) {
                    let mut all_periods: Vec<i32> = periods.iter().copied().collect();
                    all_periods.push(candidate.period);
                    all_periods.sort();
                    let mut max_run = 1;
                    let mut current_run = 1;
                    for i in 1..all_periods.len() {
                        if all_periods[i] == all_periods[i - 1] + 1 {
                            current_run += 1;
                            max_run = max_run.max(current_run);
                        } else {
                            current_run = 1;
                        }
                    }
                    if max_run > max_hours { 0.0 } else { 1.0 }
                } else {
                    1.0
                }
            }
            "compact_schedule" => {
                let key = (candidate.teacher_id, candidate.day_of_week);
                if let Some(periods) = state.teacher_day_periods.get(&key) {
                    if periods.is_empty() {
                        1.0
                    } else {
                        let mut all_periods: HashSet<i32> = periods.clone();
                        all_periods.insert(candidate.period);
                        let min_p = *all_periods.iter().min().unwrap();
                        let max_p = *all_periods.iter().max().unwrap();
                        let span = (max_p - min_p + 1) as f64;
                        let filled = all_periods.len() as f64;
                        if span == 0.0 { 1.0 } else { filled / span }
                    }
                } else {
                    1.0
                }
            }
            "custom" => 0.8,
            _ => 0.8,
        };

        weighted_sum += score * priority_weight;
        total_weight += priority_weight;
    }

    if total_weight == 0.0 {
        return 0.8;
    }

    let avg = weighted_sum / total_weight;
    (avg * ranking_multiplier).clamp(0.0, 1.0)
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solver::types::ScheduleState;

    fn make_candidate(time_slot_id: i64, day: i32, period: i32, teacher_id: i64, room_id: i64) -> AssignmentCandidate {
        AssignmentCandidate {
            time_slot_id,
            day_of_week: day,
            period,
            teacher_id,
            room_id,
        }
    }

    #[test]
    fn test_no_teacher_double_booking() {
        let mut state = ScheduleState::new();
        let candidate = make_candidate(1, 1, 1, 10, 100);

        // Leerer State: kein Konflikt
        assert!(check_no_teacher_double_booking(&state, &candidate));

        // Lehrer 10 in Slot 1 belegen
        state.teacher_slots.entry(1).or_default().insert(10);
        assert!(!check_no_teacher_double_booking(&state, &candidate));

        // Anderer Lehrer: kein Konflikt
        let other = make_candidate(1, 1, 1, 20, 100);
        assert!(check_no_teacher_double_booking(&state, &other));
    }

    #[test]
    fn test_no_room_double_booking() {
        let mut state = ScheduleState::new();
        let candidate = make_candidate(1, 1, 1, 10, 100);

        assert!(check_no_room_double_booking(&state, &candidate));

        state.room_slots.entry(1).or_default().insert(100);
        assert!(!check_no_room_double_booking(&state, &candidate));
    }

    #[test]
    fn test_no_class_double_booking() {
        let mut state = ScheduleState::new();
        let candidate = make_candidate(1, 1, 1, 10, 100);

        assert!(check_no_class_double_booking(&state, 5, &candidate));

        state.class_slots.entry(1).or_default().insert(5);
        assert!(!check_no_class_double_booking(&state, 5, &candidate));
    }

    #[test]
    fn test_max_hours_per_day() {
        let mut state = ScheduleState::new();
        let candidate = make_candidate(1, 1, 1, 10, 100);
        let teacher = Teacher {
            id: 10,
            name: "Test".into(),
            email: None,
            engagement_score: 0.5,
            pedagogical_score: 0.5,
            part_time_quota: 1.0,
            max_hours_per_day: 3,
            created_at: String::new(),
            updated_at: String::new(),
        };

        assert!(check_max_hours_per_day(&state, &candidate, &teacher));

        state.teacher_daily_hours.insert((10, 1), 3);
        assert!(!check_max_hours_per_day(&state, &candidate, &teacher));
    }

    #[test]
    fn test_room_type_match() {
        assert!(check_room_type_match("standard", "standard"));
        assert!(check_room_type_match("sports", "sports"));
        assert!(!check_room_type_match("standard", "sports"));
    }

    #[test]
    fn test_avoid_edge_periods() {
        assert_eq!(score_avoid_edge_periods(&make_candidate(1, 1, 3, 10, 100)), 1.0);
        assert_eq!(score_avoid_edge_periods(&make_candidate(1, 1, 9, 10, 100)), 0.2);
        assert_eq!(score_avoid_edge_periods(&make_candidate(1, 1, 1, 10, 100)), 0.9);
    }

    #[test]
    fn test_main_subjects_morning() {
        let morning = make_candidate(1, 1, 2, 10, 100);
        let afternoon = make_candidate(1, 1, 7, 10, 100);

        assert_eq!(score_main_subjects_morning("Ma", &morning), 1.0);
        assert_eq!(score_main_subjects_morning("Ma", &afternoon), 0.3);
        assert_eq!(score_main_subjects_morning("Kunst", &morning), 0.8);
    }

    #[test]
    fn test_teacher_preferences() {
        let prefs = vec![
            TeacherPreference {
                id: 1,
                teacher_id: 10,
                day_of_week: 1,
                period: 1,
                preference_type: "preferred".into(),
                reason: None,
            },
            TeacherPreference {
                id: 2,
                teacher_id: 10,
                day_of_week: 1,
                period: 5,
                preference_type: "unavailable".into(),
                reason: None,
            },
        ];

        let preferred = make_candidate(1, 1, 1, 10, 100);
        assert_eq!(score_teacher_preferences(&prefs, &preferred, 1.0), 1.0);

        let unavailable = make_candidate(5, 1, 5, 10, 100);
        assert_eq!(score_teacher_preferences(&prefs, &unavailable, 1.0), 0.0);

        let neutral = make_candidate(3, 1, 3, 10, 100);
        assert_eq!(score_teacher_preferences(&prefs, &neutral, 1.0), 0.8);
    }

    #[test]
    fn test_teacher_preferences_with_ranking() {
        let prefs = vec![
            TeacherPreference {
                id: 1,
                teacher_id: 10,
                day_of_week: 1,
                period: 1,
                preference_type: "preferred".into(),
                reason: None,
            },
        ];

        let candidate = make_candidate(1, 1, 1, 10, 100);
        // Hoher Rang (1.5): Score 1.0 * 1.5 = 1.5 -> clamped 1.0
        assert_eq!(score_teacher_preferences(&prefs, &candidate, 1.5), 1.0);
        // Niedriger Rang (0.5): Score 1.0 * 0.5 = 0.5
        assert_eq!(score_teacher_preferences(&prefs, &candidate, 0.5), 0.5);
    }

    #[test]
    fn test_teacher_wishes_prefer_morning() {
        let state = ScheduleState::new();
        let wishes = vec![
            TeacherWish {
                id: 1,
                teacher_id: 10,
                wish_type: "prefer_morning".into(),
                priority: "high".into(),
                parameters: "{}".into(),
                note: None,
                is_active: true,
                created_at: String::new(),
            },
        ];

        let morning = make_candidate(1, 1, 2, 10, 100);
        let afternoon = make_candidate(1, 1, 6, 10, 100);

        assert_eq!(score_teacher_wishes(&wishes, &morning, &state, 1.0), 1.0);
        assert!((score_teacher_wishes(&wishes, &afternoon, &state, 1.0) - 0.3).abs() < 0.01);
    }

    #[test]
    fn test_teacher_wishes_free_day() {
        let state = ScheduleState::new();
        let wishes = vec![
            TeacherWish {
                id: 1,
                teacher_id: 10,
                wish_type: "free_day".into(),
                priority: "medium".into(),
                parameters: r#"{"day_of_week":3}"#.into(),
                note: None,
                is_active: true,
                created_at: String::new(),
            },
        ];

        // Mittwoch (Tag 3): Score 0.0
        let wed = make_candidate(1, 3, 1, 10, 100);
        assert_eq!(score_teacher_wishes(&wishes, &wed, &state, 1.0), 0.0);

        // Montag (Tag 1): Score 1.0
        let mon = make_candidate(1, 1, 1, 10, 100);
        assert_eq!(score_teacher_wishes(&wishes, &mon, &state, 1.0), 1.0);
    }

    #[test]
    fn test_minimize_gaps_no_gaps() {
        let mut state = ScheduleState::new();
        // Klasse 1, Montag: Perioden 1, 2
        state.class_day_periods.entry((1, 1)).or_default().insert(1);
        state.class_day_periods.entry((1, 1)).or_default().insert(2);

        // Periode 3 hinzufügen: Spannweite 3, gefüllt 3 -> Score 1.0
        let candidate = make_candidate(3, 1, 3, 10, 100);
        assert_eq!(score_minimize_gaps(&state, 1, &candidate), 1.0);
    }

    #[test]
    fn test_minimize_gaps_with_gap() {
        let mut state = ScheduleState::new();
        // Klasse 1, Montag: Periode 1
        state.class_day_periods.entry((1, 1)).or_default().insert(1);

        // Periode 3 hinzufügen: Spannweite 3, gefüllt 2 -> Score 2/3
        let candidate = make_candidate(3, 1, 3, 10, 100);
        let score = score_minimize_gaps(&state, 1, &candidate);
        assert!((score - 2.0 / 3.0).abs() < 0.01);
    }
}
