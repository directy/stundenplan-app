# CLAUDE.md – Stundenplan-System
> Diese Datei wird von Claude Code automatisch gelesen. Sie beschreibt das Projekt,
> die Architektur, Konventionen und typische Aufgaben.

---

## Projektübersicht

**Name:** Stundenplan-System  
**Ziel:** Offline-fähige Desktop-Anwendung zur automatisierten Erstellung und Optimierung
von Stunden- und Vertretungsplänen für Schulen.  
**Zielgruppe:** Lehrkräfte und Schulleitung

**Kerndifferenzierungsmerkmale:**
- Vollständige Transparenz jeder Planungsentscheidung (Argumentationsbericht)
- Profilbasierte, gewichtete Vertretungspriorisierung
- Offline-first, DSGVO-konform, kein Cloud-Zwang
- Optimierung bestehender Pläne (Import + Re-Optimierung)

---

## Tech-Stack

| Schicht | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS |
| Drag & Drop | @dnd-kit |
| Desktop-Wrapper | Tauri 2 |
| Backend/Solver | Rust (direkt in Tauri) |
| Datenbank | SQLite via rusqlite (bundled) |
| Build | Vite |

---

## Projektstruktur

```
stundenplan-app/
├── src/                          # React Frontend
│   ├── components/
│   │   ├── grid/                 # Stundenplan-Grid (Drag & Drop)
│   │   ├── teacher/              # Lehrkraft-Verwaltung
│   │   ├── substitution/         # Vertretungsmodul
│   │   ├── rules/                # Constraint-/Regelmanagement
│   │   └── reports/              # Transparenzbericht
│   ├── store/                    # Zustand Stores
│   │   ├── scheduleStore.ts      # Planeinträge, Generierung
│   │   ├── teacherStore.ts       # Lehrkräfte, Profile
│   │   └── rulesStore.ts         # Constraint-Konfiguration
│   ├── hooks/                    # Custom Hooks
│   ├── types/                    # TypeScript-Interfaces
│   └── App.tsx
│
└── src-tauri/                    # Rust Backend
    └── src/
        ├── db/
        │   ├── connection.rs     # SQLite-Verbindung + PRAGMA-Setup
        │   ├── schema.rs         # CREATE TABLE Definitionen
        │   └── migrations.rs     # Schema-Versionierung
        ├── solver/
        │   ├── greedy.rs         # Phase 1: Greedy-Initiallösung
        │   ├── tabu_search.rs    # Phase 2: Tabu Search Optimierung
        │   ├── constraints.rs    # Hard & Soft Constraint Definitionen
        │   └── scorer.rs         # Planqualitäts-Scoring
        ├── substitution/
        │   └── prioritizer.rs    # Vertretungs-Scoring-Logik
        ├── commands/             # Tauri Commands (Brücke Frontend ↔ Rust)
        │   ├── schedule.rs
        │   ├── teacher.rs
        │   └── substitution.rs
        └── models/               # Rust-Datenstrukturen (Serde)
```

---

## Datenmodell (SQLite)

**Kerntabellen:**

| Tabelle | Beschreibung |
|--------|-------------|
| `teachers` | Lehrkräfte mit Scores (engagement, pedagogical, part_time_quota) |
| `subjects` | Fächer mit Raumtypbindung |
| `teacher_subjects` | Qualifikationszuordnung |
| `classes` | Klassen mit Klassenlehrer-Referenz |
| `rooms` | Räume mit Typ (standard, sports, lab, music) |
| `time_slots` | Abstrakte Zeitslots (day_of_week 1–5, period 1–9) |
| `schedules` | Plan-Versionen (draft/active/archived) |
| `schedule_entries` | Einzelstunden inkl. `decision_log` (JSON) |
| `constraint_rules` | Konfigurierbare Soft Constraints mit Gewichtung |
| `substitution_history` | Vertretungsprotokoll mit Scoring-Details |
| `teacher_preferences` | Wunschzeiten, freie Tage |

**Wichtig:** Jeder `schedule_entry` enthält ein `decision_log`-Feld (JSON), das dokumentiert,
warum genau diese Zuweisung getroffen wurde (Transparenzprinzip).

---

## Solver-Architektur

Das Stundenplanproblem ist ein **Constraint Satisfaction Problem (CSP), NP-hart**.

**3-Phasen-Ansatz (in `src-tauri/src/solver/`):**

```
Phase 1 → greedy.rs
  Schnelle Initiallösung durch gewichtete Zufallszuweisung
  Reihenfolge: schwierigste Constraints zuerst

Phase 2 → tabu_search.rs
  Iterative Verbesserung durch Nachbarschaftssuche
  Tabu-Liste verhindert Zyklen
  Optimiert Soft Constraints (Gewichtung aus constraint_rules-Tabelle)

Phase 3 (optional) → genetischer Algorithmus
  Für Multi-Objective-Optimierung (noch nicht implementiert)
```

**Hard Constraints (zwingend, in `constraints.rs`):**
- Keine Doppelbelegung Lehrkraft / Raum / Klasse
- Fachstunden-Soll je Woche
- Raumtypbindung (Sport → Sporthalle)
- Maximalstunden/Tag je Lehrkraft
- Gesetzliche Pausenregelungen

