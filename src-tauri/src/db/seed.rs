use rusqlite::{params, Connection};
use crate::error::AppError;
use crate::models::SeedResult;

type TeacherSeedData = Vec<(&'static str, Option<&'static str>, f64, f64, f64, i32, Vec<i64>)>;

/// Löscht alle Stammdaten in FK-sicherer Reihenfolge.
fn clear_all_data(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch("
        DELETE FROM substitution_history;
        DELETE FROM schedule_entries;
        DELETE FROM schedules;
        DELETE FROM reward_points;
        DELETE FROM teacher_wishes;
        DELETE FROM teacher_preferences;
        DELETE FROM teacher_absences;
        DELETE FROM teacher_class_restrictions;
        DELETE FROM class_subjects;
        DELETE FROM teacher_subjects;
        DELETE FROM classes;
        DELETE FROM rooms;
        DELETE FROM teachers;
        DELETE FROM subjects;
    ")?;
    Ok(())
}

/// Erstellt einen Lehrer und gibt die ID zurück.
fn insert_teacher(conn: &Connection, name: &str, email: Option<&str>, engagement: f64, pedagogical: f64, part_time: f64, max_hours: i32) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO teachers (name, email, engagement_score, pedagogical_score, part_time_quota, max_hours_per_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![name, email, engagement, pedagogical, part_time, max_hours],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Erstellt ein Fach und gibt die ID zurück.
fn insert_subject(conn: &Connection, name: &str, short_name: &str, room_type: &str, weekly_hours: i32) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO subjects (name, short_name, room_type, weekly_hours_default) VALUES (?1, ?2, ?3, ?4)",
        params![name, short_name, room_type, weekly_hours],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Erstellt eine Klasse und gibt die ID zurück.
fn insert_class(conn: &Connection, name: &str, grade_level: i32, class_teacher_id: Option<i64>, student_count: i32) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO classes (name, grade_level, class_teacher_id, student_count) VALUES (?1, ?2, ?3, ?4)",
        params![name, grade_level, class_teacher_id, student_count],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Erstellt einen Raum und gibt die ID zurück.
fn insert_room(conn: &Connection, name: &str, room_type: &str, capacity: i32) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO rooms (name, room_type, capacity) VALUES (?1, ?2, ?3)",
        params![name, room_type, capacity],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Ordnet einem Lehrer ein Fach zu.
fn assign_subject(conn: &Connection, teacher_id: i64, subject_id: i64) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?1, ?2)",
        params![teacher_id, subject_id],
    )?;
    Ok(())
}

