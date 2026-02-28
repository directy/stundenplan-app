import { useState } from "react";

interface Section {
  title: string;
  content: string[];
}

const sections: Section[] = [
  {
    title: "1. Ersteinrichtung – Schluessel generieren",
    content: [
      'Beim ersten Start muessen Sie ein Schluesselpaar (Keypair) erzeugen. Oeffnen Sie den Tab "Lizenz erstellen" und klicken Sie auf "Neues Keypair generieren".',
      "Es werden zwei Dateien erstellt:",
      "- private.key – Der private Schluessel. Bewahren Sie diesen sicher auf und geben Sie ihn NIEMALS weiter! Nur Sie benoetigen ihn, um Lizenzen zu signieren.",
      "- public.key – Der oeffentliche Schluessel. Dieser wird in Ihre Anwendung eingebettet, damit Lizenzen verifiziert werden koennen.",
      "Speichern Sie beide Dateien an einem sicheren Ort (z.B. USB-Stick oder verschluesselter Ordner). Wenn Sie den privaten Schluessel verlieren, koennen Sie keine neuen Lizenzen mehr ausstellen.",
    ],
  },
  {
    title: "2. Public Key in der Anwendung einbetten",
    content: [
      "Oeffnen Sie die Datei src-tauri/src/license/mod.rs in Ihrem Hauptprojekt.",
      'Ersetzen Sie den Wert von PUBLIC_KEY_B64 durch den angezeigten Base64-Wert des Public Keys (nach dem Generieren oder Laden wird er im Bereich "Aktueller Public Key" angezeigt).',
      "Beispiel:",
      '  const PUBLIC_KEY_B64: &str = "K/sygTay8HU1kim+i9OTEBaWkz4wzJ44lqyEs1WhYJE=";',
      "Kompilieren Sie die Anwendung neu, damit der neue Schluessel wirksam wird.",
    ],
  },
  {
    title: "3. Lizenz fuer einen Kunden erstellen",
    content: [
      '1. Oeffnen Sie den Tab "Lizenz erstellen".',
      '2. Laden Sie Ihren privaten Schluessel ueber "Bestehenden Key laden" (oder generieren Sie ein neues Keypair, falls noch keins vorhanden).',
      "3. Fuellen Sie die Lizenz-Daten aus:",
      "   - Lizenz-ID: Wird automatisch als UUID generiert. Sie koennen sie auch manuell setzen.",
      '   - Produkt-ID: Standard ist "stundenplan".',
      "   - Name des Lizenznehmers: z.B. der Schulname (Pflichtfeld).",
      "   - E-Mail: Kontakt-Adresse des Kunden (Pflichtfeld).",
      "   - Lizenztyp: Trial (Testversion), Standard oder Professional.",
      "   - Ausgestellt am: Wird automatisch auf heute gesetzt.",
      "   - Gueltig bis: Leer lassen fuer unbegrenzte Lizenz, oder ein Ablaufdatum setzen.",
      '   - Features: Komma-separiert, z.B. "all" oder "schedule,substitution".',
      "   - Max. Version: Optional, z.B. \"2.0.0\" um die Lizenz auf bestimmte Versionen zu beschraenken.",
      '4. Klicken Sie auf "Lizenz signieren & speichern".',
      '5. Waehlen Sie einen Speicherort – die Datei wird als .lic-Datei gespeichert.',
    ],
  },
  {
    title: "4. Lizenz an den Kunden versenden",
    content: [
      "Senden Sie die erzeugte .lic-Datei an den Kunden, z.B. per E-Mail.",
      "Die .lic-Datei enthaelt nur den signierten Payload – keine geheimen Schluessel. Sie kann bedenkenlos per E-Mail versendet werden.",
      "Der Kunde muss die Datei in der Stundenplan-Anwendung importieren (wird beim ersten Start angezeigt).",
    ],
  },
  {
    title: "5. Kunde importiert die Lizenz",
    content: [
      "Wenn der Kunde die Stundenplan-Anwendung ohne gueltige Lizenz startet, erscheint ein Lizenz-Dialog.",
      'Der Kunde klickt auf "Lizenzdatei importieren" und waehlt die erhaltene .lic-Datei aus.',
      "Die Anwendung prueft die Signatur automatisch und schaltet sich bei gueltiger Lizenz frei.",
      "Die Lizenzdatei wird im Anwendungsverzeichnis gespeichert und bei jedem Start erneut geprueft.",
    ],
  },
  {
    title: "6. Lizenz pruefen / verifizieren",
    content: [
      'Oeffnen Sie den Tab "Lizenz pruefen" in diesem Tool.',
      "1. Waehlen Sie den Public Key (public.key) aus.",
      "2. Waehlen Sie die zu pruefende .lic-Datei aus.",
      '3. Klicken Sie auf "Lizenz pruefen".',
      "Bei einer gueltigen Lizenz werden alle Details angezeigt (Lizenznehmer, Typ, Ablaufdatum usw.).",
      "Bei einer ungueltigen Lizenz wird der Fehlergrund angezeigt (z.B. manipulierte Datei, falscher Schluessel).",
    ],
  },
  {
    title: "7. Lizenztypen erklaert",
    content: [
      "Trial – Testversion mit eingeschraenkter Laufzeit. Typischerweise 30 Tage.",
      "Standard – Vollversion fuer eine Schule. Alle Basisfunktionen freigeschaltet.",
      "Professional – Erweiterte Version mit allen Features inkl. erweiterten Statistiken und Multi-Plan-Vergleich.",
      "Die Lizenztypen koennen in der Hauptanwendung unterschiedlich behandelt werden (z.B. Feature-Gates je nach Typ).",
    ],
  },
  {
    title: "8. Fehlerbehebung",
    content: [
      '"Lizenz ungueltig" beim Kunden:',
      "  - Pruefen Sie, ob der richtige Public Key in der Anwendung eingebettet ist.",
      "  - Stellen Sie sicher, dass die .lic-Datei nicht beschaedigt oder veraendert wurde.",
      "  - Verifizieren Sie die Lizenz mit diesem Tool (Tab \"Lizenz pruefen\").",
      "",
      '"Private Key laden fehlgeschlagen":',
      "  - Die Key-Datei muss im Base64-Format vorliegen (so wie sie von diesem Tool generiert wird).",
      "  - Stellen Sie sicher, dass die Datei vollstaendig ist und nicht beschaedigt wurde.",
      "",
      '"Keypair generieren fehlgeschlagen":',
      "  - Pruefen Sie, ob Sie Schreibrechte im gewaehlten Verzeichnis haben.",
      "",
      "Allgemein:",
      "  - Private Key und Public Key gehoeren immer zusammen. Wenn Sie ein neues Keypair generieren, muessen Sie den neuen Public Key in der Anwendung einbetten.",
      "  - Alte Lizenzen, die mit einem anderen Keypair signiert wurden, funktionieren nach einem Schluesseltausch nicht mehr.",
    ],
  },
];

export function HelpView() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          Schritt-fuer-Schritt-Anleitung
        </h3>
        <p className="text-xs text-gray-500">
          Diese Anleitung erklaert den kompletten Lizenzierungs-Workflow von der
          Ersteinrichtung bis zur Fehlerbehebung.
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section, i) => (
          <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <span>{section.title}</span>
              <span
                className={`text-gray-400 transition-transform ${
                  openIndex === i ? "rotate-180" : ""
                }`}
              >
                &#9660;
              </span>
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-3 space-y-2">
                  {section.content.map((line, j) => {
                    if (line === "") return <div key={j} className="h-2" />;
                    if (line.startsWith("  "))
                      return (
                        <p
                          key={j}
                          className="text-sm text-gray-600 pl-4 font-mono text-xs"
                        >
                          {line}
                        </p>
                      );
                    if (line.startsWith("- "))
                      return (
                        <p key={j} className="text-sm text-gray-600 pl-4">
                          {line}
                        </p>
                      );
                    return (
                      <p key={j} className="text-sm text-gray-700">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
