use std::collections::HashSet;
use crate::models::{Teacher, TeacherPreference};
use super::types::{AssignmentCandidate, ScheduleState};

// =============================================================================
// Hard Constraints – muessen alle true sein, sonst wird Kandidat verworfen
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

/// Lehrer-Tageslimit nicht ueberschritten
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

/// Sammelfunktion: Alle Hard Constraints pruefen
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
// Soft Constraints – Score 0.0 bis 1.0, hoeher = besser
// =============================================================================

/// Kein Sport nach Mathe (und umgekehrt).
/// Prueft, ob direkt vorher oder nachher ein unerwuenschter Fachwechsel stattfinden wuerde.
pub fn score_no_sports_after_math(
    state: &ScheduleState,
    class_id: i64,
    subject_short_name: &str,
    candidate: &AssignmentCandidate,
) -> f64 {
    let is_sports = subject_short_name == "Sp" || subject_short_name == "Sport";
    let is_math = subject_short_name == "Ma" || subject_short_name == "Mathe" || subject_short_name == "Mathematik";

    if !is_sports && !is_math {
        return 1.0;
    }

    let key = (class_id, candidate.day_of_week);
    let subjects = match state.class_day_subjects.get(&key) {
        Some(s) => s,
        None => return 1.0,
    };

    // Pruefe Nachbar-Perioden
    let adjacent_periods = [candidate.period - 1, candidate.period + 1];
    for &adj_period in &adjacent_periods {
        for &(period, _subject_id) in subjects {
            if period == adj_period {
                // Wir koennen nur den Short Name des Nachbar-Fachs pruefen,
                // wenn wir ihn kennen. Da wir hier nur subject_ids haben,
                // uebergeben wir die Pruefung an den Scorer, der die Subject-Map hat.
                // Hier geben wir einen Penalty wenn Sport/Mathe in benachbarten Perioden.
                // In der Scorer-Integration wird das korrekt aufgeloest.
                return 0.8; // Leichter Penalty weil Nachbar-Periode belegt ist
            }
        }
    }

    1.0
}

/// Gleichmaessige Wochenverteilung: Fach auf verschiedene Tage verteilen.
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
            // Zaehle wie viele verschiedene Tage bereits belegt
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

/// Hohlstunden minimieren: Verhaeltnis gefuellte Stunden zu Spannweite.
/// Je weniger Luecken, desto besser.
pub fn score_minimize_gaps(
    state: &ScheduleState,
    class_id: i64,
    candidate: &AssignmentCandidate,
) -> f64 {
    let key = (class_id, candidate.day_of_week);
    let periods = match state.class_day_periods.get(&key) {
        Some(p) if !p.is_empty() => p,
        _ => return 1.0, // Erster Eintrag an diesem Tag: keine Luecken
    };

    // Simuliere das Hinzufuegen der neuen Periode
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
        0.8 // Neutral fuer andere Stunden
    }
}

/// Hauptfaecher (Ma, De, En) bevorzugt in Perioden 1-4.
pub fn score_main_subjects_morning(
    subject_short_name: &str,
    candidate: &AssignmentCandidate,
) -> f64 {
    let is_main = matches!(
        subject_short_name,
        "Ma" | "Mathe" | "Mathematik" | "De" | "Deutsch" | "En" | "Englisch" | "Eng"
    );

    if !is_main {
        return 0.8; // Neutral fuer Nebenfaecher
    }

    match candidate.period {
        1..=4 => 1.0,   // Vormittags = ideal
        5..=6 => 0.6,   // Frueh-Nachmittag = akzeptabel
        _ => 0.3,        // Spaet = schlecht
    }
}

/// Wunschzeiten der Lehrkraefte: preferred=1.0, unavailable=0.0, neutral=0.8
pub fn score_teacher_preferences(
    preferences: &[TeacherPreference],
    candidate: &AssignmentCandidate,
) -> f64 {
    for pref in preferences {
        if pref.day_of_week == candidate.day_of_week && pref.period == candidate.period {
            return match pref.preference_type.as_str() {
                "preferred" => 1.0,
                "unavailable" => 0.0,
                _ => 0.8,
            };
        }
    }
    0.8 // Keine Praeferenz = neutral
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
        assert_eq!(score_teacher_preferences(&prefs, &preferred), 1.0);

        let unavailable = make_candidate(5, 1, 5, 10, 100);
        assert_eq!(score_teacher_preferences(&prefs, &unavailable), 0.0);

        let neutral = make_candidate(3, 1, 3, 10, 100);
        assert_eq!(score_teacher_preferences(&prefs, &neutral), 0.8);
    }

    #[test]
    fn test_minimize_gaps_no_gaps() {
        let mut state = ScheduleState::new();
        // Klasse 1, Montag: Perioden 1, 2
        state.class_day_periods.entry((1, 1)).or_default().insert(1);
        state.class_day_periods.entry((1, 1)).or_default().insert(2);

        // Periode 3 hinzufuegen: Spannweite 3, gefuellt 3 -> Score 1.0
        let candidate = make_candidate(3, 1, 3, 10, 100);
        assert_eq!(score_minimize_gaps(&state, 1, &candidate), 1.0);
    }

    #[test]
    fn test_minimize_gaps_with_gap() {
        let mut state = ScheduleState::new();
        // Klasse 1, Montag: Periode 1
        state.class_day_periods.entry((1, 1)).or_default().insert(1);

        // Periode 3 hinzufuegen: Spannweite 3, gefuellt 2 -> Score 2/3
        let candidate = make_candidate(3, 1, 3, 10, 100);
        let score = score_minimize_gaps(&state, 1, &candidate);
        assert!((score - 2.0 / 3.0).abs() < 0.01);
    }
}
