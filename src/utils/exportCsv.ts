import type { GridEntry } from "../hooks/useScheduleGrid";
import type { TimeSlot } from "../types";

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export function generateScheduleCsv(
  entries: GridEntry[],
  timeSlots: TimeSlot[],
): string {
  const slotMap = new Map(timeSlots.map((ts) => [ts.id, ts]));

  const rows = entries
    .map((e) => {
      const slot = slotMap.get(e.timeSlotId);
      if (!slot) return null;
      return {
        day: slot.dayOfWeek,
        period: slot.period,
        dayName: DAY_NAMES[slot.dayOfWeek - 1] ?? `Tag ${slot.dayOfWeek}`,
        startTime: slot.startTime,
        subjectName: e.subjectName,
        teacherName: e.teacherName,
        roomName: e.roomName,
        className: e.className,
      };
    })
    .filter((r) => r !== null)
    .sort((a, b) => a.day - b.day || a.period - b.period);

  const header = "Tag;Stunde;Uhrzeit;Fach;Lehrkraft;Raum;Klasse";
  const lines = rows.map(
    (r) =>
      `${r.dayName};${r.period};${r.startTime};${r.subjectName};${r.teacherName};${r.roomName};${r.className}`,
  );

  return [header, ...lines].join("\n");
}