/// Beispieldaten für ein großes Gymnasium (Klasse 5-12).
fn seed_gymnasium(conn: &Connection) -> Result<SeedResult, AppError> {
    let mut result = SeedResult {
        teachers_created: 0, subjects_created: 0, classes_created: 0,
        rooms_created: 0, assignments_created: 0,
    };

    // --- Fächer ---
    let ma = insert_subject(conn, "Mathematik", "Ma", "standard", 4)?;
    let de = insert_subject(conn, "Deutsch", "De", "standard", 4)?;
    let en = insert_subject(conn, "Englisch", "En", "standard", 3)?;
    let fr = insert_subject(conn, "Französisch", "Fr", "standard", 3)?;
    let la = insert_subject(conn, "Latein", "La", "standard", 3)?;
    let ph = insert_subject(conn, "Physik", "Ph", "lab", 2)?;
    let ch = insert_subject(conn, "Chemie", "Ch", "lab", 2)?;
    let bi = insert_subject(conn, "Biologie", "Bio", "lab", 2)?;
    let ge = insert_subject(conn, "Geschichte", "Ge", "standard", 2)?;
    let gk = insert_subject(conn, "Gemeinschaftskunde", "GK", "standard", 2)?;
    let geo = insert_subject(conn, "Geographie", "Geo", "standard", 2)?;
    let ku = insert_subject(conn, "Kunst", "Ku", "standard", 2)?;
    let mu = insert_subject(conn, "Musik", "Mu", "music", 2)?;
    let sp = insert_subject(conn, "Sport", "Sp", "sports", 2)?;
    let eth = insert_subject(conn, "Ethik", "Eth", "standard", 2)?;
    let inf = insert_subject(conn, "Informatik", "Inf", "lab", 2)?;
    result.subjects_created = 16;

    // --- Lehrkräfte (80) ---
    let teacher_data: TeacherSeedData = vec![
        ("Dr. Thomas Müller", Some("mueller@gymnasium.de"), 0.85, 0.90, 1.0, 7, vec![ma, ph]),
        ("Sabine Schneider", Some("schneider@gymnasium.de"), 0.75, 0.80, 1.0, 7, vec![de, ge]),
        ("Markus Wagner", Some("wagner@gymnasium.de"), 0.90, 0.70, 1.0, 7, vec![en, fr]),
        ("Claudia Fischer", Some("fischer@gymnasium.de"), 0.80, 0.85, 1.0, 7, vec![ma]),
        ("Stefan Hoffmann", Some("hoffmann@gymnasium.de"), 0.70, 0.75, 0.75, 5, vec![de, eth]),
        ("Andrea Becker", Some("becker@gymnasium.de"), 0.85, 0.80, 1.0, 7, vec![en]),
        ("Dr. Frank Weber", Some("weber@gymnasium.de"), 0.95, 0.85, 1.0, 7, vec![ph, ma]),
        ("Karin Schulz", Some("schulz@gymnasium.de"), 0.65, 0.90, 0.5, 4, vec![bi, ch]),
        ("Michael Braun", Some("braun@gymnasium.de"), 0.80, 0.70, 1.0, 7, vec![sp]),
        ("Petra Richter", Some("richter@gymnasium.de"), 0.75, 0.80, 1.0, 7, vec![fr, la]),
        ("Hans-Jürgen Wolf", Some("wolf@gymnasium.de"), 0.70, 0.75, 1.0, 7, vec![ge, gk]),
        ("Martina Klein", Some("klein@gymnasium.de"), 0.85, 0.85, 0.75, 6, vec![mu]),
        ("Jörg Schroeder", Some("schroeder@gymnasium.de"), 0.80, 0.70, 1.0, 7, vec![ma, inf]),
        ("Susanne Neumann", Some("neumann@gymnasium.de"), 0.90, 0.80, 1.0, 7, vec![de]),
        ("Ralph Zimmermann", Some("zimmermann@gymnasium.de"), 0.75, 0.90, 1.0, 7, vec![ch, bi]),
        ("Birgit Krüger", Some("krueger@gymnasium.de"), 0.80, 0.75, 1.0, 7, vec![en, de]),
        ("Uwe Lang", Some("lang@gymnasium.de"), 0.65, 0.80, 0.5, 4, vec![geo]),
        ("Heike Hartmann", Some("hartmann@gymnasium.de"), 0.85, 0.85, 1.0, 7, vec![ku]),
        ("Bernd Fuchs", Some("fuchs@gymnasium.de"), 0.70, 0.70, 1.0, 7, vec![ma, ph]),
        ("Silke Werner", Some("werner@gymnasium.de"), 0.80, 0.90, 1.0, 7, vec![de, ge]),
        ("Olaf Schmitt", Some("schmitt@gymnasium.de"), 0.75, 0.75, 1.0, 7, vec![en]),
        ("Gabi Peters", Some("peters@gymnasium.de"), 0.90, 0.80, 0.75, 6, vec![fr]),
        ("Dirk Meier", Some("meier@gymnasium.de"), 0.80, 0.85, 1.0, 7, vec![la, ge]),
        ("Annett Scholz", Some("scholz@gymnasium.de"), 0.75, 0.70, 1.0, 7, vec![bi]),
        ("Rainer Vogel", Some("vogel@gymnasium.de"), 0.85, 0.80, 1.0, 7, vec![sp]),
        ("Doris Stein", Some("stein@gymnasium.de"), 0.70, 0.85, 0.5, 4, vec![ch]),
        ("Norbert Friedrich", Some("friedrich@gymnasium.de"), 0.80, 0.75, 1.0, 7, vec![gk, eth]),
        ("Elke Sommer", Some("sommer@gymnasium.de"), 0.75, 0.80, 1.0, 7, vec![mu, ku]),
        ("Karl Huber", Some("huber@gymnasium.de"), 0.85, 0.70, 1.0, 7, vec![inf, ma]),
        ("Monika Kaiser", Some("kaiser@gymnasium.de"), 0.90, 0.85, 1.0, 7, vec![de, en]),
        ("Detlef Krause", None, 0.70, 0.75, 1.0, 7, vec![ma]),
        ("Anja Lehmann", None, 0.80, 0.80, 1.0, 7, vec![en, fr]),
        ("Peter Baumann", None, 0.75, 0.70, 0.75, 5, vec![ge, gk]),
        ("Cornelia Schubert", None, 0.85, 0.85, 1.0, 7, vec![bi, ch]),
        ("Matthias Frank", None, 0.80, 0.75, 1.0, 7, vec![de]),
        ("Katrin Albrecht", None, 0.70, 0.80, 1.0, 7, vec![ph]),
        ("Torsten Simon", None, 0.90, 0.70, 1.0, 7, vec![sp]),
        ("Dagmar Brandt", None, 0.75, 0.85, 0.5, 4, vec![mu]),
        ("Jens Winkler", None, 0.80, 0.80, 1.0, 7, vec![geo, eth]),
        ("Marion Roth", None, 0.85, 0.75, 1.0, 7, vec![ma, inf]),
        ("Holger Beck", None, 0.70, 0.80, 1.0, 7, vec![en]),
        ("Renate Lorenz", None, 0.75, 0.85, 1.0, 7, vec![fr, la]),
        ("Andreas Schuster", None, 0.80, 0.70, 1.0, 7, vec![de, ge]),
        ("Beate Ludwig", None, 0.85, 0.80, 0.75, 6, vec![ch]),
        ("Gerald König", None, 0.90, 0.75, 1.0, 7, vec![ma]),
        ("Kathleen Otto", None, 0.75, 0.85, 1.0, 7, vec![en, de]),
        ("Ralf Große", None, 0.80, 0.70, 1.0, 7, vec![ph, ma]),
        ("Ute Walter", None, 0.70, 0.80, 1.0, 7, vec![bi]),
        ("Steffen Mayer", None, 0.85, 0.85, 1.0, 7, vec![sp, ge]),
        ("Evelyn Haase", None, 0.75, 0.75, 0.5, 4, vec![ku]),
        ("Christian Jung", None, 0.80, 0.80, 1.0, 7, vec![inf]),
        ("Heidi Voigt", None, 0.70, 0.85, 1.0, 7, vec![mu]),
        ("Sven Hansen", None, 0.85, 0.70, 1.0, 7, vec![de]),
        ("Gabriele Pohl", None, 0.75, 0.80, 1.0, 7, vec![en, fr]),
        ("Wolfgang Engel", None, 0.90, 0.75, 1.0, 7, vec![ma, ph]),
        ("Ingrid Horn", None, 0.80, 0.85, 0.75, 5, vec![geo]),
        ("Lutz Bergmann", None, 0.70, 0.70, 1.0, 7, vec![ge, gk]),
        ("Anke Dietrich", None, 0.85, 0.80, 1.0, 7, vec![bi, ch]),
        ("Felix Schreiber", None, 0.80, 0.85, 1.0, 7, vec![de, eth]),
        ("Lena Pfeiffer", None, 0.75, 0.75, 1.0, 7, vec![en]),
        ("Tobias Weise", None, 0.70, 0.80, 1.0, 7, vec![ma]),
        ("Sandra Kraft", None, 0.85, 0.70, 0.5, 4, vec![fr]),
        ("Martin Hahn", None, 0.80, 0.85, 1.0, 7, vec![sp]),
        ("Simone Arnold", None, 0.75, 0.80, 1.0, 7, vec![la]),
        ("Robert Langer", None, 0.90, 0.75, 1.0, 7, vec![ch, ph]),
        ("Jana Berger", None, 0.80, 0.85, 1.0, 7, vec![de, ge]),
        ("Tilo Wenzel", None, 0.70, 0.70, 1.0, 7, vec![ma, inf]),
        ("Daniela Kunze", None, 0.85, 0.80, 0.75, 6, vec![en]),
        ("Erik Noack", None, 0.75, 0.85, 1.0, 7, vec![bi]),
        ("Manuela Ulrich", None, 0.80, 0.75, 1.0, 7, vec![mu, ku]),
        ("Rico Lange", None, 0.85, 0.80, 1.0, 7, vec![geo, eth]),
        ("Bettina Franke", None, 0.70, 0.85, 1.0, 7, vec![de]),
        ("Henry Ziegler", None, 0.75, 0.70, 1.0, 7, vec![en, fr]),
        ("Ines Böhm", None, 0.80, 0.80, 0.5, 4, vec![gk]),
        ("Marco Keller", None, 0.85, 0.75, 1.0, 7, vec![sp]),
        ("Katja Barthel", None, 0.90, 0.85, 1.0, 7, vec![ma]),
        ("Ronny Riedel", None, 0.70, 0.80, 1.0, 7, vec![ph]),
        ("Sylvia Heinze", None, 0.80, 0.75, 1.0, 7, vec![de, ge]),
        ("Maik Lindner", None, 0.75, 0.85, 1.0, 7, vec![ch]),
        ("Constanze Seidel", None, 0.85, 0.80, 1.0, 7, vec![en]),
    ];

    let mut teacher_ids: Vec<i64> = Vec::new();
    for (name, email, eng, ped, pt, mh, subjects) in &teacher_data {
        let tid = insert_teacher(conn, name, *email, *eng, *ped, *pt, *mh)?;
        for &sid in subjects {
            assign_subject(conn, tid, sid)?;
            result.assignments_created += 1;
        }
        teacher_ids.push(tid);
        result.teachers_created += 1;
    }

    // --- Klassen (5a-12c = 24 Klassen) ---
    let mut class_idx = 0;
    for grade in 5..=12 {
        for suffix in ['a', 'b', 'c'] {
            let name = format!("{}{}", grade, suffix);
            let students = match grade {
                5..=6 => 28,
                7..=9 => 26,
                _ => 22,
            };
            let teacher_id = teacher_ids.get(class_idx).copied();
            insert_class(conn, &name, grade, teacher_id, students)?;
            result.classes_created += 1;
            class_idx += 1;
        }
    }

    // --- Räume (40) ---
    for i in 1..=20 { insert_room(conn, &format!("R{:03}", 100 + i), "standard", 32)?; }
    for i in 1..=4 { insert_room(conn, &format!("Ph{}", i), "lab", 28)?; }
    for i in 1..=4 { insert_room(conn, &format!("Ch{}", i), "lab", 28)?; }
    for i in 1..=3 { insert_room(conn, &format!("Bio{}", i), "lab", 28)?; }
    for i in 1..=2 { insert_room(conn, &format!("Inf{}", i), "lab", 30)?; }
    for i in 1..=3 { insert_room(conn, &format!("TH{}", i), "sports", 35)?; }
    for i in 1..=2 { insert_room(conn, &format!("Mu{}", i), "music", 25)?; }
    for i in 1..=2 { insert_room(conn, &format!("Ku{}", i), "standard", 25)?; }
    result.rooms_created = 40;

    Ok(result)
}

