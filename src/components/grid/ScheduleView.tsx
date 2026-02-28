import { useEffect, useState } from "react";
import { useScheduleStore } from "../../store/scheduleStore";
import type { Schedule } from "../../types";

export function ScheduleView() {
  const {
    schedules,
    currentEntries,
    loading,
    error,
    generating,
    generationResult,
    fetchSchedules,
    createSchedule,
    fetchScheduleEntries,
    generateSchedule,
  } = useScheduleStore();

  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    null,
  );
  const [newScheduleName, setNewScheduleName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const selectedSchedule = schedules.find(
    (s) => s.id === selectedScheduleId,
  );

  const handleSelectSchedule = (schedule: Schedule) => {
    setSelectedScheduleId(schedule.id);
    fetchScheduleEntries(schedule.id);
  };

  const handleCreate = async () => {
    if (!newScheduleName.trim()) return;
    const created = await createSchedule({ name: newScheduleName.trim() });
    setNewScheduleName("");
    setShowCreateForm(false);
    handleSelectSchedule(created);
  };

  const handleGenerate = async () => {
    if (!selectedScheduleId) return;
    try {
      await generateSchedule(selectedScheduleId);
    } catch {
      // Fehler wird im Store gesetzt
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Stundenplan</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Neuer Plan
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-2">
          <input
            type="text"
            value={newScheduleName}
            onChange={(e) => setNewScheduleName(e.target.value)}
            placeholder="Name des Stundenplans"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!newScheduleName.trim()}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Erstellen
          </button>
          <button
            onClick={() => setShowCreateForm(false)}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      )}

      {/* Plan-Auswahl */}
      {schedules.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {schedules.map((schedule) => (
            <button
              key={schedule.id}
              onClick={() => handleSelectSchedule(schedule)}
              className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                selectedScheduleId === schedule.id
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {schedule.name}
              <span
                className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                  schedule.status === "draft"
                    ? "bg-yellow-100 text-yellow-700"
                    : schedule.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {schedule.status === "draft"
                  ? "Entwurf"
                  : schedule.status === "active"
                    ? "Aktiv"
                    : "Archiviert"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Kein Plan ausgewaehlt */}
      {!selectedSchedule && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-lg">
            {schedules.length === 0
              ? "Noch keine Stundenplaene vorhanden."
              : "Bitte einen Stundenplan auswaehlen."}
          </p>
          <p className="text-sm mt-2">
            Erstellen Sie einen neuen Plan, um mit der Generierung zu beginnen.
          </p>
        </div>
      )}

      {/* Plan ausgewaehlt */}
      {selectedSchedule && (
        <div>
          {/* Generierungs-Aktionen */}
          {selectedSchedule.status === "draft" && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">
                    Plan generieren
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Greedy-Algorithmus: Weist Stunden automatisch zu und
                    optimiert Soft Constraints.
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    "Generieren"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Fehler */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Generierungs-Ergebnis */}
          {generationResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-green-800 mb-2">
                Generierung abgeschlossen
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-green-600">Eintraege erstellt:</span>
                  <span className="ml-1 font-medium text-green-800">
                    {generationResult.entriesCreated}
                  </span>
                </div>
                <div>
                  <span className="text-green-600">Durchschnittl. Score:</span>
                  <span className="ml-1 font-medium text-green-800">
                    {(generationResult.averageScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-green-600">Gesamt-Score:</span>
                  <span className="ml-1 font-medium text-green-800">
                    {generationResult.totalScore.toFixed(3)}
                  </span>
                </div>
              </div>
              {generationResult.unplacedTasks.length > 0 && (
                <div className="mt-3 border-t border-green-200 pt-3">
                  <p className="text-sm font-medium text-yellow-700">
                    {generationResult.unplacedTasks.length} nicht platzierbare
                    Aufgaben:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {generationResult.unplacedTasks.map((task, idx) => (
                      <li key={idx} className="text-xs text-yellow-600">
                        Klasse {task.classId}, Fach {task.subjectId}:{" "}
                        {task.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Eintraege-Uebersicht */}
          {loading ? (
            <div className="text-gray-500">Lade Eintraege...</div>
          ) : currentEntries.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <p>Noch keine Eintraege vorhanden.</p>
              <p className="text-sm mt-2">
                Klicken Sie auf "Generieren", um den Stundenplan automatisch zu
                erstellen.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800">
                  Eintraege ({currentEntries.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">
                        Zeitslot
                      </th>
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">
                        Klasse
                      </th>
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">
                        Fach
                      </th>
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">
                        Lehrkraft
                      </th>
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">
                        Raum
                      </th>
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEntries.map((entry) => {
                      let score = "-";
                      try {
                        const log = JSON.parse(entry.decisionLog);
                        if (log.total_score !== undefined) {
                          score = `${(log.total_score * 100).toFixed(1)}%`;
                        }
                      } catch {
                        // Ignorieren
                      }
                      return (
                        <tr
                          key={entry.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-2 px-2 text-gray-700">
                            {entry.timeSlotId}
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {entry.classId}
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {entry.subjectId}
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {entry.teacherId}
                          </td>
                          <td className="py-2 px-2 text-gray-700">
                            {entry.roomId}
                          </td>
                          <td className="py-2 px-2 text-gray-700">{score}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Detaillierte Stundenplan-Ansicht (Drag & Drop Grid) wird in
                Phase 4 implementiert.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
