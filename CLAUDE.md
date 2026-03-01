# CLAUDE.md – Stundenplan-System

> Diese Datei wird von Claude Code automatisch gelesen. Sie beschreibt das Projekt,
> die Architektur, Konventionen und typische Aufgaben.

---

## Projektübersicht

**Name:** Stundenplan-System (v1.0)
**Ziel:** Offline-fähige Desktop-Anwendung zur automatisierten Erstellung und Optimierung
von Stunden- und Vertretungsplänen für Schulen.
**Zielgruppe:** Lehrkräfte und Schulleitung

**Kerndifferenzierungsmerkmale:**
- Vollständige Transparenz jeder Planungsentscheidung (Decision-Log in jedem Eintrag)
- Profilbasierte, gewichtete Vertretungspriorisierung mit 5-Faktoren-Scoring
- Ranking-System mit Belohnungspunkten (8 Kategorien) → Multiplikator 0.5–1.5×
- Sonderwünsche der Lehrkräfte (6 Typen, 3 Prioritäten) → Solver-integriert
- Stundentafel (Wochenstunden-Override pro Klasse×Fach)
- Lehrer-Klassen-Zuordnung (Hard: Kann / Soft: Möchte)
- Ed25519-Lizenzsystem mit eigenem License-Manager-GUI
- Offline-first, DSGVO-konform, kein Cloud-Zwang

---

## Tech-Stack

| Schicht | Technologie |
|---------|------------|
| Frontend | React 18 + TypeScript |
| State | Zustand (18 Stores) |
| Styling | Tailwind CSS v4 |
| Drag & Drop | @dnd-kit (nur ScheduleGrid) |
| Desktop-Wrapper | Tauri 2 (Plugins: opener, dialog, fs) |
| Backend/Solver | Rust (direkt in Tauri) |
| Datenbank | SQLite via rusqlite (bundled) |
| Lizenz | Ed25519 via `license_core` Crate |
| Build | Vite |

---

## Projektstruktur

```
src/                              # React Frontend
├── components/
│   ├── absence/                  # Abwesenheitsverwaltung
│   ├── class/                    # Klassen + Stundentafel (ClassCurriculumEditor)
│   ├── comparison/               # Planvergleich (Grid, Stats)
│   ├── dashboard/                # Dashboard-Übersicht
│   ├── grid/                     # Stundenplan-Grid (DnD, EntryDetail, ViewSelector)
│   ├── help/                     # Hilfe-Seite
│   ├── holiday/                  # Ferienverwaltung
│   ├── license/                  # LicenseGate
│   ├── reports/                  # Berichte (ScoreHeatmap, RoomUtilization)
│   ├── room/                     # Raumverwaltung
│   ├── rules/                    # Constraints (RuleForm, SubjectPairEditor)
│   ├── shared/                   # Modal, ConfirmDialog, Toast, Spinner, Tooltip, SeedDataButton
│   ├── subject/                  # Fächerverwaltung
│   ├── substitution/             # Vertretungsmodul
│   └── teacher/                  # Lehrkräfte (Preferences, Rewards, Wishes, ClassPanel, Ranking)
├── store/                        # 18 Zustand Stores
├── types/                        # TypeScript-Interfaces (index, reward, wish, teacherClass)
├── utils/                        # constraintLabels, wishLabels
└── App.tsx                       # 14 Tabs

src-tauri/src/                    # Rust Backend
├── commands/                     # 19 Command-Module (106 Commands in lib.rs)
│   ├── teacher.rs, subject.rs, class.rs, room.rs, time_slot.rs
│   ├── schedule.rs, constraint.rs, preference.rs
│   ├── substitution.rs, holiday.rs, absence.rs
│   ├── report.rs, seed.rs, reward.rs, wish.rs
│   ├── license.rs, setting.rs, class_subject.rs, teacher_class.rs
│   └── mod.rs
├── db/                           # Datenbankschicht (1 Datei pro Tabelle)
├── models/                       # Rust-Datenstrukturen (Serde)
├── solver/
│   ├── greedy.rs                 # Greedy-Initiallösung
│   ├── tabu_search.rs            # Tabu-Search-Optimierung
│   ├── constraints.rs            # Hard & Soft Constraint Logik
│   ├── scorer.rs                 # Planqualitäts-Scoring
│   └── types.rs                  # Solver-Datentypen
├── substitution/mod.rs           # Vertretungs-Scoring
├── license/mod.rs                # Ed25519-Lizenzvalidierung
├── error.rs                      # AppError (thiserror)
└── lib.rs                        # Tauri-Setup + invoke_handler (106 Commands)

tools/license-manager/            # Standalone Tauri-App zur Lizenzerstellung
```