/// Beispieldaten für eine mittelgroße Grundschule (Klasse 1-4).
fn seed_grundschule(conn: &Connection) -> Result<SeedResult, AppError> {
    let mut result = SeedResult {
        teachers_created: 0, subjects_created: 0, classes_created: 0,
        rooms_created: 0, assignments_created: 0,
    };

    // --- Fächer ---
    let ma = insert_subject(conn, "Mathematik", "Ma", "standard", 5)?;
    let de = insert_subject(conn, "Deutsch", "De", "standard", 7)?;
    let su = insert_subject(conn, "Sachunterricht", "SU", "standard", 3)?;
    let sp = insert_subject(conn, "Sport", "Sp", "sports", 3)?;
    let ku = insert_subject(conn, "Kunst", "Ku", "standard", 2)?;
    let mu = insert_subject(conn, "Musik", "Mu", "music", 1)?;
    let we = insert_subject(conn, "Werken", "We", "standard", 2)?;
    let eth = insert_subject(conn, "Ethik/Religion", "Eth", "standard", 2)?;
    let en = insert_subject(conn, "Englisch", "En", "standard", 2)?;
    result.subjects_created = 9;

    // --- Lehrkräfte (25) ---
    let teacher_data: TeacherSeedData = vec![
        ("Katrin Müller", Some("k.mueller@grundschule.de"), 0.85, 0.90, 1.0, 6, vec![de, ma, su]),
        ("Petra Schmidt", Some("p.schmidt@grundschule.de"), 0.80, 0.85, 1.0, 6, vec![de, ma, eth]),
        ("Annett Fischer", Some("a.fischer@grundschule.de"), 0.90, 0.80, 1.0, 6, vec![de, su, ku]),
        ("Silke Hoffmann", Some("s.hoffmann@grundschule.de"), 0.75, 0.85, 0.75, 5, vec![ma, de]),
        ("Marion Becker", Some("m.becker@grundschule.de"), 0.80, 0.90, 1.0, 6, vec![de, ma, mu]),
        ("Heike Schulz", Some("h.schulz@grundschule.de"), 0.85, 0.75, 1.0, 6, vec![ma, su]),
        ("Cornelia Braun", Some("c.braun@grundschule.de"), 0.70, 0.85, 0.5, 4, vec![de, eth]),
        ("Birgit Richter", Some("b.richter@grundschule.de"), 0.80, 0.80, 1.0, 6, vec![sp]),
        ("Dagmar Wolf", Some("d.wolf@grundschule.de"), 0.85, 0.85, 1.0, 6, vec![de, ma, su]),
        ("Anja Klein", Some("a.klein@grundschule.de"), 0.75, 0.90, 1.0, 6, vec![en, de]),
        ("Susanne Lang", Some("s.lang@grundschule.de"), 0.80, 0.80, 0.75, 5, vec![ku, we]),
        ("Doris Krüger", None, 0.85, 0.75, 1.0, 6, vec![ma, de, su]),
        ("Elke Hartmann", None, 0.70, 0.85, 1.0, 6, vec![de, eth, mu]),
        ("Monika Werner", None, 0.80, 0.80, 1.0, 6, vec![ma, su]),
        ("Gabi Schmitt", None, 0.85, 0.90, 1.0, 6, vec![de, ma]),
        ("Renate Peters", None, 0.75, 0.75, 0.5, 4, vec![sp]),
        ("Beate Meier", None, 0.80, 0.85, 1.0, 6, vec![de, ku]),
        ("Manuela Scholz", None, 0.90, 0.80, 1.0, 6, vec![ma, su, de]),
        ("Gabriele Vogel", None, 0.75, 0.85, 1.0, 6, vec![en, de]),
        ("Ute Stein", None, 0.80, 0.70, 0.75, 5, vec![we, ku]),
        ("Ingrid Friedrich", None, 0.85, 0.85, 1.0, 6, vec![de, ma]),
        ("Kerstin Sommer", None, 0.70, 0.80, 1.0, 6, vec![mu, eth]),
        ("Bettina Huber", None, 0.80, 0.75, 1.0, 6, vec![sp]),
        ("Andrea Kaiser", None, 0.85, 0.85, 0.5, 4, vec![de, su]),
        ("Steffi Krause", None, 0.75, 0.80, 1.0, 6, vec![ma, en]),
    ];

    let mut teacher_ids: Vec<i64> = Vec::new();
    for (name, email, eng, ped, pt, mh, subjects) in &teacher_data {
        let tid = insert_teacher(conn, name, *email, *eng, *ped, *pt, *mh)?;
        for &sid in subjects {
            assign_subject(conn, tid, sid)?;
            result.assignments_created += 1;
        }
        teacher_ids.push(tid);
        result.teachers_created += 1;
    }

    // --- Klassen (1a-4c = 12 Klassen) ---
    let mut class_idx = 0;
    for grade in 1..=4 {
        for suffix in ['a', 'b', 'c'] {
            let name = format!("{}{}", grade, suffix);
            let students = match grade {
                1 => 22,
                2 => 24,
                3 => 25,
                _ => 23,
            };
            let teacher_id = teacher_ids.get(class_idx).copied();
            insert_class(conn, &name, grade, teacher_id, students)?;
            result.classes_created += 1;
            class_idx += 1;
        }
    }

    // --- Räume (15) ---
    for i in 1..=12 { insert_room(conn, &format!("Kl.{}", i), "standard", 28)?; }
    insert_room(conn, "TH1", "sports", 30)?;
    insert_room(conn, "Mu1", "music", 25)?;
    insert_room(conn, "We1", "standard", 20)?;
    result.rooms_created = 15;

    Ok(result)
}

