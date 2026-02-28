import type { GridEntry } from "../hooks/useScheduleGrid";
import type { TimeSlot } from "../types";

export type CellStatus = "identical" | "changed" | "added" | "removed" | "empty";

export interface ComparisonCell {
  dayOfWeek: number;
  period: number;
  entryA: GridEntry | null;
  entryB: GridEntry | null;
  status: CellStatus;
  changes: string[];
}

export interface ComparisonStats {
  total: number;
  identical: number;
  changed: number;
  added: number;
  removed: number;
}

export interface ComparisonResult {
  cells: ComparisonCell[];
  stats: ComparisonStats;
}

export function compareSchedules(
  entriesA: GridEntry[],
  entriesB: GridEntry[],
  timeSlots: TimeSlot[],
): ComparisonResult {
  const slotMap = new Map(timeSlots.map((ts) => [ts.id, ts]));

  // Baue Maps: timeSlotId → GridEntry
  const mapA = new Map<number, GridEntry>();
  for (const e of entriesA) {
    mapA.set(e.timeSlotId, e);
  }
  const mapB = new Map<number, GridEntry>();
  for (const e of entriesB) {
    mapB.set(e.timeSlotId, e);
  }

  // Sammle alle relevanten TimeSlot-IDs
  const allSlotIds = new Set<number>();
  for (const id of mapA.keys()) allSlotIds.add(id);
  for (const id of mapB.keys()) allSlotIds.add(id);

  const cells: ComparisonCell[] = [];
  const stats: ComparisonStats = { total: 0, identical: 0, changed: 0, added: 0, removed: 0 };

  for (const slotId of allSlotIds) {
    const slot = slotMap.get(slotId);
    if (!slot) continue;

    const a = mapA.get(slotId) ?? null;
    const b = mapB.get(slotId) ?? null;

    let status: CellStatus;
    const changes: string[] = [];

    if (a && b) {
      if (a.subjectId === b.subjectId && a.teacherId === b.teacherId && a.roomId === b.roomId) {
        status = "identical";
        stats.identical++;
      } else {
        status = "changed";
        stats.changed++;
        if (a.subjectId !== b.subjectId) changes.push("Fach");
        if (a.teacherId !== b.teacherId) changes.push("Lehrkraft");
        if (a.roomId !== b.roomId) changes.push("Raum");
      }
    } else if (a && !b) {
      status = "removed";
      stats.removed++;
    } else {
      status = "added";
      stats.added++;
    }

    stats.total++;
    cells.push({
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      entryA: a,
      entryB: b,
      status,
      changes,
    });
  }

  return { cells, stats };
}