---

## Datenmodell (SQLite – 18 Tabellen)

| Tabelle | Beschreibung |
|---------|-------------|
| `teachers` | Lehrkräfte (engagement_score, pedagogical_score, part_time_quota, max_hours_per_day) |
| `subjects` | Fächer mit room_type (standard/sports/lab/music) + weekly_hours_default |
| `teacher_subjects` | M:N Qualifikationszuordnung |
| `classes` | Klassen mit grade_level, class_teacher_id, student_count |
| `rooms` | Räume mit room_type + capacity |
| `time_slots` | 5 Tage × 9 Stunden (day_of_week 1–5, period 1–9) |
| `schedules` | Plan-Versionen (draft/active/archived) |
| `schedule_entries` | Einzelstunden mit `decision_log` (JSON-Transparenz) |
| `constraint_rules` | Soft Constraints mit weight, sort_order, scope_type/scope_id, parameters |
| `substitution_history` | Vertretungsprotokoll mit score + decision_reason |
| `teacher_preferences` | Wunschzeiten (preferred/unavailable) pro day×period |
| `holidays` | Schulferien (Import via JSON, school_year + state) |
| `teacher_absences` | Langzeitabwesenheiten (illness/maternity/sabbatical/training/other) |
| `reward_points` | Belohnungspunkte (8 Kategorien, points + reason + date) |
| `teacher_wishes` | Sonderwünsche (6 Typen, 3 Prioritäten, parameters JSON) |
| `class_subjects` | Stundentafel-Override (weekly_hours pro Klasse×Fach) |
| `teacher_class_restrictions` | Lehrer-Klassen (preference = Soft, qualification = Hard) |
| `app_settings` | Key-Value-Einstellungen (use_engagement_score, use_pedagogical_score) |

**Schema-Version:** 6 (via `migrations.rs`)

---

## Solver-Architektur

Das Stundenplanproblem ist ein **Constraint Satisfaction Problem (CSP), NP-hart**.

**2-Phasen-Ansatz (in `src-tauri/src/solver/`):**

| Phase | Datei | Beschreibung |
|-------|-------|-------------|
| 1 – Greedy | `greedy.rs` | Schnelle Initiallösung, schwierigste Constraints zuerst |
| 2 – Tabu Search | `tabu_search.rs` | Iterative Verbesserung, Tabu-Liste verhindert Zyklen |

**Hard Constraints (zwingend):**
1. Keine Doppelbelegung Lehrkraft / Raum / Klasse
2. Fachstunden-Soll je Woche (aus `class_subjects` oder `weekly_hours_default`)
3. Raumtypbindung (Sport → Sporthalle)
4. Maximalstunden/Tag je Lehrkraft (part_time_quota-skaliert)
5. Teacher-Class Qualifikation (nur zugeordnete Klassen, wenn `qualification`-Einträge existieren)

**Soft Constraints (gewichtbar, aus `constraint_rules`-Tabelle):**

| Typ | Beschreibung |
|-----|-------------|
| `forbidden_subject_sequence` | Verbotene Fächerfolge (z.B. Sport→Mathe), konfigurierbar via SubjectPairEditor |
| `even_weekly_distribution` | Gleichmäßige Wochenverteilung |
| `avoid_edge_periods` | Randstunden (1. + letzte) vermeiden |
| `minimize_gaps` | Hohlstunden minimieren |
| `class_teacher_first_period` | Klassenleiter bevorzugt 1. Stunde |
| `main_subjects_morning` | Hauptfächer vormittags |
| `teacher_preferences` | Wunschzeiten der Lehrkräfte |
| `teacher_wishes` | Sonderwünsche (× Ranking-Multiplikator) |