/// Beispieldaten für eine kleine Mittelschule/Oberschule (Klasse 5-10).
fn seed_mittelschule(conn: &Connection) -> Result<SeedResult, AppError> {
    let mut result = SeedResult {
        teachers_created: 0, subjects_created: 0, classes_created: 0,
        rooms_created: 0, assignments_created: 0,
    };

    // --- Fächer ---
    let ma = insert_subject(conn, "Mathematik", "Ma", "standard", 4)?;
    let de = insert_subject(conn, "Deutsch", "De", "standard", 4)?;
    let en = insert_subject(conn, "Englisch", "En", "standard", 3)?;
    let ph = insert_subject(conn, "Physik", "Ph", "lab", 2)?;
    let ch = insert_subject(conn, "Chemie", "Ch", "lab", 2)?;
    let bi = insert_subject(conn, "Biologie", "Bio", "lab", 2)?;
    let ge = insert_subject(conn, "Geschichte", "Ge", "standard", 2)?;
    let geo = insert_subject(conn, "Geographie", "Geo", "standard", 2)?;
    let sp = insert_subject(conn, "Sport", "Sp", "sports", 2)?;
    let ku = insert_subject(conn, "Kunst", "Ku", "standard", 1)?;
    let mu = insert_subject(conn, "Musik", "Mu", "music", 1)?;
    let tc = insert_subject(conn, "Technik/Computer", "TC", "lab", 2)?;
    let wth = insert_subject(conn, "WTH", "WTH", "standard", 2)?;
    result.subjects_created = 13;

    // --- Lehrkräfte (35) ---
    let teacher_data: TeacherSeedData = vec![
        ("Andreas Müller", Some("a.mueller@mittelschule.de"), 0.80, 0.85, 1.0, 7, vec![ma, ph]),
        ("Kerstin Schmidt", Some("k.schmidt@mittelschule.de"), 0.85, 0.80, 1.0, 7, vec![de, ge]),
        ("Frank Fischer", Some("f.fischer@mittelschule.de"), 0.75, 0.75, 1.0, 7, vec![en]),
        ("Sabine Wagner", Some("s.wagner@mittelschule.de"), 0.80, 0.90, 1.0, 7, vec![de, en]),
        ("Michael Hoffmann", Some("m.hoffmann@mittelschule.de"), 0.70, 0.80, 0.75, 5, vec![ma]),
        ("Annett Becker", Some("a.becker@mittelschule.de"), 0.85, 0.85, 1.0, 7, vec![bi, ch]),
        ("Jens Schulz", Some("j.schulz@mittelschule.de"), 0.90, 0.70, 1.0, 7, vec![sp]),
        ("Heike Braun", Some("h.braun@mittelschule.de"), 0.75, 0.80, 1.0, 7, vec![ge, geo]),
        ("Torsten Richter", Some("t.richter@mittelschule.de"), 0.80, 0.85, 1.0, 7, vec![ma, tc]),
        ("Claudia Wolf", Some("c.wolf@mittelschule.de"), 0.85, 0.75, 0.5, 4, vec![de]),
        ("Uwe Klein", Some("u.klein@mittelschule.de"), 0.70, 0.80, 1.0, 7, vec![ph, ma]),
        ("Petra Schroeder", Some("p.schroeder@mittelschule.de"), 0.80, 0.85, 1.0, 7, vec![en]),
        ("Matthias Neumann", Some("m.neumann@mittelschule.de"), 0.85, 0.70, 1.0, 7, vec![mu, ku]),
        ("Silke Zimmermann", Some("s.zimmermann@mittelschule.de"), 0.75, 0.85, 1.0, 7, vec![bi]),
        ("Ralph Krüger", Some("r.krueger@mittelschule.de"), 0.80, 0.80, 0.75, 6, vec![ch]),
        ("Martina Lang", None, 0.85, 0.85, 1.0, 7, vec![de, ge]),
        ("Bernd Hartmann", None, 0.70, 0.75, 1.0, 7, vec![sp]),
        ("Anja Fuchs", None, 0.80, 0.80, 1.0, 7, vec![ma, ph]),
        ("Steffen Werner", None, 0.75, 0.85, 1.0, 7, vec![en, de]),
        ("Marion Schmitt", None, 0.85, 0.70, 0.5, 4, vec![ku]),
        ("Gerald Peters", None, 0.80, 0.80, 1.0, 7, vec![geo, wth]),
        ("Katrin Meier", None, 0.90, 0.85, 1.0, 7, vec![de, en]),
        ("Olaf Scholz", None, 0.75, 0.75, 1.0, 7, vec![ma]),
        ("Birgit Vogel", None, 0.80, 0.85, 1.0, 7, vec![bi, ch]),
        ("Sven Stein", None, 0.85, 0.70, 1.0, 7, vec![tc, ph]),
        ("Elke Friedrich", None, 0.70, 0.80, 0.75, 5, vec![de]),
        ("Rico Sommer", None, 0.80, 0.85, 1.0, 7, vec![sp, ge]),
        ("Doris Huber", None, 0.75, 0.75, 1.0, 7, vec![mu]),
        ("Christian Kaiser", None, 0.85, 0.80, 1.0, 7, vec![en]),
        ("Beate Krause", None, 0.80, 0.85, 1.0, 7, vec![ma, wth]),
        ("Tilo Lehmann", None, 0.70, 0.70, 1.0, 7, vec![geo]),
        ("Sandra Baumann", None, 0.85, 0.80, 0.5, 4, vec![de, ge]),
        ("Marco Schubert", None, 0.80, 0.75, 1.0, 7, vec![ph, ch]),
        ("Evelyn Frank", None, 0.75, 0.85, 1.0, 7, vec![en, de]),
        ("Henry Albrecht", None, 0.80, 0.80, 1.0, 7, vec![ma, tc]),
    ];

    let mut teacher_ids: Vec<i64> = Vec::new();
    for (name, email, eng, ped, pt, mh, subjects) in &teacher_data {
        let tid = insert_teacher(conn, name, *email, *eng, *ped, *pt, *mh)?;
        for &sid in subjects {
            assign_subject(conn, tid, sid)?;
            result.assignments_created += 1;
        }
        teacher_ids.push(tid);
        result.teachers_created += 1;
    }

    // --- Klassen (5a-10b = 15 Klassen, manche nur a+b) ---
    let mut class_idx = 0;
    for grade in 5..=10 {
        let suffixes: &[char] = if grade <= 7 { &['a', 'b', 'c'] } else { &['a', 'b'] };
        for suffix in suffixes {
            let name = format!("{}{}", grade, suffix);
            let students = match grade {
                5..=6 => 25,
                7..=8 => 24,
                _ => 20,
            };
            let teacher_id = teacher_ids.get(class_idx).copied();
            insert_class(conn, &name, grade, teacher_id, students)?;
            result.classes_created += 1;
            class_idx += 1;
        }
    }

    // --- Räume (20) ---
    for i in 1..=10 { insert_room(conn, &format!("R{:03}", 200 + i), "standard", 30)?; }
    for i in 1..=3 { insert_room(conn, &format!("NW{}", i), "lab", 25)?; }
    for i in 1..=2 { insert_room(conn, &format!("PC{}", i), "lab", 28)?; }
    for i in 1..=2 { insert_room(conn, &format!("TH{}", i), "sports", 32)?; }
    insert_room(conn, "Mu1", "music", 25)?;
    insert_room(conn, "Ku1", "standard", 25)?;
    insert_room(conn, "We1", "standard", 20)?;
    result.rooms_created = 20;

    Ok(result)
}

