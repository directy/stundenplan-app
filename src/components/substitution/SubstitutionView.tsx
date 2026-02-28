import { useEffect, useState } from "react";
import { useSubstitutionStore } from "../../store/substitutionStore";
import { useScheduleStore } from "../../store/scheduleStore";
import type { AffectedEntry, SubstitutionCandidate } from "../../types";

const SCORE_LABELS: Record<string, string> = {
  engagement: "Engagement",
  substitutionLoad: "Vertretungslast",
  pedagogical: "Paedagogik",
  weeklyLoad: "Wochenbelastung",
  subjectQualification: "Fachqualifikation",
};

function scoreColor(score: number, max: number): string {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.7) return "bg-green-500";
  if (ratio >= 0.4) return "bg-yellow-500";
  return "bg-red-400";
}

function totalScoreColor(score: number): string {
  if (score >= 0.7) return "text-green-700 bg-green-100";
  if (score >= 0.4) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
}

export function SubstitutionView() {
  const {
    selectedDate,
    isHoliday,
    affectedEntries,
    candidates,
    selectedEntryId,
    history,
    loading,
    candidatesLoading,
    error,
    setSelectedDate,
    checkHoliday,
    fetchAffectedEntries,
    fetchCandidates,
    assignSubstitute,
    fetchHistory,
    clearCandidates,
  } = useSubstitutionStore();

  const { schedules, fetchSchedules } = useScheduleStore();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    null,
  );
  const [isWeekend, setIsWeekend] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Auto-Auswahl des aktiven Plans
  useEffect(() => {
    if (selectedScheduleId === null && schedules.length > 0) {
      const active = schedules.find((s) => s.status === "active");
      setSelectedScheduleId(active ? active.id : schedules[0].id);
    }
  }, [schedules, selectedScheduleId]);

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    clearCandidates();

    // Wochenende pruefen
    const d = new Date(date + "T00:00:00");
    const day = d.getDay();
    if (day === 0 || day === 6) {
      setIsWeekend(true);
      return;
    }
    setIsWeekend(false);

    await checkHoliday(date);

    if (selectedScheduleId) {
      await fetchAffectedEntries(selectedScheduleId, date);
      await fetchHistory(date);
    }
  };

  const handleScheduleChange = async (scheduleId: number) => {
    setSelectedScheduleId(scheduleId);
    clearCandidates();
    if (!isWeekend && !isHoliday) {
      await fetchAffectedEntries(scheduleId, selectedDate);
      await fetchHistory(selectedDate);
    }
  };

  const handleEntryClick = (entry: AffectedEntry) => {
    if (entry.isSubstituted) return;
    fetchCandidates(entry.entryId, selectedDate);
  };

  const handleAssign = async (candidate: SubstitutionCandidate) => {
    if (!selectedEntryId) return;
    setAssigningId(candidate.teacherId);
    try {
      await assignSubstitute({
        originalEntryId: selectedEntryId,
        substituteTeacherId: candidate.teacherId,
        date: selectedDate,
        decisionReason: candidate.decisionReason,
        score: candidate.score,
      });
      clearCandidates();
      if (selectedScheduleId) {
        await fetchAffectedEntries(selectedScheduleId, selectedDate);
        await fetchHistory(selectedDate);
      }
    } catch {
      // Fehler wird im Store gesetzt
    } finally {
      setAssigningId(null);
    }
  };

  const selectedEntry = affectedEntries.find(
    (e) => e.entryId === selectedEntryId,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Vertretungsplanung
        </h2>
      </div>

      {/* Datum und Plan-Auswahl */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Datum</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">
              Stundenplan
            </label>
            <select
              value={selectedScheduleId ?? ""}
              onChange={(e) => handleScheduleChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Bitte waehlen --</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.status === "active" ? " (Aktiv)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fehler */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Wochenende-Hinweis */}
      {isWeekend && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-700">
            Wochenende – kein Unterricht.
          </p>
        </div>
      )}

      {/* Ferientag-Hinweis */}
      {!isWeekend && isHoliday && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-700">
            Ferientag – kein Unterricht.
          </p>
        </div>
      )}

      {/* Kein Plan ausgewaehlt */}
      {!selectedScheduleId && !isWeekend && !isHoliday && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>Bitte einen Stundenplan auswaehlen.</p>
        </div>
      )}

      {/* Hauptbereich: Betroffene Stunden + Kandidaten */}
      {selectedScheduleId && !isWeekend && !isHoliday && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Linke Spalte: Betroffene Stunden */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Betroffene Stunden
              {!loading && affectedEntries.length > 0 && (
                <span className="ml-1 text-gray-400">
                  ({affectedEntries.length})
                </span>
              )}
            </h3>

            {loading ? (
              <div className="text-gray-500 text-sm">Lade...</div>
            ) : affectedEntries.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                <p className="text-sm">
                  Keine Vertretungen noetig – alle Lehrkraefte anwesend.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {affectedEntries.map((entry) => (
                  <button
                    key={entry.entryId}
                    onClick={() => handleEntryClick(entry)}
                    disabled={entry.isSubstituted}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedEntryId === entry.entryId
                        ? "border-blue-400 bg-blue-50"
                        : entry.isSubstituted
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-400 w-12">
                          {entry.period}. Std
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-800">
                            {entry.className}
                          </span>
                          <span className="mx-1.5 text-gray-300">|</span>
                          <span className="text-sm text-gray-600">
                            {entry.subjectName}
                          </span>
                        </div>
                      </div>
                      {entry.isSubstituted ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                          {entry.substituteTeacherName}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                          Offen
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {entry.originalTeacherName} ({entry.startTime}–
                      {entry.endTime}) | Raum {entry.roomName}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rechte Spalte: Kandidaten */}
          <div>
            {selectedEntry ? (
              <>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Kandidaten fuer {selectedEntry.period}. Stunde /{" "}
                  {selectedEntry.className} / {selectedEntry.subjectName}
                </h3>

                {candidatesLoading ? (
                  <div className="text-gray-500 text-sm">
                    Lade Kandidaten...
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                    <p className="text-sm">
                      Keine Vertretung verfuegbar – alle Lehrkraefte sind
                      belegt oder abwesend.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {candidates.map((candidate, idx) => (
                      <CandidateCard
                        key={candidate.teacherId}
                        candidate={candidate}
                        rank={idx + 1}
                        onAssign={() => handleAssign(candidate)}
                        assigning={assigningId === candidate.teacherId}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Kandidaten
                </h3>
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  <p className="text-sm">
                    {affectedEntries.length > 0
                      ? "Klicken Sie auf eine offene Stunde, um Kandidaten anzuzeigen."
                      : ""}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vertretungshistorie */}
      {selectedScheduleId &&
        !isWeekend &&
        !isHoliday &&
        history.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Vertretungshistorie ({history.length})
            </h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                      Eintrag
                    </th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                      Score
                    </th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                      Begruendung
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-800">
                        #{record.originalEntryId}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${totalScoreColor(record.score)}`}
                        >
                          {(record.score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {record.decisionReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}

function CandidateCard({
  candidate,
  rank,
  onAssign,
  assigning,
}: {
  candidate: SubstitutionCandidate;
  rank: number;
  onAssign: () => void;
  assigning: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = candidate.scoreBreakdown;
  const maxComponent = 0.25; // Max moeglicher Einzelwert (W_SUBSTITUTION_LOAD)

  return (
    <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 w-5">
            {rank}.
          </span>
          <span className="text-sm font-medium text-gray-800">
            {candidate.teacherName}
          </span>
          {candidate.isQualified ? (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              Fachlehrer
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
              Fachfremd
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${totalScoreColor(candidate.score)}`}
          >
            {(candidate.score * 100).toFixed(0)}%
          </span>
          <button
            onClick={onAssign}
            disabled={assigning}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {assigning ? "..." : "Zuweisen"}
          </button>
        </div>
      </div>

      {/* Score-Balken */}
      <div className="mt-2 space-y-1">
        {(
          Object.entries(breakdown) as [
            keyof typeof breakdown,
            number,
          ][]
        ).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-28 truncate">
              {SCORE_LABELS[key] ?? key}
            </span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${scoreColor(value, maxComponent)}`}
                style={{
                  width: `${Math.min((value / maxComponent) * 100, 100)}%`,
                }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">
              {value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Begruendung (aufklappbar) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
      >
        {expanded ? "Begruendung ausblenden" : "Begruendung anzeigen"}
      </button>
      {expanded && (
        <p className="mt-1 text-xs text-gray-600 bg-gray-50 rounded p-2">
          {candidate.decisionReason}
        </p>
      )}
    </div>
  );
}