**Scope-System:** Jede Regel kann `scope_type` (global/class/teacher/room) + `scope_id` haben.

**Ranking-Multiplikator:** Belohnungspunkte → Rang → Multiplikator (0.5–1.5×), verstärkt
Präferenz- und Wunsch-Scores im Solver.

**class_subject_overrides:** Solver liest `class_subjects`-Tabelle und nutzt Override-Stunden
statt `weekly_hours_default` falls vorhanden.

---

## Vertretungsmodul (`substitution/mod.rs`)

**Scoring-Formel (5 Faktoren, Standardgewichte):**

| Faktor | Gewicht | Beschreibung |
|--------|---------|-------------|
| engagement_score | 0.20 | Engagement der Lehrkraft (togglebar via Settings) |
| 1 − substitution_load | 0.25 | Umgekehrte bisherige Vertretungslast |
| pedagogical_score | 0.15 | Pädagogische Bewertung (togglebar via Settings) |
| 1 − weekly_load | 0.20 | Umgekehrte aktuelle Wochenbelastung |
| subject_qualification | 0.20 | Fachqualifikation (1.0 wenn qualifiziert) |

**Features:** Abwesenheits-Filter, Ferien-Check, deutsche Entscheidungsbegründung,
`use_engagement_score`/`use_pedagogical_score` Toggles via app_settings.

---

## Lizenzsystem

| Komponente | Beschreibung |
|-----------|-------------|
| `license_core` | Shared Crate: Ed25519-Signatur, Payload (school, expiry, features) |
| `license/mod.rs` | Validierung beim App-Start, LicenseStatus in Tauri-State |
| `LicenseGate.tsx` | Frontend-Gate: sperrt App wenn ungültig/abgelaufen |
| `tools/license-manager/` | Standalone Tauri-App zum Erstellen + Signieren von Lizenzen |

---

## Belohnungssystem (Rewards + Ranking)

**8 Kategorien:** extra_tasks, mentoring, event_organization, training, committee_work,
exam_supervision, project_lead, other

**Ranking:** Alle Lehrkräfte werden nach Gesamtpunkten sortiert → Rang → Multiplikator (0.5–1.5×).
Der Multiplikator verstärkt Präferenz- und Wunsch-Scores im Solver.

**UI:** RewardPointsPanel (pro Lehrer-Tab), TeacherRankingView (Gesamtübersicht)

---

## Sonderwünsche (Teacher Wishes)

**6 Wunschtypen:** prefer_morning, prefer_afternoon, free_day, max_consecutive,
compact_schedule, custom

**3 Prioritäten:** low, medium, high (Gewichtungsfaktor)

**Solver-Integration:** `teacher_wishes`-Constraint in constraints.rs, Score × Ranking-Multiplikator.

---

## Stundentafel (Class Subjects)

`class_subjects`-Tabelle: Override der `weekly_hours_default` pro Klasse×Fach.
Fallback auf `subjects.weekly_hours_default` wenn kein Override existiert.

**UI:** ClassCurriculumEditor (Matrix Klassen×Fächer, Inline-Edit, Blau=Override, Grau=Default)

**Seed:** `seed_class_subjects()` generiert realistische Stundentafeln für Gymnasium/Grundschule/Mittelschule.

---

## Lehrer-Klassen-Zuordnung

| Typ | Wirkung |
|-----|--------|
| `qualification` | **Hard Constraint** – Lehrkraft wird NUR für diese Klassen eingeplant |
| `preference` | **Soft Constraint** – Lehrkraft wird bevorzugt für diese Klassen eingeplant |

**UI:** TeacherClassPanel (Checkbox-Grid mit Typ-Selector: Möchte/Kann)

---

## UI-Tabs (App.tsx)