/// Setzt Stundentafel-Overrides (class_subjects) für realistische pro-Klasse-Stundenzahlen.
/// Nur Einträge, die vom Fach-Default abweichen, werden geschrieben.
fn seed_class_subjects(conn: &Connection, school_type: &str) -> Result<(), AppError> {
    // Klassen mit Klassenstufe laden
    let mut stmt = conn.prepare("SELECT id, grade_level FROM classes ORDER BY grade_level, name")?;
    let classes: Vec<(i64, i32)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .filter_map(|r| r.ok())
        .collect();

    // Fächer mit Kürzel und Default-Stunden laden
    let mut stmt = conn.prepare("SELECT id, short_name, weekly_hours_default FROM subjects")?;
    let subjects: Vec<(i64, String, i32)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .filter_map(|r| r.ok())
        .collect();

    for (class_id, grade) in &classes {
        for (subject_id, short_name, default_hours) in &subjects {
            let override_hours = match school_type {
                "gymnasium" | "vollstaendig" => gymnasium_hours(short_name, *grade),
                "grundschule" => grundschule_hours(short_name, *grade),
                "mittelschule" => mittelschule_hours(short_name, *grade),
                _ => None,
            };

            if let Some(hours) = override_hours {
                if hours != *default_hours {
                    conn.execute(
                        "INSERT OR REPLACE INTO class_subjects (class_id, subject_id, weekly_hours) VALUES (?1, ?2, ?3)",
                        params![class_id, subject_id, hours],
                    )?;
                }
            }
        }
    }

    Ok(())
}

