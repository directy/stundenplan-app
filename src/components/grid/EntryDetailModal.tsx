import type { GridEntry } from "../../hooks/useScheduleGrid";
import type { SubjectColorMap } from "../../hooks/useSubjectColors";

interface EntryDetailModalProps {
  entry: GridEntry;
  colorMap: SubjectColorMap;
  onClose: () => void;
}

interface DecisionLog {
  algorithm?: string;
  candidates_evaluated?: number;
  total_score?: number;
  soft_scores?: Record<string, number>;
  reason?: string;
}

const CONSTRAINT_LABELS: Record<string, string> = {
  no_sports_after_math: "Kein Sport nach Mathe",
  even_weekly_distribution: "Gleichmaessige Verteilung",
  avoid_edge_periods: "Randstunden vermeiden",
  minimize_gaps: "Hohlstunden minimieren",
  class_teacher_first_period: "Klassenlehrer 1. Stunde",
  main_subjects_morning: "Hauptfaecher vormittags",
  teacher_preferences: "Lehrer-Praeferenzen",
};

export function EntryDetailModal({
  entry,
  colorMap,
  onClose,
}: EntryDetailModalProps) {
  let parsedLog: DecisionLog = {};
  try {
    parsedLog = JSON.parse(entry.decisionLog);
  } catch {
    // Rohdaten werden unten angezeigt
  }

  const colors = colorMap.get(entry.subjectId);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
          <div
            className={`px-3 py-1.5 rounded-lg font-bold ${colors?.bg ?? "bg-gray-100"} ${colors?.text ?? "text-gray-800"}`}
          >
            {entry.subjectShortName}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{entry.subjectName}</h3>
            <p className="text-sm text-gray-500">
              {entry.teacherName} &middot; {entry.roomName} &middot;{" "}
              {entry.className}
            </p>
          </div>
        </div>

        {parsedLog.total_score !== undefined && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Gesamtscore:
            </span>
            <span className="text-sm font-bold">
              {(parsedLog.total_score * 100).toFixed(1)}%
            </span>
            {parsedLog.candidates_evaluated !== undefined && (
              <span className="text-xs text-gray-400 ml-2">
                ({parsedLog.candidates_evaluated} Kandidaten geprueft)
              </span>
            )}
          </div>
        )}

        {parsedLog.soft_scores && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Constraint-Bewertung
            </h4>
            <div className="space-y-1.5">
              {Object.entries(parsedLog.soft_scores).map(([name, score]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="flex-1 text-xs text-gray-600">
                    {CONSTRAINT_LABELS[name] ?? name}
                  </div>
                  <div className="w-24 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        score >= 0.7
                          ? "bg-green-500"
                          : score >= 0.4
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">
                    {(score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {parsedLog.reason && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{parsedLog.reason}</p>
          </div>
        )}

        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer">
            Rohdaten (JSON)
          </summary>
          <pre className="mt-2 text-xs bg-gray-50 rounded p-3 overflow-auto max-h-40">
            {JSON.stringify(parsedLog, null, 2)}
          </pre>
        </details>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Schliessen
        </button>
      </div>
    </div>
  );
}
