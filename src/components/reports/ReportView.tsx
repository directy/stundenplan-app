import { useEffect, useState } from "react";
import { useReportStore } from "../../store/reportStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useTeacherStore } from "../../store/teacherStore";
import { useSubjectStore } from "../../store/subjectStore";
import { CONSTRAINT_LABELS } from "../../utils/constraintLabels";
import { ScoreHeatmap } from "./ScoreHeatmap";
import { RoomUtilization } from "./RoomUtilization";
import { SubjectCoverage } from "./SubjectCoverage";
import { WorkloadFairness } from "./WorkloadFairness";

const DAY_NAMES = ["", "Mo", "Di", "Mi", "Do", "Fr"];

function scoreColor(score: number): string {
  if (score >= 0.7) return "text-green-700 bg-green-100";
  if (score >= 0.4) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
}

function barColor(score: number): string {
  if (score >= 0.7) return "bg-green-500";
  if (score >= 0.4) return "bg-yellow-500";
  return "bg-red-400";
}

export function ReportView() {
  const { report, loading, error, fetchReport } = useReportStore();
  const { schedules, fetchSchedules } = useScheduleStore();
  const { teachers, fetchTeachers } = useTeacherStore();
  const { subjects, fetchSubjects } = useSubjectStore();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    fetchSchedules();
    fetchTeachers();
    fetchSubjects();
  }, [fetchSchedules, fetchTeachers, fetchSubjects]);

  // Auto-select active schedule
  useEffect(() => {
    if (selectedScheduleId === null && schedules.length > 0) {
      const active = schedules.find((s) => s.status === "active");
      setSelectedScheduleId(active ? active.id : schedules[0].id);
    }
  }, [schedules, selectedScheduleId]);

  // Load report when schedule changes
  useEffect(() => {
    if (selectedScheduleId) {
      fetchReport(selectedScheduleId);
    }
  }, [selectedScheduleId, fetchReport]);

  const handleScheduleChange = (id: number) => {
    setSelectedScheduleId(id);
  };

  const problemEntries = report
    ? [...report.entries]
        .filter((e) => e.totalScore < 0.4)
        .sort((a, b) => a.totalScore - b.totalScore)
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Transparenzbericht
        </h2>
      </div>

      {/* Plan-Auswahl */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <label className="block text-xs text-gray-500 mb-1">Stundenplan</label>
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

      {/* Fehler */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-gray-500 text-sm mb-4">Lade Bericht...</div>
      )}

      {/* Kein Plan */}
      {!selectedScheduleId && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>Bitte einen Stundenplan auswaehlen.</p>
        </div>
      )}

      {/* Report */}
      {report && !loading && (
        <>
          {/* Zusammenfassung */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <SummaryCard
              label="Eintraege"
              value={String(report.summary.totalEntries)}
              sub={`${report.summary.coveragePercent}% Abdeckung`}
            />
            <SummaryCard
              label="Durchschnitt"
              value={`${(report.summary.averageScore * 100).toFixed(1)}%`}
              color={scoreColor(report.summary.averageScore)}
            />
            <SummaryCard
              label="Minimum"
              value={`${(report.summary.minScore * 100).toFixed(1)}%`}
              color={scoreColor(report.summary.minScore)}
            />
            <SummaryCard
              label="Problemstellen"
              value={String(report.summary.entriesBelowThreshold)}
              sub="Score < 40%"
              color={
                report.summary.entriesBelowThreshold > 0
                  ? "text-red-700 bg-red-100"
                  : "text-green-700 bg-green-100"
              }
            />
          </div>

          {/* Constraint-Analyse */}
          {report.constraintAnalysis.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Constraint-Analyse
              </h3>
              <div className="space-y-2">
                {report.constraintAnalysis.map((c) => (
                  <div key={c.constraintName} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-44 truncate">
                      {c.label}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(c.averageScore)}`}
                        style={{ width: `${c.averageScore * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-12 text-right">
                      {(c.averageScore * 100).toFixed(0)}%
                    </span>
                    {c.violationsCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        {c.violationsCount}x verletzt
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lehrer-Workload */}
          {report.teacherWorkloads.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
              <div className="p-4 pb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Lehrer-Workload ({report.teacherWorkloads.length})
                </h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">
                      Lehrkraft
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">
                      Stunden
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">
                      Faecher
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">
                      Klassen
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">
                      Avg Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.teacherWorkloads.map((tw) => (
                    <tr
                      key={tw.teacherId}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {tw.teacherName}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">
                        {tw.totalHours}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">
                        {tw.uniqueSubjects}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">
                        {tw.uniqueClasses}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${scoreColor(tw.averageScore)}`}
                        >
                          {(tw.averageScore * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Workload-Fairness */}
          {report.teacherWorkloads.length > 0 && (
            <WorkloadFairness
              workloads={report.teacherWorkloads}
              teachers={teachers}
            />
          )}

          {/* Score-Heatmap */}
          {report.entries.length > 0 && (
            <ScoreHeatmap entries={report.entries} />
          )}

          {/* Raumnutzung */}
          {report.entries.length > 0 && (
            <RoomUtilization entries={report.entries} />
          )}

          {/* Fach-Abdeckung */}
          {report.entries.length > 0 && (
            <SubjectCoverage
              entries={report.entries}
              subjects={subjects}
            />
          )}

          {/* Problemstellen */}
          {problemEntries.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
              <div className="p-4 pb-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Eintraege mit niedrigem Score ({problemEntries.length})
                </h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">
                      Tag/Stunde
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">
                      Klasse
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">
                      Fach
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">
                      Lehrkraft
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">
                      Score
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">
                      Schwaechen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {problemEntries.map((entry) => {
                    const weakConstraints = Object.entries(entry.softScores)
                      .filter(([, v]) => v < 0.4)
                      .map(([k]) => CONSTRAINT_LABELS[k] ?? k);

                    return (
                      <tr
                        key={entry.entryId}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {DAY_NAMES[entry.dayOfWeek] ?? entry.dayOfWeek}
                          {" / "}
                          {entry.period}. Std
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {entry.className}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {entry.subjectName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {entry.teacherName}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${scoreColor(entry.totalScore)}`}
                          >
                            {(entry.totalScore * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">
                          {weakConstraints.length > 0
                            ? weakConstraints.join(", ")
                            : "–"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Keine Problemstellen */}
          {report.summary.entriesBelowThreshold === 0 &&
            report.summary.totalEntries > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-700">
                  Alle Eintraege haben einen Score von mindestens 40% – keine
                  kritischen Problemstellen.
                </p>
              </div>
            )}

          {/* Leerer Plan */}
          {report.summary.totalEntries === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <p className="text-sm">
                Dieser Stundenplan hat noch keine Eintraege. Bitte zuerst einen
                Plan generieren.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`text-xl font-bold ${color ? color.split(" ")[0] : "text-gray-800"}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