/// Gymnasium Stundentafel-Overrides (nur Abweichungen vom Default).
fn gymnasium_hours(short_name: &str, grade: i32) -> Option<i32> {
    match (short_name, grade) {
        // Deutsch: Default 4, in 5-6 höher
        ("De", 5..=6) => Some(5),
        // Englisch: Default 3, in 5-6 höher
        ("En", 5..=6) => Some(4),
        // Französisch: Default 3, nicht in 5, erhöht in 6
        ("Fr", 5) => Some(0),
        ("Fr", 6) => Some(4),
        // Latein: Default 3, nicht in 5-6
        ("La", 5..=6) => Some(0),
        // Physik: Default 2, nicht in 5
        ("Ph", 5) => Some(0),
        // Chemie: Default 2, nicht in 5-6
        ("Ch", 5..=6) => Some(0),
        // Geschichte: Default 2, reduziert in 5
        ("Ge", 5) => Some(1),
        // Gemeinschaftskunde: Default 2, nicht in 5-7, reduziert in 8
        ("GK", 5..=7) => Some(0),
        ("GK", 8) => Some(1),
        // Sport: Default 2, erhöht in 5-7
        ("Sp", 5..=7) => Some(3),
        // Informatik: Default 2, nicht in 5-6, reduziert in 7-8
        ("Inf", 5..=6) => Some(0),
        ("Inf", 7..=8) => Some(1),
        // Kunst: Default 2, reduziert ab 9
        ("Ku", 9..=12) => Some(1),
        // Musik: Default 2, reduziert ab 9
        ("Mu", 9..=12) => Some(1),
        _ => None,
    }
}

