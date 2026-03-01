import { useEffect, useMemo } from "react";
import { useTeacherStore } from "../../store/teacherStore";
import { useSubjectStore } from "../../store/subjectStore";
import { useClassStore } from "../../store/classStore";
import { useRoomStore } from "../../store/roomStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useHolidayStore } from "../../store/holidayStore";
import { useAbsenceStore } from "../../store/absenceStore";
import type { AbsenceType } from "../../types";
import { Tooltip } from "../shared/Tooltip";

type Tab =
  | "dashboard"
  | "schedule"
  | "teachers"
  | "subjects"
  | "classes"
  | "rooms"
  | "rules"
  | "holidays"
  | "absences"
  | "substitution"
  | "reports"
  | "help";

interface DashboardViewProps {
  onNavigate: (tab: Tab) => void;
}

const ABSENCE_LABELS: Record<AbsenceType, string> = {
  illness: "Krankheit",
  maternity: "Mutterschutz",
  sabbatical: "Sabbat",
  training: "Fortbildung",
  other: "Sonstiges",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { teachers, fetchTeachers } = useTeacherStore();
  const { subjects, fetchSubjects } = useSubjectStore();
  const { classes, fetchClasses } = useClassStore();
  const { rooms, fetchRooms } = useRoomStore();
  const { schedules, fetchSchedules } = useScheduleStore();
  const { holidays, fetchHolidays } = useHolidayStore();
  const { absences, fetchAbsences } = useAbsenceStore();

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
    fetchClasses();
    fetchRooms();
    fetchSchedules();
    fetchHolidays();
    fetchAbsences();
  }, [
    fetchTeachers,
    fetchSubjects,
    fetchClasses,
    fetchRooms,
    fetchSchedules,
    fetchHolidays,
    fetchAbsences,
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const upcomingAbsences = useMemo(
    () =>
      absences
        .filter((a) => a.endDate >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 5),
    [absences, today],
  );

  const upcomingHolidays = useMemo(
    () =>
      holidays
        .filter((h) => h.endDate >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [holidays, today],
  );

  const teacherMap = useMemo(
    () => new Map(teachers.map((t) => [t.id, t.name])),
    [teachers],
  );

  const statusCounts = useMemo(() => {
    const counts = { draft: 0, active: 0, archived: 0 };
    for (const s of schedules) {
      counts[s.status]++;
    }
    return counts;
  }, [schedules]);

  const statCards = [
    {
      label: "Lehrkräfte",
      count: teachers.length,
      tab: "teachers" as Tab,
      color: "bg-blue-500",
      tooltip: "Gesamtzahl der erfassten Lehrkräfte. Klicken zum Verwalten.",
    },
    {
      label: "Fächer",
      count: subjects.length,
      tab: "subjects" as Tab,
      color: "bg-green-500",
      tooltip: "Gesamtzahl der definierten Unterrichtsfächer. Klicken zum Verwalten.",
    },
    {
      label: "Klassen",
      count: classes.length,
      tab: "classes" as Tab,
      color: "bg-purple-500",
      tooltip: "Gesamtzahl der Schulklassen. Klicken zum Verwalten.",
    },
    {
      label: "Räume",
      count: rooms.length,
      tab: "rooms" as Tab,
      color: "bg-orange-500",
      tooltip: "Gesamtzahl der verfügbaren Unterrichtsräume. Klicken zum Verwalten.",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Übersicht</h2>

      {/* Stammdaten-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Tooltip key={card.label} content={card.tooltip} position="bottom">
            <button
              onClick={() => onNavigate(card.tab)}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left overflow-hidden w-full"
            >
              <div className={`h-1.5 ${card.color}`} />
              <div className="p-4">
                <div className="text-3xl font-bold text-gray-800">
                  {card.count}
                </div>
                <div className="text-sm text-gray-500 mt-1">{card.label}</div>
              </div>
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Stundenpläne */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Stundenpläne</h3>
          <div className="flex gap-3 text-xs text-gray-500">
            <span>
              {statusCounts.draft} Entwurf
            </span>
            <span>
              {statusCounts.active} Aktiv
            </span>
            <span>
              {statusCounts.archived} Archiviert
            </span>
          </div>
        </div>
        {schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Noch kein Stundenplan erstellt.</p>
            <button
              onClick={() => onNavigate("schedule")}
              className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Stundenplan erstellen
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Gültig
                </th>
                <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">
                  Erstellt
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr
                  key={schedule.id}
                  onClick={() => onNavigate("schedule")}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {schedule.name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <StatusBadge status={schedule.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {schedule.validFrom && schedule.validTo
                      ? `${formatDate(schedule.validFrom)} – ${formatDate(schedule.validTo)}`
                      : "–"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">
                    {formatDate(schedule.createdAt.slice(0, 10))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Abwesenheiten + Ferien */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Aktuelle Abwesenheiten */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-700">
              Aktuelle Abwesenheiten
            </h3>
            <button
              onClick={() => onNavigate("absences")}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Alle anzeigen
            </button>
          </div>
          {upcomingAbsences.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Keine aktuellen Abwesenheiten
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingAbsences.map((absence) => (
                <div key={absence.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      {teacherMap.get(absence.teacherId) ?? "Unbekannt"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {ABSENCE_LABELS[absence.absenceType]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(absence.startDate)} –{" "}
                    {formatDate(absence.endDate)}
                  </div>
                </div>
              ))}
              {absences.filter((a) => a.endDate >= today).length > 5 && (
                <div className="px-4 py-2 text-center">
                  <button
                    onClick={() => onNavigate("absences")}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {absences.filter((a) => a.endDate >= today).length - 5}{" "}
                    weitere...
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nächste Ferien */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Nächste Ferien</h3>
            <button
              onClick={() => onNavigate("holidays")}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Alle anzeigen
            </button>
          </div>
          {upcomingHolidays.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Keine Feriendaten importiert
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingHolidays.map((holiday, i) => {
                const start = new Date(holiday.startDate);
                const end = new Date(holiday.endDate);
                const days =
                  Math.ceil(
                    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
                  ) + 1;
                return (
                  <div
                    key={holiday.id}
                    className={`px-4 py-3 ${i === 0 ? "bg-blue-50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${i === 0 ? "text-blue-800" : "text-gray-800"}`}
                      >
                        {holiday.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {days} Tage
                      </span>
                    </div>
                    <div
                      className={`text-xs mt-1 ${i === 0 ? "text-blue-600" : "text-gray-500"}`}
                    >
                      {formatDate(holiday.startDate)} –{" "}
                      {formatDate(holiday.endDate)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schnellaktionen */}
      <div className="bg-white rounded-lg shadow px-4 py-3">
        <h3 className="font-medium text-gray-700 mb-3">Schnellaktionen</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate("schedule")}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Stundenplan erstellen
          </button>
          <button
            onClick={() => onNavigate("holidays")}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Ferien importieren
          </button>
          <button
            onClick={() => onNavigate("substitution")}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Vertretung planen
          </button>
          <button
            onClick={() => onNavigate("reports")}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Bericht ansehen
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    draft: "Entwurf",
    active: "Aktiv",
    archived: "Archiviert",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
