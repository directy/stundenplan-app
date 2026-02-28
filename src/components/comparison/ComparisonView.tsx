import { useEffect, useState, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useScheduleStore } from "../../store/scheduleStore";
import { useTeacherStore } from "../../store/teacherStore";
import { useSubjectStore } from "../../store/subjectStore";
import { useClassStore } from "../../store/classStore";
import { useRoomStore } from "../../store/roomStore";
import { useTimeSlotStore } from "../../store/timeSlotStore";
import { useSubjectColors } from "../../hooks/useSubjectColors";
import type { ScheduleEntry } from "../../types";
import { enrichEntries } from "../../utils/enrichEntries";
import {
  compareSchedules,
  type ComparisonCell,
  type ComparisonResult,
} from "../../utils/scheduleComparison";
import { ComparisonGrid } from "./ComparisonGrid";
import { ComparisonStats } from "./ComparisonStats";
import { Spinner } from "../shared/Spinner";

export function ComparisonView() {
  const { schedules, fetchSchedules } = useScheduleStore();
  const { teachers, fetchTeachers } = useTeacherStore();
  const { subjects, fetchSubjects } = useSubjectStore();
  const { classes, fetchClasses } = useClassStore();
  const { rooms, fetchRooms } = useRoomStore();
  const { timeSlots, fetchTimeSlots } = useTimeSlotStore();

  const [idA, setIdA] = useState<number | null>(null);
  const [idB, setIdB] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState<number | null>(null);
  const [entriesA, setEntriesA] = useState<ScheduleEntry[]>([]);
  const [entriesB, setEntriesB] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const colorMap = useSubjectColors(subjects);

  useEffect(() => {
    fetchSchedules();
    fetchTeachers();
    fetchSubjects();
    fetchClasses();
    fetchRooms();
    fetchTimeSlots();
  }, [fetchSchedules, fetchTeachers, fetchSubjects, fetchClasses, fetchRooms, fetchTimeSlots]);

  const loadEntries = useCallback(async (scheduleId: number) => {
    return invoke<ScheduleEntry[]>("get_schedule_entries", { scheduleId });
  }, []);

  useEffect(() => {
    if (!idA) {
      setEntriesA([]);
      return;
    }
    setLoading(true);
    loadEntries(idA)
      .then(setEntriesA)
      .finally(() => setLoading(false));
  }, [idA, loadEntries]);

  useEffect(() => {
    if (!idB) {
      setEntriesB([]);
      return;
    }
    setLoading(true);
    loadEntries(idB)
      .then(setEntriesB)
      .finally(() => setLoading(false));
  }, [idB, loadEntries]);

  const enrichedA = useMemo(
    () => enrichEntries(entriesA, timeSlots, teachers, subjects, classes, rooms),
    [entriesA, timeSlots, teachers, subjects, classes, rooms],
  );

  const enrichedB = useMemo(
    () => enrichEntries(entriesB, timeSlots, teachers, subjects, classes, rooms),
    [entriesB, timeSlots, teachers, subjects, classes, rooms],
  );

  const filteredA = useMemo(
    () => (classFilter ? enrichedA.filter((e) => e.classId === classFilter) : enrichedA),
    [enrichedA, classFilter],
  );

  const filteredB = useMemo(
    () => (classFilter ? enrichedB.filter((e) => e.classId === classFilter) : enrichedB),
    [enrichedB, classFilter],
  );

  const comparison: ComparisonResult | null = useMemo(() => {
    if (!idA || !idB) return null;
    return compareSchedules(filteredA, filteredB, timeSlots);
  }, [filteredA, filteredB, timeSlots, idA, idB]);

  // Baue Cell-Maps fuer die Grids (key: "day-period")
  const cellMap = useMemo(() => {
    const map = new Map<string, ComparisonCell>();
    if (!comparison) return map;
    for (const cell of comparison.cells) {
      map.set(`${cell.dayOfWeek}-${cell.period}`, cell);
    }
    return map;
  }, [comparison]);

  const periodLabels = useMemo(() => {
    const labels = new Map<number, { startTime: string; endTime: string }>();
    for (const slot of timeSlots) {
      if (!labels.has(slot.period)) {
        labels.set(slot.period, { startTime: slot.startTime, endTime: slot.endTime });
      }
    }
    return labels;
  }, [timeSlots]);

  const scheduleNameA = schedules.find((s) => s.id === idA)?.name ?? "";
  const scheduleNameB = schedules.find((s) => s.id === idB)?.name ?? "";

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Stundenplan-Vergleich
      </h2>

      {/* Auswahl */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Plan A (links)
            </label>
            <select
              value={idA ?? ""}
              onChange={(e) => setIdA(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Plan waehlen --</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === idB}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Plan B (rechts)
            </label>
            <select
              value={idB ?? ""}
              onChange={(e) => setIdB(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Plan waehlen --</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === idA}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Klasse (Filter)
            </label>
            <select
              value={classFilter ?? ""}
              onChange={(e) => setClassFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Klassen</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kein Plan ausgewaehlt */}
      {(!idA || !idB) && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>Bitte zwei Stundenplaene auswaehlen, um den Vergleich zu starten.</p>
        </div>
      )}

      {/* Laden */}
      {loading && idA && idB && (
        <div className="flex items-center gap-2 text-gray-500 mb-4">
          <Spinner size="sm" /> Lade Eintraege...
        </div>
      )}

      {/* Vergleich */}
      {comparison && idA && idB && !loading && (
        <>
          {/* Statistik */}
          <div className="mb-4">
            <ComparisonStats stats={comparison.stats} />
          </div>

          {/* Legende */}
          <div className="flex gap-4 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" />
              Geaendert
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-200 border border-green-400" />
              Hinzugefuegt
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-200 border border-red-400" />
              Entfernt
            </span>
          </div>

          {/* Side-by-Side Grids */}
          <div className="flex gap-4">
            <ComparisonGrid
              label={scheduleNameA}
              cells={cellMap}
              side="A"
              colorMap={colorMap}
              periodLabels={periodLabels}
            />
            <ComparisonGrid
              label={scheduleNameB}
              cells={cellMap}
              side="B"
              colorMap={colorMap}
              periodLabels={periodLabels}
            />
          </div>
        </>
      )}
    </div>
  );
}