/// Grundschule Stundentafel-Overrides.
fn grundschule_hours(short_name: &str, grade: i32) -> Option<i32> {
    match (short_name, grade) {
        // Mathematik: Default 5, in Klasse 1 weniger
        ("Ma", 1) => Some(4),
        // Deutsch: Default 7, Klasse 1 etwas weniger, Klasse 3-4 weniger
        ("De", 1) => Some(6),
        ("De", 3..=4) => Some(6),
        // Sachunterricht: Default 3, in Klasse 1 weniger
        ("SU", 1) => Some(2),
        // Sport: Default 3, gleich überall → kein Override
        // Kunst: Default 2, gleich überall
        // Musik: Default 1, in Klasse 3-4 erhöht
        ("Mu", 3..=4) => Some(2),
        // Werken: Default 2, nicht in Klasse 1
        ("We", 1) => Some(1),
        // Englisch: Default 2, nicht in Klasse 1-2
        ("En", 1..=2) => Some(0),
        // Ethik: Default 2, reduziert in 1
        ("Eth", 1) => Some(1),
        _ => None,
    }
}

/// Mittelschule Stundentafel-Overrides.
fn mittelschule_hours(short_name: &str, grade: i32) -> Option<i32> {
    match (short_name, grade) {
        // Deutsch: Default 4, in 5 erhöht
        ("De", 5) => Some(5),
        // Englisch: Default 3, in 5 erhöht
        ("En", 5) => Some(4),
        // Physik: Default 2, nicht in 5
        ("Ph", 5) => Some(0),
        // Chemie: Default 2, nicht in 5-6
        ("Ch", 5..=6) => Some(0),
        // Sport: Default 2, in 5-6 erhöht
        ("Sp", 5..=6) => Some(3),
        // Kunst: Default 1, in 5-6 erhöht
        ("Ku", 5..=6) => Some(2),
        // Musik: Default 1, in 5-6 erhöht
        ("Mu", 5..=6) => Some(2),
        // Technik/Computer: Default 2, nicht in 5
        ("TC", 5) => Some(0),
        ("TC", 6) => Some(1),
        // WTH: Default 2, nicht in 5-6
        ("WTH", 5..=6) => Some(0),
        ("WTH", 7) => Some(1),
        _ => None,
    }
}