**Soft Constraints (gewichtbar, aus DB geladen):**
- Kein Sport nach Mathe (und umgekehrt)
- Gleichmäßige Wochenverteilung
- Randstunden vermeiden
- Hohlstunden minimieren
- Klassenleiter bevorzugt 1. Stunde
- Hauptfächer vormittags
- Wunschzeiten der Lehrkräfte

---

## Vertretungsmodul (`substitution/prioritizer.rs`)

**Scoring-Formel je Kandidat:**

```
score = (engagement_score × w1)
      + (1 - substitution_load × w2)
      + (pedagogical_score × w3)
      + (1 - weekly_load × w4)
      + (subject_qualification × w5)
```

**Ausgabe:** Textuelle Entscheidungsbegründung, z.B.:
> „Vertretung zugewiesen an Frau Müller aufgrund höherer Engagementwertung
> (0,82 vs. 0,67) und geringerer aktueller Wochenbelastung."

Diese Begründung wird in `substitution_history.decision_reason` gespeichert.

---

## Tauri Commands (Frontend ↔ Backend)

Alle Rust-Funktionen werden als Tauri Commands exponiert.
Im Frontend via `invoke()` aufgerufen:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Beispiele
const result = await invoke('generate_schedule', { name: 'Stundenplan WS 2025' });
const entries = await invoke('get_schedule_entries', { scheduleId: 1 });
const candidates = await invoke('get_substitution_candidates', { entryId: 42, date: '2025-09-15' });
```

**Konvention:** Command-Namen in `snake_case` (Rust-seitig), Parameter in `camelCase` (TS-seitig via Serde).

---

## Entwicklungskonventionen

### Rust
- Fehlerbehandlung via `thiserror` (eigene Error-Typen) + `anyhow` für Propagierung
- Alle DB-Operationen in `src/db/`, nie direkt in Commands
- Jede Solver-Entscheidung muss loggbar sein (Decision-Log-Prinzip)
- `rayon` für parallelisierbare Solver-Iterationen nutzen
- Keine `unwrap()` in Produktionscode – immer `?` oder explizites Handling

### TypeScript / React
- Strikte TypeScript-Typen, keine `any`
- Alle Backend-Calls ausschließlich über Zustand-Stores (nie direkt in Komponenten)
- Komponenten sind zustandslos wo möglich (Daten kommen aus Stores)
- Tailwind für Styling, keine inline styles

### Allgemein
- Deutsche UI-Texte (Zielgruppe: deutsche Schulen)
- Englische Code-Bezeichner (Variablen, Funktionen, Dateien)
- Kommentare auf Deutsch für fachliche Logik, Englisch für technische Details

---

## Aktuelle Entwicklungsphase

| Phase | Status | Beschreibung |
|-------|--------|-------------|
| 1 – Setup | ✅ Geplant | Tauri 2 + React + SQLite Grundgerüst |
| 2 – Datenmodell | 🔄 In Arbeit | Schema, Migrationen, CRUD-Commands |
| 3 – Basis-Solver | ⏳ Offen | Greedy-Algorithmus |
| 4 – UI Grid | ⏳ Offen | Drag & Drop Planansicht |
| 5 – Vertretung | ⏳ Offen | Scoring + Priorisierungslogik |
| 6 – Transparenz | ⏳ Offen | Entscheidungsbericht |
| 7 – Optimierung | ⏳ Offen | Tabu Search |
| 8 – Pilotphase | ⏳ Offen | Test in Schule |

---

## Häufige Aufgaben für Claude Code

### Neue Tauri Command hinzufügen
1. Funktion in `src-tauri/src/commands/<modul>.rs` erstellen
2. In `src-tauri/src/main.rs` unter `invoke_handler![]` registrieren
3. TypeScript-Typ in `src/types/` ergänzen
4. Im passenden Zustand-Store als Methode einbauen

### Neue DB-Tabelle hinzufügen
1. `CREATE TABLE` in `src-tauri/src/db/schema.rs` (oder `schema.sql`)
2. Rust-Struct in `src-tauri/src/models/<modul>.rs` mit `#[derive(Serialize, Deserialize)]`
3. Migration in `migrations.rs` versionieren
4. CRUD-Funktionen in `src-tauri/src/db/` implementieren

### Neuen Soft Constraint hinzufügen
1. Regel-Typ in `constraint_rules`-Tabelle als Eintrag definieren
2. Logik in `src-tauri/src/solver/constraints.rs` implementieren
3. Gewichtung aus DB laden (nicht hardcoden)
4. Im Scorer (`scorer.rs`) einbeziehen

---

## Build & Dev

```bash
# Entwicklung starten
npm run tauri dev

# Produktions-Build
npm run tauri build

# Nur Frontend
npm run dev

# Rust-Tests
cd src-tauri && cargo test

# Rust-Linting
cd src-tauri && cargo clippy
```

---

## Wichtige Designprinzipien

1. **Offline-First:** Keine Netzwerkaufrufe, alles lokal in SQLite
2. **Transparenz:** Jede automatische Entscheidung wird dokumentiert und ist erklärbar
3. **Gewichtbarkeit:** Soft Constraints sind nicht fest codiert, sondern per UI konfigurierbar
4. **Fairness:** Vertretungen werden nach nachvollziehbaren, dokumentierten Kriterien verteilt
5. **DSGVO:** Alle Daten bleiben auf dem Gerät der Schule

---

*Letzte Aktualisierung: Phase 1 – Projektsetup*
