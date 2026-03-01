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
                Klicken Sie oben rechts auf den orangenen Button <Tag color="orange">Beispieldaten</Tag> und wählen Sie einen Schultyp (Gymnasium, Grundschule oder Mittelschule).
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <div className="font-medium text-blue-900">Stammdaten prüfen</div>
              <div className="text-sm text-blue-700">
                Prüfen und bearbeiten Sie in den Tabs <Tag color="blue">Lehrkräfte</Tag> <Tag color="blue">Fächer</Tag> <Tag color="blue">Klassen</Tag> <Tag color="blue">Räume</Tag> Ihre Daten.
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
                Im Tab <Tag color="blue">Bericht</Tag> sehen Sie Qualitätsmetriken. Im Grid können Sie einzelne Einträge anklicken, um die Entscheidungsbegründung zu lesen.
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
            <li><strong>Gymnasium (groß):</strong> ~80 Lehrkräfte, 16 Fächer, 24 Klassen (5a–12c), 40 Räume</li>
            <li><strong>Grundschule (mittel):</strong> ~25 Lehrkräfte, 9 Fächer, 12 Klassen (1a–4c), 15 Räume</li>
            <li><strong>Mittelschule (klein):</strong> ~35 Lehrkräfte, 13 Fächer, 15 Klassen (5a–10b), 20 Räume</li>
          </ul>
          <p className="text-amber-700 bg-amber-50 rounded p-2">
            <strong>Achtung:</strong> Beim Laden werden alle vorhandenen Stammdaten (Lehrkräfte, Fächer, Klassen, Räume) unwiderruflich ersetzt. Stundenpläne und Ferien bleiben erhalten. Ein Bestätigungsdialog erscheint vorher.
          </p>
          <p>
            Nach dem Laden werden alle Lehrkräfte automatisch passenden Fächern zugewiesen, mit realistischen Scores für Engagement und Pädagogik. Zusätzlich wird eine <strong>realistische Stundentafel</strong> pro Klassenstufe geladen (z.B. kein Latein in Klasse 5, mehr Sport in der Unterstufe).
          </p>
        </Section>

        <Section title="Lehrkräfte verwalten">
          <p>Im Tab <Tag color="blue">Lehrkräfte</Tag> sehen Sie eine Tabelle aller Lehrkräfte mit folgenden Spalten:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Name</strong> und <strong>E-Mail</strong></li>
            <li><strong>Teilzeit:</strong> Prozentualer Beschäftigungsumfang (z.B. 75% = Teilzeit)</li>
            <li><strong>Max. Std./Tag:</strong> Maximale Unterrichtsstunden pro Tag</li>
            <li><strong>Engagement / Pädagogik:</strong> Werte von 0–100%, fließen in Vertretungs-Scoring ein</li>
          </ul>

          <p><strong>Aktionen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="blue">Hinzufügen</Tag> – Öffnet ein Formular zum Anlegen einer neuen Lehrkraft</li>
            <li><strong>Bearbeiten</strong> – Ändert Name, E-Mail, Scores und Arbeitszeiten</li>
            <li><strong>Löschen</strong> – Entfernt die Lehrkraft (mit Bestätigungsdialog)</li>
          </ul>

          <p><strong>Fachzuordnung (aufklappbare Zeile):</strong></p>
          <p>
            Klicken Sie auf eine Tabellenzeile, um die Fachzuordnung aufzuklappen. Dort sehen Sie:
          </p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Alle aktuell zugewiesenen Fächer als farbige Chips</li>
            <li>Einen <strong>&times;</strong>-Button an jedem Chip zum Entfernen der Zuordnung</li>
            <li>Ein Dropdown-Menü mit allen noch nicht zugewiesenen Fächern</li>
            <li>Einen <Tag color="green">Hinzufügen</Tag>-Button zum Zuweisen des ausgewählten Fachs</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Die Fachzuordnung bestimmt, welche Lehrkräfte der Solver für welche Stunden einsetzen kann.
          </p>

          <p><strong>Weitere Tabs pro Lehrkraft:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="blue">Präferenzen</Tag> – Zeitpräferenzen für bevorzugte Unterrichtszeiten</li>
            <li><Tag color="blue">Belohnungen</Tag> – Belohnungspunkte vergeben (siehe eigene Sektion)</li>
            <li><Tag color="blue">Wünsche</Tag> – Sonderwünsche für die Stundenplanung (siehe eigene Sektion)</li>
            <li><Tag color="blue">Klassen</Tag> – Klassen-Zuordnung: welche Klassen die Lehrkraft unterrichten kann oder möchte (siehe eigene Sektion)</li>
          </ul>
        </Section>

        <Section title="Belohnungspunkte & Ranking">
          <p>Im Lehrkräfte-Tab können Sie über die Unterregister <Tag color="blue">Belohnungspunkte</Tag> ein Fairness-System verwalten.</p>

          <p><strong>Belohnungspunkte vergeben:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Wählen Sie eine Lehrkraft und klicken Sie auf den Tab "Belohnungen"</li>
            <li>Vergeben Sie Punkte für Kategorien wie: Zusatzaufgaben, Mentoring, Veranstaltungsorganisation, Fortbildung, Gremienarbeit, Prüfungsaufsicht, Projektleitung, Sonstiges</li>
            <li>Jeder Eintrag hat eine Punktzahl, eine Kategorie und eine optionale Begründung</li>
          </ul>

          <p><strong>Ranking-System:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Im <Tag color="blue">Ranking</Tag>-Tab sehen Sie alle Lehrkräfte sortiert nach Gesamtpunktzahl</li>
            <li>Der <strong>Ranking-Multiplikator</strong> (0.5 – 1.5) wird automatisch berechnet</li>
            <li>Lehrkräfte mit mehr Belohnungspunkten erhalten einen höheren Multiplikator</li>
            <li>Dieser Multiplikator verstärkt die Berücksichtigung von Präferenzen und Sonderwünschen beim Solver</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Das Ranking-System belohnt Engagement – Lehrkräfte mit mehr Zusatzarbeit haben größeren Einfluss auf ihren eigenen Stundenplan.
          </p>
        </Section>

        <Section title="Sonderwünsche der Lehrkräfte">
          <p>Im Lehrkräfte-Tab können Sie über den Unterreiter <Tag color="blue">Wünsche</Tag> individuelle Planungswünsche erfassen.</p>

          <p><strong>Verfügbare Wunschtypen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Vormittag bevorzugt:</strong> Unterricht möglichst in den Stunden 1–4</li>
            <li><strong>Nachmittag bevorzugt:</strong> Unterricht möglichst ab Stunde 5</li>
            <li><strong>Freier Tag:</strong> Ein bestimmter Wochentag soll frei bleiben</li>
            <li><strong>Max. aufeinanderfolgende Stunden:</strong> Begrenzung der Unterrichtsblöcke</li>
            <li><strong>Kompakter Stundenplan:</strong> Minimierung von Hohlstunden für die Lehrkraft</li>
            <li><strong>Individuell:</strong> Freitext-Wunsch (wird vom Solver als neutral gewertet)</li>
          </ul>

          <p><strong>Prioritäten:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><span className="text-red-600 font-medium">Hoch</span> – Gewichtungsfaktor 1.5</li>
            <li><span className="text-blue-600 font-medium">Mittel</span> – Gewichtungsfaktor 1.0</li>
            <li><span className="text-gray-500 font-medium">Niedrig</span> – Gewichtungsfaktor 0.5</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Die Wünsche fließen als "Sonderwünsche"-Regel in den Solver ein. Die tatsächliche Berücksichtigung hängt vom Gewicht dieser Regel und dem Ranking-Multiplikator der Lehrkraft ab.
          </p>
        </Section>

        <Section title="Lehrer-Klassen-Zuordnung">
          <p>Im Lehrkräfte-Tab können Sie über den Unterreiter <Tag color="blue">Klassen</Tag> festlegen, welche Klassen eine Lehrkraft unterrichten kann oder möchte.</p>

          <p><strong>Zwei Modi:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Kann unterrichten</strong> (Harte Einschränkung) – Die Lehrkraft wird <strong>nur</strong> für die markierten Klassen eingeplant. Sobald mindestens ein &quot;Kann&quot;-Eintrag existiert, fungiert dies als Whitelist.</li>
            <li><strong>Möchte unterrichten</strong> (Weiche Präferenz) – Die Lehrkraft wird bei diesen Klassen bevorzugt, aber nicht eingeschränkt. Der Solver gibt einen kleinen Score-Bonus.</li>
          </ul>

          <p><strong>Bedienung:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Setzen Sie ein Häkchen bei der gewünschten Klasse</li>
            <li>Wählen Sie im Dropdown &quot;Möchte&quot; oder &quot;Kann&quot;</li>
            <li>Ein gelber Hinweis erscheint, wenn &quot;Kann&quot;-Einträge existieren</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Ohne jegliche Zuordnung kann die Lehrkraft alle Klassen unterrichten (kein Filter). &quot;Kann&quot;-Einträge schränken die Lehrkraft auf genau diese Klassen ein.
          </p>
        </Section>

        <Section title="Fächer verwalten">
          <p>Im Tab <Tag color="blue">Fächer</Tag> verwalten Sie das Fächerangebot Ihrer Schule.</p>
          <p><strong>Felder pro Fach:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Name:</strong> Vollständiger Fachname (z.B. "Mathematik")</li>
            <li><strong>Kürzel:</strong> Kurzform für die Grid-Anzeige (z.B. "Ma"), max. 5 Zeichen</li>
            <li><strong>Raumtyp:</strong> Standard, Sport, Labor oder Musik – bestimmt, welche Räume der Solver verwenden darf</li>
            <li><strong>Std./Woche:</strong> Standard-Wochenstunden (z.B. 4 für Mathe) – wird bei der Generierung als Soll verwendet</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Stellen Sie sicher, dass für jeden Raumtyp genug passende Räume vorhanden sind. Sonst kann der Solver Stunden nicht platzieren.
          </p>
        </Section>

        <Section title="Klassen verwalten">
          <p>Im Tab <Tag color="blue">Klassen</Tag> legen Sie die Schulklassen an.</p>
          <p><strong>Felder pro Klasse:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Name:</strong> Klassenbezeichnung (z.B. "5a", "10b")</li>
            <li><strong>Klassenstufe:</strong> Jahrgang (1–13)</li>
            <li><strong>Schüleranzahl:</strong> Für die Raumkapazitätsprüfung</li>
            <li><strong>Klassenlehrer:</strong> Optional, wird per Dropdown aus vorhandenen Lehrkräften gewählt</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Der Klassenlehrer wird vom Solver bevorzugt in die 1. Stunde eingeplant (Regel "Klassenleiter bevorzugt 1. Stunde").
          </p>

          <p><strong>Stundentafel:</strong></p>
          <p>
            Über den Button <Tag color="gray">Stundentafel anzeigen</Tag> im Klassen-Header öffnen Sie eine editierbare Matrix. Diese zeigt alle Klassen (Zeilen) und Fächer (Spalten).
          </p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Graue Werte:</strong> Standardwochenstunden des Fachs (aus Fach-Definition)</li>
            <li><strong>Blaue Werte:</strong> Überschriebene Stundenzahl für diese Klasse</li>
            <li><strong>0:</strong> Fach wird in dieser Klasse nicht unterrichtet</li>
            <li>Klicken Sie auf eine Zelle, um den Wert zu ändern</li>
            <li>Wird der Wert auf den Standard zurückgesetzt, wird der Override automatisch entfernt</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Bei den Beispieldaten werden realistische Stundentafeln pro Klassenstufe geladen. Z.B. hat eine 5. Klasse am Gymnasium noch kein Latein (0 Std.), dafür aber mehr Sport (3 Std.).
          </p>
        </Section>

        <Section title="Räume verwalten">
          <p>Im Tab <Tag color="blue">Räume</Tag> erfassen Sie alle verfügbaren Unterrichtsräume.</p>
          <p><strong>Felder pro Raum:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Name:</strong> Raumbezeichnung (z.B. "R101", "TH1", "Ph2")</li>
            <li><strong>Raumtyp:</strong> Standard, Sport, Labor oder Musik</li>
            <li><strong>Kapazität:</strong> Maximale Personenzahl</li>
          </ul>
          <p><strong>Raumtyp-Zuordnung:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Standard:</strong> Normale Klassenräume – für Deutsch, Mathe, Geschichte etc.</li>
            <li><strong>Sport:</strong> Turnhallen – nur für Sportunterricht</li>
            <li><strong>Labor:</strong> Fachkabinette – für Physik, Chemie, Biologie, Informatik</li>
            <li><strong>Musik:</strong> Musikräume – für Musikunterricht</li>
          </ul>
        </Section>

        <Section title="Regeln konfigurieren (Optimierungskriterien)">
          <p>
            Im Tab <Tag color="blue">Regeln</Tag> konfigurieren Sie die Optimierungskriterien des Solvers. Diese Regeln werden nicht erzwungen, sondern gewichtet – der Solver versucht, sie so gut wie möglich zu erfüllen.
          </p>
          <p><strong>Standard-Regeln:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Hohlstunden minimieren</strong> (Gewicht 0.9) – Vermeidet Freistunden zwischen Unterricht</li>
            <li><strong>Gleichmäßige Wochenverteilung</strong> (0.8) – Verteilt Stunden über die Woche</li>
            <li><strong>Hauptfächer vormittags</strong> (0.7) – Ma, De, En bevorzugt in frühen Stunden</li>
            <li><strong>Klassenleiter bevorzugt 1. Stunde</strong> (0.6) – Klassenlehrer startet den Tag</li>
            <li><strong>Randstunden vermeiden</strong> (0.5) – Weniger Unterricht in der 1. und letzten Stunde</li>
            <li><strong>Sonderwünsche der Lehrkräfte</strong> (0.5) – Individuelle Wünsche mit Ranking-Multiplikator</li>
            <li><strong>Wunschzeiten der Lehrkräfte</strong> (0.4) – Berücksichtigt Präferenzen</li>
            <li><strong>Verbotene Fachfolge</strong> (0.3) – Jedes verbotene Paar ist eine eigene Regel (z.B. "Kein Sport nach Mathe"). Über <Tag color="blue">Neue Regel</Tag> → Typ "Verbotene Fachfolge" können Sie beliebige Paare anlegen.</li>
          </ul>

          <p><strong>Geltungsbereiche (Scopes):</strong></p>
          <p>
            Jede Regel kann auf einen bestimmten Geltungsbereich eingeschränkt werden:
          </p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="gray">Global</Tag> – Gilt für alle Klassen, Lehrkräfte und Räume (Standard)</li>
            <li><Tag color="blue">Klasse</Tag> – Gilt nur für eine bestimmte Klasse (z.B. "Randstunden vermeiden" mit Gewicht 1.0 für Klasse 1a)</li>
            <li><Tag color="green">Lehrkraft</Tag> – Gilt nur für eine bestimmte Lehrkraft</li>
            <li><Tag color="orange">Raum</Tag> – Gilt nur für einen bestimmten Raum</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Bei Konflikten zwischen globalen und eingeschränkten Regeln gewinnt die spezifischere Regel. Bei mehreren eingeschränkten Regeln gilt das höchste Gewicht.
          </p>

          <p><strong>Bedienung:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Sortierung:</strong> Über den Button <Tag color="gray">Gewicht ↑/↓</Tag> sortieren Sie die Regeln nach Gewicht aufsteigend oder absteigend</li>
            <li><strong>Gewicht-Slider:</strong> Verschieben Sie den Regler (0.0 = ignoriert, 1.0 = höchste Priorität)</li>
            <li><strong>Toggle-Schalter:</strong> Aktivieren/Deaktivieren einer Regel (deaktivierte Regeln sind ausgegraut)</li>
            <li><Tag color="blue">Neue Regel</Tag> – Erstellt eine eigene Planungsregel mit Typ-Auswahl, Geltungsbereich und Gewicht</li>
            <li><strong>Bearbeiten / Löschen</strong> – Passt bestehende Regeln an oder entfernt sie</li>
          </ul>
        </Section>

        <Section title="Ferienkalender">
          <p>Im Tab <Tag color="blue">Ferien</Tag> verwalten Sie die Schulferien. Diese werden vom Solver und der Vertretungsplanung berücksichtigt.</p>
          <p><strong>Import-Optionen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="green">Sachsen 2025/2026</Tag> – Lädt die sächsischen Schulferien mit einem Klick (Winter-, Oster-, Pfingst-, Sommer-, Herbst-, Weihnachtsferien)</li>
            <li><Tag color="blue">JSON importieren</Tag> – Wählen Sie eine eigene JSON-Datei mit Feriendaten</li>
            <li><Tag color="red">Alle löschen</Tag> – Entfernt alle importierten Ferien</li>
          </ul>
          <p><strong>JSON-Format für eigene Dateien:</strong></p>
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
          <p>Im Tab <Tag color="blue">Abwesenheiten</Tag> dokumentieren Sie längere Abwesenheiten von Lehrkräften.</p>
          <p><strong>Abwesenheitstypen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="red">Krankheit</Tag> – Krankheitsbedingte Abwesenheit</li>
            <li><Tag color="purple">Mutterschutz/Elternzeit</Tag> – Längere Auszeit</li>
            <li><Tag color="blue">Sabbat</Tag> – Sabbatjahr</li>
            <li><Tag color="green">Fortbildung</Tag> – Weiterbildungsmaßnahmen</li>
            <li><Tag color="gray">Sonstiges</Tag> – Andere Gründe</li>
          </ul>
          <p><strong>Erforderliche Angaben:</strong> Lehrkraft, Typ, Zeitraum (von–bis), optionale Notiz</p>
          <p><strong>Filterung:</strong> Mit dem Dropdown oben können Sie nach einzelnen Lehrkräften filtern.</p>
          <p className="text-gray-500 text-xs">
            Tipp: Abwesenheiten fließen automatisch in die Vertretungsplanung ein – abwesende Lehrkräfte werden dort als betroffen angezeigt.
          </p>
        </Section>

        <Section title="Stundenplan erstellen & optimieren">
          <p>Der Tab <Tag color="blue">Stundenplan</Tag> ist das Herzstück der Anwendung.</p>

          <p><strong>1. Plan anlegen:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Klicken Sie auf <Tag color="blue">Neuer Plan</Tag></li>
            <li>Geben Sie einen Namen ein (z.B. "Schuljahr 2025/2026")</li>
            <li>Optional: Gültigkeitszeitraum für den Abwesenheits-Filter</li>
          </ul>

          <p><strong>2. Plan generieren:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Wählen Sie den Plan aus und klicken Sie <Tag color="green">Generieren</Tag></li>
            <li>Der Greedy-Algorithmus erstellt eine Initiallösung</li>
            <li>Ergebnis zeigt: Erstellte Einträge, Durchschnitts-Score, nicht platzierbare Aufgaben</li>
          </ul>

          <p><strong>3. Plan optimieren:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Nach der Generierung erscheint der <Tag color="purple">Optimieren</Tag>-Button</li>
            <li>Tabu Search verbessert die Lösung iterativ</li>
            <li>Ergebnis zeigt: Score vorher/nachher, Verbesserung in %, Iterationen, angewandte Züge</li>
          </ul>

          <p><strong>4. Grid-Ansicht:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Klassenansicht:</strong> Zeigt den Wochenplan einer ausgewählten Klasse</li>
            <li><strong>Lehrkraftansicht:</strong> Zeigt den Wochenplan einer ausgewählten Lehrkraft. Rechts neben dem Grid erscheint automatisch eine <strong>Info-Sidebar</strong> mit Engagement-/Pädagogik-Scores, Zeitpräferenzen, aktiven Sonderwünschen und Belohnungspunkten der Lehrkraft.</li>
            <li>Farbcodierung nach Fach mit Kürzel-Badge</li>
            <li>5 Spalten (Mo–Fr) x 9 Zeilen (Stunden)</li>
          </ul>

          <p><strong>5. Drag & Drop (nur Entwurf):</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Ziehen Sie einen Eintrag auf eine leere Zelle zum Verschieben</li>
            <li>Blaue Hervorhebung = Zelle verfügbar, rote = besetzt</li>
          </ul>

          <p><strong>6. Detail-Ansicht:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Klicken Sie auf einen Eintrag für die Detail-Ansicht</li>
            <li>Zeigt: Fach, Lehrkraft, Raum, Klasse, Gesamt-Score</li>
            <li>Regel-Aufschlüsselung mit Balkendiagrammen</li>
            <li>Entscheidungsbegründung – warum genau diese Zuweisung gewählt wurde</li>
          </ul>

          <p><strong>Planstatus:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><Tag color="orange">Entwurf</Tag> – Bearbeitbar, Generierung und Drag & Drop möglich</li>
            <li><Tag color="green">Aktiv</Tag> – Aktuell gültiger Plan (nur Ansicht)</li>
            <li><Tag color="gray">Archiviert</Tag> – Alte Version (nur Ansicht)</li>
          </ul>
        </Section>

        <Section title="Vertretungsplanung">
          <p>Der Tab <Tag color="blue">Vertretung</Tag> hilft bei der täglichen Vertretungsorganisation.</p>

          <p><strong>Ablauf:</strong></p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Wählen Sie ein <strong>Datum</strong> und einen <strong>Stundenplan</strong></li>
            <li>Links sehen Sie alle <strong>betroffenen Stunden</strong> (Lehrkraft abwesend an diesem Tag)</li>
            <li>Klicken Sie auf eine betroffene Stunde</li>
            <li>Rechts erscheint die <strong>Kandidatenliste</strong>, sortiert nach Eignung</li>
            <li>Klicken Sie <Tag color="green">Zuweisen</Tag> beim gewünschten Kandidaten</li>
          </ol>

          <p><strong>Score-Berechnung pro Kandidat:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Engagement-Score:</strong> Wie engagiert ist die Lehrkraft generell?</li>
            <li><strong>Vertretungslast:</strong> Wie viele Vertretungen hat sie bereits übernommen?</li>
            <li><strong>Pädagogik-Score:</strong> Pädagogische Kompetenz</li>
            <li><strong>Wochenlast:</strong> Aktuelle Auslastung in dieser Woche</li>
            <li><strong>Fachqualifikation:</strong> Kann die Lehrkraft das Fach unterrichten? (<Tag color="green">Fachlehrer</Tag> vs. <Tag color="gray">Fachfremd</Tag>)</li>
          </ul>

          <p><strong>Score-Farben:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li className="text-green-700">Grün (&ge; 70%) – Sehr gut geeignet</li>
            <li className="text-yellow-700">Gelb (&ge; 40%) – Akzeptabel</li>
            <li className="text-red-700">Rot (&lt; 40%) – Weniger geeignet</li>
          </ul>

          <p className="text-gray-500 text-xs">
            Tipp: Jede Zuweisung wird mit einer textlichen Begründung dokumentiert und kann später im Bericht nachvollzogen werden.
          </p>

          <p><strong>Hinweise:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li>An Wochenenden und Ferientagen wird automatisch ein Hinweis angezeigt</li>
            <li>Bereits zugewiesene Vertretungen erscheinen als grün markiert</li>
            <li>Die Vertretungshistorie wird unten in einer Tabelle angezeigt</li>
          </ul>
        </Section>

        <Section title="Plan-Vergleich">
          <p>Der Tab <Tag color="blue">Vergleich</Tag> ermöglicht den direkten Vergleich zweier Stundenpläne nebeneinander.</p>

          <p><strong>Bedienung:</strong></p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Wählen Sie in den beiden Dropdowns <strong>Plan A</strong> und <strong>Plan B</strong> aus</li>
            <li>Optional: Filtern Sie nach einer bestimmten <strong>Klasse</strong></li>
            <li>Die beiden Pläne werden als 5x9-Grids nebeneinander angezeigt</li>
          </ol>

          <p><strong>Farbcodierung der Unterschiede:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Weiß:</strong> Identischer Eintrag in beiden Plänen</li>
            <li className="text-amber-700"><strong>Gelb (geändert):</strong> Eintrag existiert in beiden Plänen, aber Fach, Lehrkraft oder Raum unterscheidet sich</li>
            <li className="text-green-700"><strong>Grün (neu):</strong> Eintrag existiert nur in diesem Plan</li>
            <li className="text-red-700"><strong>Rot (entfernt):</strong> Eintrag fehlt in diesem Plan</li>
          </ul>

          <p><strong>Statistik-Leiste:</strong></p>
          <p>Oberhalb der Grids werden farbige Badges angezeigt: Gesamt, Identisch, Geändert, Hinzugefügt, Entfernt. Damit sehen Sie auf einen Blick, wie stark sich zwei Pläne unterscheiden.</p>

          <p className="text-gray-500 text-xs">
            Tipp: Nutzen Sie den Vergleich, um die Auswirkung einer Optimierung oder eines Regelwechsels zu visualisieren.
          </p>
        </Section>

        <Section title="Transparenzbericht">
          <p>Der Tab <Tag color="blue">Bericht</Tag> zeigt eine umfassende Qualitätsanalyse des Stundenplans.</p>

          <p><strong>Zusammenfassung (4 Kennzahlen):</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Einträge:</strong> Gesamtzahl + Abdeckungsgrad in %</li>
            <li><strong>Durchschnitt:</strong> Mittlerer Score aller Einträge</li>
            <li><strong>Minimum:</strong> Niedrigster Score (Schwachstelle)</li>
            <li><strong>Problemeinträge:</strong> Anzahl Einträge mit Score &lt; 40%</li>
          </ul>

          <p><strong>Regelanalyse:</strong></p>
          <p>Für jede Regel wird ein Balkendiagramm angezeigt mit dem Durchschnitts-Score. Bei Verletzungen erscheint ein roter Badge mit der Anzahl.</p>

          <p><strong>Lehrkraft-Auslastung:</strong></p>
          <p>Tabelle mit: Name, Gesamtstunden, verschiedene Fächer/Klassen, durchschnittlicher Score. Hilft, Überlastungen zu erkennen.</p>

          <p><strong>Workload-Fairness:</strong></p>
          <p>Horizontale Balken pro Lehrkraft zeigen die <strong>Auslastung in %</strong> relativ zur Teilzeitquote. Farbcodierung: <span className="text-green-700">Grün (60–100%)</span>, <span className="text-yellow-700">Gelb (100–120%)</span>, <span className="text-red-700">Rot (&gt;120% oder &lt;40%)</span>. Oben rechts wird die <strong>Streuung</strong> (Standardabweichung) als Fairness-Kennzahl angezeigt – je niedriger, desto gleichmäßiger die Verteilung.</p>

          <p><strong>Score-Heatmap:</strong></p>
          <p>Ein 5x9-Raster (Montag–Freitag x 1.–9. Stunde) zeigt den <strong>durchschnittlichen Score</strong> pro Zeitfenster als farbige Zelle. Damit erkennen Sie sofort, wann im Stundenplan die Qualität sinkt (z.B. Freitag Nachmittag). Über den Toggle-Button können Sie zwischen zwei Darstellungen wechseln: <strong>Stufen</strong> (drei diskrete Farben: Grün/Gelb/Rot) und <strong>Gradient</strong> (stufenloser Farbverlauf von Rot über Gelb zu Grün).</p>

          <p><strong>Raumnutzung:</strong></p>
          <p>Balkendiagramme pro Raum, sortiert nach Nutzungshäufigkeit. Jeder Raum zeigt die Anzahl belegter Stunden und den durchschnittlichen Score als farbigen Badge.</p>

          <p><strong>Fach-Abdeckung (Ist vs. Soll):</strong></p>
          <p>Tabelle die pro Klasse und Fach zeigt, wie viele Stunden <strong>tatsächlich</strong> eingeplant sind im Vergleich zum <strong>Soll</strong> (Wochenstunden laut Fach-Definition). Status-Badges: <Tag color="green">OK</Tag> bei Übereinstimmung, <Tag color="orange">+/-1</Tag> bei kleiner Abweichung, <Tag color="red">&gt;1</Tag> bei größerer Abweichung.</p>

          <p><strong>Problemeinträge:</strong></p>
          <p>Alle Einträge mit Score &lt; 40%, sortiert nach niedrigstem Score. Zeigt Tag/Stunde, Klasse, Fach, Lehrkraft und die konkreten Schwachstellen (welche Regeln verletzt werden).</p>

          <p><strong>Tooltips:</strong></p>
          <p>Alle Überschriften, Kennzahlen und Diagramme im Bericht verfügen über <strong>Erklärungstooltips</strong>. Fahren Sie mit der Maus über eine Überschrift oder einen Wert, um eine kurze Erklärung einzublenden, was die jeweilige Kennzahl aussagt und wie sie berechnet wird.</p>
        </Section>

        <Section title="Einstellungen">
          <p>Im Tab <Tag color="blue">Einstellungen</Tag> können Sie globale Konfigurationsoptionen anpassen.</p>

          <p><strong>Vertretungs-Scoring:</strong></p>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Engagement-Score:</strong> Wenn aktiviert (Standard), wird der Engagement-Score der Lehrkraft bei der Vertretungspriorisierung berücksichtigt (Gewichtung: 20%)</li>
            <li><strong>Pädagogik-Score:</strong> Wenn aktiviert (Standard), wird der Pädagogik-Score der Lehrkraft bei der Vertretungspriorisierung berücksichtigt (Gewichtung: 15%)</li>
          </ul>
          <p className="text-gray-500 text-xs">
            Tipp: Deaktivieren Sie einen Score, um die Vertretungspriorisierung auf die verbleibenden Kriterien (Vertretungslast, Wochenlast, Fachqualifikation) zu fokussieren.
          </p>
        </Section>

      </div>

      {/* Tipps & Hinweise */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Tipps & Hinweise</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Transparenzprinzip:</strong> Jede automatische Entscheidung des Solvers wird dokumentiert. Klicken Sie auf einen Stundenplan-Eintrag, um die detaillierte Begründung zu lesen. Bei Vertretungen wird ebenfalls eine Entscheidungsbegründung gespeichert.
          </p>
          <p>
            <strong>Offline & DSGVO:</strong> Alle Daten werden ausschließlich lokal auf Ihrem Gerät in einer SQLite-Datenbank gespeichert. Es findet keine Datenübertragung an Server oder Cloud-Dienste statt.
          </p>
          <p>
            <strong>Typischer Arbeitsablauf:</strong> Stammdaten anlegen → Ferien importieren → Regeln anpassen → Plan generieren → Plan optimieren → Bericht prüfen → Bei Bedarf: Drag & Drop im Grid oder Regeln anpassen und erneut generieren.
          </p>
          <p>
            <strong>Harte vs. weiche Regeln:</strong> Harte Regeln (keine Doppelbelegung, Raumtyp-Match, Maximalstunden) werden immer eingehalten. Weiche Regeln (Regeln-Tab) werden je nach Gewicht bestmöglich erfüllt – bei Konflikten gewinnt die Regel mit höherem Gewicht.
          </p>
          <p>
            <strong>Mehrere Pläne:</strong> Sie können mehrere Stundenpläne parallel anlegen und über den <Tag color="blue">Vergleich</Tag>-Tab direkt nebeneinander visualisieren. Nur einer kann "Aktiv" sein, die anderen bleiben als "Entwurf" oder "Archiviert".
          </p>
        </div>
      </div>
    </div>
  );
}