| Tab | Komponente | Beschreibung |
|-----|-----------|-------------|
| Dashboard | DashboardView | Übersicht, Statistiken |
| Stundenplan | ScheduleView | Grid mit DnD, Generierung, Optimierung |
| Lehrkräfte | TeacherList | CRUD + 5 Sub-Tabs (Fächer, Präferenzen, Belohnungen, Wünsche, Klassen) |
| Fächer | SubjectList | CRUD |
| Klassen | ClassList | CRUD + Stundentafel-Editor |
| Räume | RoomList | CRUD |
| Regeln | RulesPanel | Constraint-Verwaltung (Gewicht-Sortierung, SubjectPairEditor) |
| Ferien | HolidayView | Import/Anzeige |
| Abwesenheiten | AbsenceView | CRUD |
| Vertretung | SubstitutionView | Kandidaten-Scoring |
| Planvergleich | ComparisonView | 2 Pläne nebeneinander vergleichen |
| Berichte | ReportView | ScoreHeatmap, RoomUtilization |
| Einstellungen | SettingsView | Globale Toggles (Engagement/Pädagogik) |
| Hilfe | HelpView | Bedienungsanleitung |

---

## Tauri Commands

Alle Commands in `src-tauri/src/lib.rs` unter `invoke_handler![]` registriert.
106 Commands über 19 Module. Frontend-Aufruf via `invoke()`.

**Konvention:** Command-Namen `snake_case` (Rust), Parameter `camelCase` (TS via Serde).

---

## Entwicklungskonventionen

### Rust
- Fehlerbehandlung via `thiserror` (`AppError`) + `?`-Propagierung
- Alle DB-Operationen in `src/db/`, nie direkt in Commands
- Decision-Log-Prinzip: jede Solver-Entscheidung ist loggbar
- Keine `unwrap()` in Produktionscode

### TypeScript / React
- Strikte Typen, keine `any`
- Alle Backend-Calls über Zustand-Stores (nie direkt in Komponenten)
- Tailwind CSS v4 für Styling

### Allgemein
- Deutsche UI-Texte, englische Code-Bezeichner
- Kommentare: Deutsch für fachliche Logik, Englisch für technische Details

---

## Entwicklungsphase

| Phase | Status |
|-------|--------|
| 1 – Tauri + React + SQLite Setup | ✅ |
| 2 – Datenmodell + CRUD | ✅ |
| 3 – Greedy-Solver | ✅ |
| 4 – UI Grid + DnD | ✅ |
| 5 – Vertretungsmodul | ✅ |
| 6 – Transparenzbericht | ✅ |
| 7 – Tabu Search | ✅ |
| 8 – Lizenzsystem | ✅ |

---

## Häufige Aufgaben

### Neue Tauri Command
1. Funktion in `src-tauri/src/commands/<modul>.rs`
2. In `src-tauri/src/lib.rs` unter `invoke_handler![]` registrieren
3. TypeScript-Typ in `src/types/` ergänzen
4. Im passenden Zustand-Store einbauen

### Neue DB-Tabelle
1. `CREATE TABLE` in `src-tauri/src/db/schema.rs`
2. Migration in `migrations.rs` (Version hochzählen)
3. Rust-Struct in `src-tauri/src/models/`
4. CRUD in `src-tauri/src/db/`

### Neuer Soft Constraint
1. Regel-Typ in `constraint_rules` definieren
2. Logik in `solver/constraints.rs` implementieren
3. Gewichtung aus DB laden (nicht hardcoden)
4. Im Scorer einbeziehen
5. Seed-Daten in `constraints::seed_default_constraints` ergänzen

---

## Build & Dev

```bash
npm run tauri dev      # Entwicklung
npm run tauri build    # Produktions-Build
npm run dev            # Nur Frontend
cd src-tauri && cargo test    # Rust-Tests (71 Tests)
cd src-tauri && cargo clippy  # Linting
```

---

## Designprinzipien

1. **Offline-First:** Alles lokal in SQLite, keine Netzwerkaufrufe
2. **Transparenz:** Jede Entscheidung dokumentiert und erklärbar (decision_log)
3. **Gewichtbarkeit:** Soft Constraints per UI konfigurierbar (Gewicht + Scope)
4. **Fairness:** Vertretungen + Planungswünsche über Ranking-System gewichtet
5. **DSGVO:** Alle Daten auf dem Schulgerät, kein Cloud-Zwang

---

*Letzte Aktualisierung: v1.0 – Alle Phasen abgeschlossen*
