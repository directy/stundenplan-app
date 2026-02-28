import type {
  ScheduleEntry,
  TimeSlot,
  Teacher,
  Subject,
  SchoolClass,
  Room,
} from "../types";
import type { GridEntry } from "../hooks/useScheduleGrid";

export function enrichEntries(
  entries: ScheduleEntry[],
  timeSlots: TimeSlot[],
  teachers: Teacher[],
  subjects: Subject[],
  classes: SchoolClass[],
  rooms: Room[],
): GridEntry[] {
  const teacherMap = new Map(teachers.map((t) => [t.id, t]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const slotMap = new Map(timeSlots.map((ts) => [ts.id, ts]));

  return entries
    .filter((e) => slotMap.has(e.timeSlotId))
    .map((entry) => {
      let score: number | null = null;
      try {
        const log = JSON.parse(entry.decisionLog);
        if (log.total_score !== undefined) score = log.total_score;
      } catch {
        // Ignorieren
      }

      return {
        id: entry.id,
        scheduleId: entry.scheduleId,
        timeSlotId: entry.timeSlotId,
        classId: entry.classId,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        roomId: entry.roomId,
        decisionLog: entry.decisionLog,
        subjectShortName: subjectMap.get(entry.subjectId)?.shortName ?? "?",
        subjectName: subjectMap.get(entry.subjectId)?.name ?? "Unbekannt",
        teacherName: teacherMap.get(entry.teacherId)?.name ?? "Unbekannt",
        roomName: roomMap.get(entry.roomId)?.name ?? "?",
        className: classMap.get(entry.classId)?.name ?? "?",
        score,
      };
    });
}
