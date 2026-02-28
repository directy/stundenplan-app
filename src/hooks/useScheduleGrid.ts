import { useMemo } from "react";
import type {
  ScheduleEntry,
  TimeSlot,
  Teacher,
  Subject,
  SchoolClass,
  Room,
} from "../types";

export type ViewMode = "class" | "teacher";

export interface GridEntry {
  id: number;
  scheduleId: number;
  timeSlotId: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  roomId: number;
  decisionLog: string;
  subjectShortName: string;
  subjectName: string;
  teacherName: string;
  roomName: string;
  className: string;
  score: number | null;
}

export type GridData = Map<string, GridEntry | null>;

export function cellKey(dayOfWeek: number, period: number): string {
  return `${dayOfWeek}-${period}`;
}

export function parseCellKey(key: string): {
  dayOfWeek: number;
  period: number;
} {
  const [d, p] = key.split("-").map(Number);
  return { dayOfWeek: d, period: p };
}

interface UseScheduleGridParams {
  entries: ScheduleEntry[];
  timeSlots: TimeSlot[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: SchoolClass[];
  rooms: Room[];
  viewMode: ViewMode;
  selectedId: number | null;
}

export function useScheduleGrid(params: UseScheduleGridParams) {
  const {
    entries,
    timeSlots,
    teachers,
    subjects,
    classes,
    rooms,
    viewMode,
    selectedId,
  } = params;

  const lookups = useMemo(
    () => ({
      teacherMap: new Map(teachers.map((t) => [t.id, t])),
      subjectMap: new Map(subjects.map((s) => [s.id, s])),
      classMap: new Map(classes.map((c) => [c.id, c])),
      roomMap: new Map(rooms.map((r) => [r.id, r])),
      slotMap: new Map(timeSlots.map((ts) => [ts.id, ts])),
    }),
    [teachers, subjects, classes, rooms, timeSlots],
  );

  const filteredEntries = useMemo(() => {
    if (selectedId === null) return [];
    return entries.filter((e) =>
      viewMode === "class"
        ? e.classId === selectedId
        : e.teacherId === selectedId,
    );
  }, [entries, viewMode, selectedId]);

  const gridData = useMemo(() => {
    const map: GridData = new Map();

    for (let day = 1; day <= 5; day++) {
      for (let period = 1; period <= 9; period++) {
        map.set(cellKey(day, period), null);
      }
    }

    for (const entry of filteredEntries) {
      const slot = lookups.slotMap.get(entry.timeSlotId);
      if (!slot) continue;

      let score: number | null = null;
      try {
        const log = JSON.parse(entry.decisionLog);
        if (log.total_score !== undefined) score = log.total_score;
      } catch {
        // Ignorieren
      }

      const gridEntry: GridEntry = {
        id: entry.id,
        scheduleId: entry.scheduleId,
        timeSlotId: entry.timeSlotId,
        classId: entry.classId,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        roomId: entry.roomId,
        decisionLog: entry.decisionLog,
        subjectShortName:
          lookups.subjectMap.get(entry.subjectId)?.shortName ?? "?",
        subjectName:
          lookups.subjectMap.get(entry.subjectId)?.name ?? "Unbekannt",
        teacherName:
          lookups.teacherMap.get(entry.teacherId)?.name ?? "Unbekannt",
        roomName: lookups.roomMap.get(entry.roomId)?.name ?? "?",
        className: lookups.classMap.get(entry.classId)?.name ?? "?",
        score,
      };

      map.set(cellKey(slot.dayOfWeek, slot.period), gridEntry);
    }

    return map;
  }, [filteredEntries, lookups]);

  const periodLabels = useMemo(() => {
    const labels = new Map<number, { startTime: string; endTime: string }>();
    for (const slot of timeSlots) {
      if (!labels.has(slot.period)) {
        labels.set(slot.period, {
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }
    return labels;
  }, [timeSlots]);

  return { gridData, periodLabels, filteredEntries };
}
