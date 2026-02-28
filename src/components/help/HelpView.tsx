import { useState } from "react";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        <span className="text-gray-400 text-lg">{open ? "\u25BE" : "\u25B8"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 text-sm text-gray-700 leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    orange: "bg-orange-100 text-orange-800",
    purple: "bg-purple-100 text-purple-800",
    red: "bg-red-100 text-red-800",
    gray: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

export function HelpView() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Hilfe & Anleitung</h2>
      </div>

      {/* Schnellstart */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3">Schnellstart – In 4 Schritten zum Stundenplan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</span>
            <div>
              <div className="font-medium text-blue-900">Beispieldaten laden</div>
              <div className="text-sm text-blue-700">
                Klicken Sie oben rechts auf den orangenen Button <Tag color="orange">Beispieldaten</Tag> und waehlen Sie einen Schultyp (Gymnasium, Grundschule oder Mittelschule).
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <div className="font-medium text-blue-900">Stammdaten pruefen</div>
              <div className="text-sm text-blue-700">
                Pruefen und bearbeiten Sie in den Tabs <Tag color="blue">Lehrkraefte</Tag> <Tag color="blue">Faecher</Tag> <Tag color="blue">Klassen</Tag> <Tag color="blue">Raeume</Tag> Ihre Daten.
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">3</span>
            <div>
              <div className="font-medium text-blue-900">Plan generieren & optimieren</div>
              <div className="text-sm text-blue-700">
                Wechseln Sie zum Tab <Tag color="blue">Stundenplan</Tag>, erstellen Sie einen neuen Plan und klicken Sie auf <Tag color="green">Generieren</Tag> und dann <Tag color="purple">Optimieren</Tag>.
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">4</span>
            <div>
              <div className="font-medium text-blue-900">Ergebnisse analysieren</div>
              <div className="text-sm text-blue-700">
                Im Tab <Tag color="blue">Bericht</Tag> sehen Sie Qualitaetsmetriken. Im Grid koennen Sie einzelne Eintraege anklicken, um die Entscheidungsbegruendung zu lesen.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion-Sektionen */}
      <div className="space-y-2">

        <Section title="Beispieldaten laden">
          <p>
            Der orangene <Tag color="orange">Beispieldaten</Tag>-Button befindet sich oben rechts im Header und ist auf jeder Seite sichtbar.
          </p>
          <p><strong>Drei Schultypen stehen zur Auswahl:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Gymnasium (gross):</strong> ~80 Lehrkraefte, 16 Faecher, 24 Klassen (5a–12c), 40 Raeume</li>
            <li><strong>Grundschule (mittel):</strong> ~25 Lehrkraefte, 9 Faecher, 12 Klassen (1a–4c), 15 Raeume</li>
            <li><strong>Mittelschule (klein):</strong> ~35 Lehrkraefte, 13 Faecher, 15 Klassen (5a–10b), 20 Raeume</li>
          </ul>
          <p className="text-amber-700 bg-amber-50 rounded p-2">
            <strong>Achtung:</strong> Beim Laden werden alle vorhandenen Stammdaten (Lehrkraefte, Faecher, Klassen, Raeume) unwiderruflich ersetzt. Stundenplaene und Ferien bleiben erhalten. Ein Bestaetigungsdialog erscheint vorher.
          </p>
          <p>
            Nach dem Laden werden alle Lehrkraefte automatisch passenden Faechern zugewiesen, mit realistischen Scores fuer Engagement und Paedagogik.
          </p>
        </Section>

        <Section title="Lehrkraefte verwalten">
          <p>Im Tab <Tag color="blue">Lehrkraefte</Tag> sehen Sie eine Tabelle aller Lehrkraefte mit folgenden Spalten:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Name</strong> und <strong>E-Mail</strong></li>
            <li><strong>Teilzeit:</strong> Prozentualer Beschaeftigungsumfang (z.B. 75% = Teilzeit)</li>
            <li><strong>Max. Std./Tag:</strong> Maximale Unterrichtsstunden pro Tag</li>
            <li><strong>Engagement / Paedagogik:</strong> Werte von 0–100%, fliessen in Vertretungs-Scoring ein</li>
          </ul>

          <p><strong>Aktionen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="blue">Hinzufuegen</Tag> – Oeffnet ein Formular zum Anlegen einer neuen Lehrkraft</li>
            <li><strong>Bearbeiten</strong> – Aendert Name, E-Mail, Scores und Arbeitszeiten</li>
            <li><strong>Loeschen</strong> – Entfernt die Lehrkraft (mit Bestaetigungsdialog)</li>
          </ul>

          <p><strong>Fachzuordnung (aufklappbare Zeile):</strong></p>
          <p>
            Klicken Sie auf eine Tabellenzeile, um die Fachzuordnung aufzuklappen. Dort sehen Sie:
          </p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Alle aktuell zugewiesenen Faecher als farbige Chips</li>
            <li>Einen <strong>&times;</strong>-Button an jedem Chip zum Entfernen der Zuordnung</li>
            <li>Ein Dropdown-Menue mit allen noch nicht zugewiesenen Faechern</li>
            <li>Einen <Tag color="green">Hinzufuegen</Tag>-Button zum Zuweisen des ausgewaehlten Fachs</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Die Fachzuordnung bestimmt, welche Lehrkraefte der Solver fuer welche Stunden einsetzen kann.
          </p>
        </Section>

        <Section title="Faecher verwalten">
          <p>Im Tab <Tag color="blue">Faecher</Tag> verwalten Sie das Faecherangebot Ihrer Schule.</p>
          <p><strong>Felder pro Fach:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Name:</strong> Vollstaendiger Fachname (z.B. "Mathematik")</li>
            <li><strong>Kuerzel:</strong> Kurzform fuer die Grid-Anzeige (z.B. "Ma"), max. 5 Zeichen</li>
            <li><strong>Raumtyp:</strong> Standard, Sport, Labor oder Musik – bestimmt, welche Raeume der Solver verwenden darf</li>
            <li><strong>Std./Woche:</strong> Standard-Wochenstunden (z.B. 4 fuer Mathe) – wird bei der Generierung als Soll verwendet</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Stellen Sie sicher, dass fuer jeden Raumtyp genug passende Raeume vorhanden sind. Sonst kann der Solver Stunden nicht platzieren.
          </p>
        </Section>

        <Section title="Klassen verwalten">
          <p>Im Tab <Tag color="blue">Klassen</Tag> legen Sie die Schulklassen an.</p>
          <p><strong>Felder pro Klasse:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Name:</strong> Klassenbezeichnung (z.B. "5a", "10b")</li>
            <li><strong>Klassenstufe:</strong> Jahrgang (1–13)</li>
            <li><strong>Schueleranzahl:</strong> Fuer die Raumkapazitaetspruefung</li>
            <li><strong>Klassenlehrer:</strong> Optional, wird per Dropdown aus vorhandenen Lehrkraeften gewaehlt</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Der Klassenlehrer wird vom Solver bevorzugt in die 1. Stunde eingeplant (Soft Constraint "Klassenleiter bevorzugt 1. Stunde").
          </p>
        </Section>

        <Section title="Raeume verwalten">
          <p>Im Tab <Tag color="blue">Raeume</Tag> erfassen Sie alle verfuegbaren Unterrichtsraeume.</p>
          <p><strong>Felder pro Raum:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Name:</strong> Raumbezeichnung (z.B. "R101", "TH1", "Ph2")</li>
            <li><strong>Raumtyp:</strong> Standard, Sport, Labor oder Musik</li>
            <li><strong>Kapazitaet:</strong> Maximale Personenzahl</li>
          </ul>
          <p><strong>Raumtyp-Zuordnung:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Standard:</strong> Normale Klassenraeume – fuer Deutsch, Mathe, Geschichte etc.</li>
            <li><strong>Sport:</strong> Turnhallen – nur fuer Sportunterricht</li>
            <li><strong>Labor:</strong> Fachkabinette – fuer Physik, Chemie, Biologie, Informatik</li>
            <li><strong>Musik:</strong> Musikraeume – fuer Musikunterricht</li>
          </ul>
        </Section>

        <Section title="Regeln konfigurieren (Soft Constraints)">
          <p>
            Im Tab <Tag color="blue">Regeln</Tag> konfigurieren Sie die Optimierungskriterien des Solvers. Diese "Soft Constraints" werden nicht erzwungen, sondern gewichtet – der Solver versucht, sie so gut wie moeglich zu erfuellen.
          </p>
          <p><strong>Standard-Regeln:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Hohlstunden minimieren</strong> (Gewicht 0.9) – Vermeidet Freistunden zwischen Unterricht</li>
            <li><strong>Gleichmaessige Wochenverteilung</strong> (0.8) – Verteilt Stunden ueber die Woche</li>
            <li><strong>Hauptfaecher vormittags</strong> (0.7) – Ma, De, En bevorzugt in fruehen Stunden</li>
            <li><strong>Klassenleiter bevorzugt 1. Stunde</strong> (0.6) – Klassenlehrer startet den Tag</li>
            <li><strong>Randstunden vermeiden</strong> (0.5) – Weniger Unterricht in der 1. und letzten Stunde</li>
            <li><strong>Wunschzeiten der Lehrkraefte</strong> (0.4) – Beruecksichtigt Praeferenzen</li>
            <li><strong>Kein Sport nach Mathe</strong> (0.3) – Vermeidet unguenstige Fachfolgen</li>
          </ul>
          <p><strong>Bedienung:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Drag & Drop:</strong> Ziehen Sie am 6-Punkte-Griff (links) um die Reihenfolge zu aendern</li>
            <li><strong>Gewicht-Slider:</strong> Verschieben Sie den Regler (0.0 = ignoriert, 1.0 = hoechste Prioritaet)</li>
            <li><strong>Toggle-Schalter:</strong> Aktivieren/Deaktivieren einer Regel (deaktivierte Regeln sind ausgegraut)</li>
            <li><Tag color="blue">Neue Regel</Tag> – Erstellt eine eigene Constraint-Regel</li>
            <li><strong>Bearbeiten / Loeschen</strong> – Passt bestehende Regeln an oder entfernt sie</li>
          </ul>
        </Section>

        <Section title="Ferienkalender">
          <p>Im Tab <Tag color="blue">Ferien</Tag> verwalten Sie die Schulferien. Diese werden vom Solver und der Vertretungsplanung beruecksichtigt.</p>
          <p><strong>Import-Optionen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="green">Sachsen 2025/2026</Tag> – Laedt die saechsischen Schulferien mit einem Klick (Winter-, Oster-, Pfingst-, Sommer-, Herbst-, Weihnachtsferien)</li>
            <li><Tag color="blue">JSON importieren</Tag> – Waehlen Sie eine eigene JSON-Datei mit Feriendaten</li>
            <li><Tag color="red">Alle loeschen</Tag> – Entfernt alle importierten Ferien</li>
          </ul>
          <p><strong>JSON-Format fuer eigene Dateien:</strong></p>
          <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto">
{`{
  "schoolYear": "2025/2026",
  "state": "Sachsen",
  "holidays": [
    {
      "name": "Winterferien",
      "startDate": "2026-02-09",
      "endDate": "2026-02-21"
    }
  ]
}`}
          </pre>
          <p className="text-gray-500 text-xs">
            Tipp: An Ferientagen zeigt die Vertretungsplanung automatisch einen Hinweis an.
          </p>
        </Section>

        <Section title="Abwesenheiten erfassen">
          <p>Im Tab <Tag color="blue">Abwesenheiten</Tag> dokumentieren Sie laengere Abwesenheiten von Lehrkraeften.</p>
          <p><strong>Abwesenheitstypen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="red">Krankheit</Tag> – Krankheitsbedingte Abwesenheit</li>
            <li><Tag color="purple">Mutterschutz/Elternzeit</Tag> – Laengere Auszeit</li>
            <li><Tag color="blue">Sabbat</Tag> – Sabbatjahr</li>
            <li><Tag color="green">Fortbildung</Tag> – Weiterbildungsmassnahmen</li>
            <li><Tag color="gray">Sonstiges</Tag> – Andere Gruende</li>
          </ul>
          <p><strong>Erforderliche Angaben:</strong> Lehrkraft, Typ, Zeitraum (von–bis), optionale Notiz</p>
          <p><strong>Filterung:</strong> Mit dem Dropdown oben koennen Sie nach einzelnen Lehrkraeften filtern.</p>
          <p className="text-gray-500 text-xs">
            Tipp: Abwesenheiten fliessen automatisch in die Vertretungsplanung ein – abwesende Lehrkraefte werden dort als betroffen angezeigt.
          </p>
        </Section>

        <Section title="Stundenplan erstellen & optimieren">
          <p>Der Tab <Tag color="blue">Stundenplan</Tag> ist das Herzstueck der Anwendung.</p>

          <p><strong>1. Plan anlegen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Klicken Sie auf <Tag color="blue">Neuer Plan</Tag></li>
            <li>Geben Sie einen Namen ein (z.B. "Schuljahr 2025/2026")</li>
            <li>Optional: Gueltigkeitszeitraum fuer den Abwesenheits-Filter</li>
          </ul>

          <p><strong>2. Plan generieren:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Waehlen Sie den Plan aus und klicken Sie <Tag color="green">Generieren</Tag></li>
            <li>Der Greedy-Algorithmus erstellt eine Initialloesung</li>
            <li>Ergebnis zeigt: Erstellte Eintraege, Durchschnitts-Score, nicht platzierbare Aufgaben</li>
          </ul>

          <p><strong>3. Plan optimieren:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Nach der Generierung erscheint der <Tag color="purple">Optimieren</Tag>-Button</li>
            <li>Tabu Search verbessert die Loesung iterativ</li>
            <li>Ergebnis zeigt: Score vorher/nachher, Verbesserung in %, Iterationen, angewandte Zuege</li>
          </ul>

          <p><strong>4. Grid-Ansicht:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Klassenansicht:</strong> Zeigt den Wochenplan einer ausgewaehlten Klasse</li>
            <li><strong>Lehrkraftansicht:</strong> Zeigt den Wochenplan einer ausgewaehlten Lehrkraft</li>
            <li>Farbcodierung nach Fach mit Kuerzel-Badge</li>
            <li>5 Spalten (Mo–Fr) x 9 Zeilen (Stunden)</li>
          </ul>

          <p><strong>5. Drag & Drop (nur Entwurf):</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Ziehen Sie einen Eintrag auf eine leere Zelle zum Verschieben</li>
            <li>Blaue Hervorhebung = Zelle verfuegbar, rote = besetzt</li>
          </ul>

          <p><strong>6. Detail-Ansicht:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Klicken Sie auf einen Eintrag fuer die Detail-Ansicht</li>
            <li>Zeigt: Fach, Lehrkraft, Raum, Klasse, Gesamt-Score</li>
            <li>Constraint-Aufschluesselung mit Balkendiagrammen</li>
            <li>Entscheidungsbegruendung – warum genau diese Zuweisung gewaehlt wurde</li>
          </ul>

          <p><strong>Planstatus:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="orange">Entwurf</Tag> – Bearbeitbar, Generierung und Drag & Drop moeglich</li>
            <li><Tag color="green">Aktiv</Tag> – Aktuell gueltiger Plan (nur Ansicht)</li>
            <li><Tag color="gray">Archiviert</Tag> – Alte Version (nur Ansicht)</li>
          </ul>
        </Section>

        <Section title="Vertretungsplanung">
          <p>Der Tab <Tag color="blue">Vertretung</Tag> hilft bei der taeglichen Vertretungsorganisation.</p>

          <p><strong>Ablauf:</strong></p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Waehlen Sie ein <strong>Datum</strong> und einen <strong>Stundenplan</strong></li>
            <li>Links sehen Sie alle <strong>betroffenen Stunden</strong> (Lehrkraft abwesend an diesem Tag)</li>
            <li>Klicken Sie auf eine betroffene Stunde</li>
            <li>Rechts erscheint die <strong>Kandidatenliste</strong>, sortiert nach Eignung</li>
            <li>Klicken Sie <Tag color="green">Zuweisen</Tag> beim gewuenschten Kandidaten</li>
          </ol>

          <p><strong>Score-Berechnung pro Kandidat:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Engagement-Score:</strong> Wie engagiert ist die Lehrkraft generell?</li>
            <li><strong>Vertretungslast:</strong> Wie viele Vertretungen hat sie bereits uebernommen?</li>
            <li><strong>Paedagogik-Score:</strong> Paedagogische Kompetenz</li>
            <li><strong>Wochenlast:</strong> Aktuelle Auslastung in dieser Woche</li>
            <li><strong>Fachqualifikation:</strong> Kann die Lehrkraft das Fach unterrichten? (<Tag color="green">Fachlehrer</Tag> vs. <Tag color="gray">Fachfremd</Tag>)</li>
          </ul>

          <p><strong>Score-Farben:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li className="text-green-700">Gruen (&ge; 70%) – Sehr gut geeignet</li>
            <li className="text-yellow-700">Gelb (&ge; 40%) – Akzeptabel</li>
            <li className="text-red-700">Rot (&lt; 40%) – Weniger geeignet</li>
          </ul>

          <p className="text-gray-500 text-xs">
            Tipp: Jede Zuweisung wird mit einer textlichen Begruendung dokumentiert und kann spaeter im Bericht nachvollzogen werden.
          </p>

          <p><strong>Hinweise:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>An Wochenenden und Ferientagen wird automatisch ein Hinweis angezeigt</li>
            <li>Bereits zugewiesene Vertretungen erscheinen als gruen markiert</li>
            <li>Die Vertretungshistorie wird unten in einer Tabelle angezeigt</li>
          </ul>
        </Section>

        <Section title="Plan-Vergleich">
          <p>Der Tab <Tag color="blue">Vergleich</Tag> ermoeglicht den direkten Vergleich zweier Stundenplaene nebeneinander.</p>

          <p><strong>Bedienung:</strong></p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Waehlen Sie in den beiden Dropdowns <strong>Plan A</strong> und <strong>Plan B</strong> aus</li>
            <li>Optional: Filtern Sie nach einer bestimmten <strong>Klasse</strong></li>
            <li>Die beiden Plaene werden als 5x9-Grids nebeneinander angezeigt</li>
          </ol>

          <p><strong>Farbcodierung der Unterschiede:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Weiss:</strong> Identischer Eintrag in beiden Plaenen</li>
            <li className="text-amber-700"><strong>Gelb (geaendert):</strong> Eintrag existiert in beiden Plaenen, aber Fach, Lehrkraft oder Raum unterscheidet sich</li>
            <li className="text-green-700"><strong>Gruen (neu):</strong> Eintrag existiert nur in diesem Plan</li>
            <li className="text-red-700"><strong>Rot (entfernt):</strong> Eintrag fehlt in diesem Plan</li>
          </ul>

          <p><strong>Statistik-Leiste:</strong></p>
          <p>Oberhalb der Grids werden farbige Badges angezeigt: Gesamt, Identisch, Geaendert, Hinzugefuegt, Entfernt. Damit sehen Sie auf einen Blick, wie stark sich zwei Plaene unterscheiden.</p>

          <p className="text-gray-500 text-xs">
            Tipp: Nutzen Sie den Vergleich, um die Auswirkung einer Optimierung oder eines Regelwechsels zu visualisieren.
          </p>
        </Section>

        <Section title="Transparenzbericht">
          <p>Der Tab <Tag color="blue">Bericht</Tag> zeigt eine umfassende Qualitaetsanalyse des Stundenplans.</p>

          <p><strong>Zusammenfassung (4 Kennzahlen):</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Eintraege:</strong> Gesamtzahl + Abdeckungsgrad in %</li>
            <li><strong>Durchschnitt:</strong> Mittlerer Score aller Eintraege</li>
            <li><strong>Minimum:</strong> Niedrigster Score (Schwachstelle)</li>
            <li><strong>Problemeintraege:</strong> Anzahl Eintraege mit Score &lt; 40%</li>
          </ul>

          <p><strong>Constraint-Analyse:</strong></p>
          <p>Fuer jede Regel wird ein Balkendiagramm angezeigt mit dem Durchschnitts-Score. Bei Verletzungen erscheint ein roter Badge mit der Anzahl.</p>

          <p><strong>Lehrkraft-Auslastung:</strong></p>
          <p>Tabelle mit: Name, Gesamtstunden, verschiedene Faecher/Klassen, durchschnittlicher Score. Hilft, Ueberlastungen zu erkennen.</p>

          <p><strong>Workload-Fairness:</strong></p>
          <p>Horizontale Balken pro Lehrkraft zeigen die <strong>Auslastung in %</strong> relativ zur Teilzeitquote. Farbcodierung: <span className="text-green-700">Gruen (60–100%)</span>, <span className="text-yellow-700">Gelb (100–120%)</span>, <span className="text-red-700">Rot (&gt;120% oder &lt;40%)</span>. Oben rechts wird die <strong>Streuung</strong> (Standardabweichung) als Fairness-Kennzahl angezeigt – je niedriger, desto gleichmaessiger die Verteilung.</p>

          <p><strong>Score-Heatmap:</strong></p>
          <p>Ein 5x9-Raster (Montag–Freitag x 1.–9. Stunde) zeigt den <strong>durchschnittlichen Score</strong> pro Zeitfenster als farbige Zelle. Damit erkennen Sie sofort, wann im Stundenplan die Qualitaet sinkt (z.B. Freitag Nachmittag).</p>

          <p><strong>Raumnutzung:</strong></p>
          <p>Balkendiagramme pro Raum, sortiert nach Nutzungshaeufigkeit. Jeder Raum zeigt die Anzahl belegter Stunden und den durchschnittlichen Score als farbigen Badge.</p>

          <p><strong>Fach-Abdeckung (Ist vs. Soll):</strong></p>
          <p>Tabelle die pro Klasse und Fach zeigt, wie viele Stunden <strong>tatsaechlich</strong> eingeplant sind im Vergleich zum <strong>Soll</strong> (Wochenstunden laut Fach-Definition). Status-Badges: <Tag color="green">OK</Tag> bei Uebereinstimmung, <Tag color="orange">+/-1</Tag> bei kleiner Abweichung, <Tag color="red">&gt;1</Tag> bei groesserer Abweichung.</p>

          <p><strong>Problemeintraege:</strong></p>
          <p>Alle Eintraege mit Score &lt; 40%, sortiert nach niedrigstem Score. Zeigt Tag/Stunde, Klasse, Fach, Lehrkraft und die konkreten Schwachstellen (welche Constraints verletzt werden).</p>
        </Section>

      </div>

      {/* Tipps & Hinweise */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Tipps & Hinweise</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Transparenzprinzip:</strong> Jede automatische Entscheidung des Solvers wird dokumentiert. Klicken Sie auf einen Stundenplan-Eintrag, um die detaillierte Begruendung zu lesen. Bei Vertretungen wird ebenfalls eine Entscheidungsbegruendung gespeichert.
          </p>
          <p>
            <strong>Offline & DSGVO:</strong> Alle Daten werden ausschliesslich lokal auf Ihrem Geraet in einer SQLite-Datenbank gespeichert. Es findet keine Datenuebertragung an Server oder Cloud-Dienste statt.
          </p>
          <p>
            <strong>Typischer Arbeitsablauf:</strong> Stammdaten anlegen → Ferien importieren → Regeln anpassen → Plan generieren → Plan optimieren → Bericht pruefen → Bei Bedarf: Drag & Drop im Grid oder Regeln anpassen und erneut generieren.
          </p>
          <p>
            <strong>Hard vs. Soft Constraints:</strong> Hard Constraints (keine Doppelbelegung, Raumtyp-Match, Maximalstunden) werden immer eingehalten. Soft Constraints (Regeln-Tab) werden je nach Gewicht bestmoeglich erfuellt – bei Konflikten gewinnt die Regel mit hoeherem Gewicht.
          </p>
          <p>
            <strong>Mehrere Plaene:</strong> Sie koennen mehrere Stundenplaene parallel anlegen und ueber den <Tag color="blue">Vergleich</Tag>-Tab direkt nebeneinander visualisieren. Nur einer kann "Aktiv" sein, die anderen bleiben als "Entwurf" oder "Archiviert".
          </p>
        </div>
      </div>
    </div>
  );
}