/// Erstellt Beispiel-Belohnungspunkte und Sonderwünsche für die ersten Lehrer.
fn seed_rewards_and_wishes(conn: &Connection) -> Result<(), AppError> {
    // Lehrer-IDs laden
    let mut stmt = conn.prepare("SELECT id FROM teachers ORDER BY id LIMIT 10")?;
    let teacher_ids: Vec<i64> = stmt
        .query_map([], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    if teacher_ids.is_empty() {
        return Ok(());
    }

    // Belohnungspunkte – alle 8 Kategorien vertreten
    let reward_data: Vec<(usize, i32, &str, &str)> = vec![
        (0, 5, "extra_tasks", "Projektwoche organisiert"),
        (0, 3, "mentoring", "Referendar betreut"),
        (0, 2, "committee_work", "Fachkonferenz geleitet"),
        (1, 4, "event_organization", "Schulfest koordiniert"),
        (1, 3, "training", "Fortbildung Digitalpakt"),
        (2, 2, "training", "Fortbildung absolviert"),
        (2, 3, "committee_work", "Fachkonferenzleitung"),
        (2, 4, "project_lead", "Schüleraustausch organisiert"),
        (3, 6, "exam_supervision", "Prüfungsaufsicht Abitur"),
        (3, 2, "project_lead", "MINT-AG geleitet"),
        (4, 1, "other", "Vertretungsbereitschaft"),
        (4, 3, "mentoring", "Neue Kollegin eingearbeitet"),
        (5, 4, "extra_tasks", "Schulbibliothek betreut"),
        (5, 2, "event_organization", "Tag der offenen Tür"),
        (6, 3, "exam_supervision", "Nachprüfungen beaufsichtigt"),
        (7, 5, "project_lead", "Theateraufführung geleitet"),
        (8, 2, "training", "Erste-Hilfe-Kurs durchgeführt"),
        (9, 4, "committee_work", "Schulkonferenz-Mitglied"),
    ];

    for (idx, pts, cat, reason) in &reward_data {
        if let Some(&tid) = teacher_ids.get(*idx) {
            conn.execute(
                "INSERT INTO reward_points (teacher_id, points, category, reason) VALUES (?1, ?2, ?3, ?4)",
                params![tid, pts, cat, reason],
            )?;
        }
    }

    // Sonderwünsche – alle 6 Typen vertreten
    let wish_data: Vec<(usize, &str, &str, &str, &str)> = vec![
        (0, "prefer_morning", "high", "{}", "Betreuung nachmittags"),
        (1, "free_day", "medium", r#"{"day_of_week":5}"#, "Freitag frei wegen Teilzeit"),
        (2, "compact_schedule", "low", "{}", "Möchte wenig Hohlstunden"),
        (3, "max_consecutive", "high", r#"{"max_hours":3}"#, "Stimme schonen"),
        (4, "prefer_afternoon", "medium", "{}", "Morgens Kinderbetreuung"),
        (5, "free_day", "high", r#"{"day_of_week":3}"#, "Mittwoch Fortbildung"),
        (6, "prefer_morning", "low", "{}", ""),
        (7, "compact_schedule", "medium", "{}", "Lange Anfahrt"),
        (8, "max_consecutive", "medium", r#"{"max_hours":4}"#, ""),
        (9, "custom", "low", "{}", "Wenn möglich nicht 1. Stunde"),
    ];

    for (idx, wtype, prio, params, note) in &wish_data {
        if let Some(&tid) = teacher_ids.get(*idx) {
            conn.execute(
                "INSERT INTO teacher_wishes (teacher_id, wish_type, priority, parameters, note)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![tid, wtype, prio, params, note],
            )?;
        }
    }

    Ok(())
}

/// Setzt konfigurierbare Fachfolge-Paare als einzelne Regeln.
fn seed_subject_combination_rules(conn: &Connection) -> Result<(), AppError> {
    // Bestehende Fachfolge-Regeln entfernen und neue anlegen
    conn.execute("DELETE FROM constraint_rules WHERE rule_type = 'forbidden_subject_sequence'", [])?;

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM constraint_rules", [], |row| row.get(0),
    )?;

    let pairs: Vec<(&str, &str)> = vec![
        ("Sport", "Mathe"), ("Sp", "Ma"), ("Sport", "Mathematik"),
        ("Deutsch", "Englisch"), ("De", "En"),
    ];

    for (i, (first, second)) in pairs.iter().enumerate() {
        let params_json = serde_json::json!({"first": first, "second": second}).to_string();
        let desc = format!("Kein {} nach {}", first, second);
        conn.execute(
            "INSERT INTO constraint_rules (rule_type, description, weight, is_active, parameters, sort_order, scope_type, scope_id)
             VALUES ('forbidden_subject_sequence', ?1, 0.3, 1, ?2, ?3, 'global', NULL)",
            params![desc, params_json, max_order + 1 + i as i32],
        )?;
    }
    Ok(())
}

/// Hauptfunktion: Löscht alle Daten und erstellt Beispieldaten für den gewählten Schultyp.
pub fn seed_example_data(conn: &Connection, school_type: &str) -> Result<SeedResult, AppError> {
    clear_all_data(conn)?;

    let result = match school_type {
        "gymnasium" => seed_gymnasium(conn),
        "grundschule" => seed_grundschule(conn),
        "mittelschule" => seed_mittelschule(conn),
        "vollstaendig" => seed_gymnasium(conn),
        _ => Err(AppError::Validation(format!("Unbekannter Schultyp: {}", school_type))),
    }?;

    // Stundentafel-Overrides (pro Klasse/Fach)
    seed_class_subjects(conn, school_type)?;

    // Belohnungspunkte und Sonderwünsche für Beispieldaten
    seed_rewards_and_wishes(conn)?;

    // Beim vollständigen Beispiel auch Fachfolge-Regeln setzen
    if school_type == "vollstaendig" {
        seed_subject_combination_rules(conn)?;
    }

    Ok(result)
}
