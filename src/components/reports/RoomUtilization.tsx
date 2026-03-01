import { useMemo } from "react";
import type { ReportEntry } from "../../types/report";
import { Tooltip } from "../shared/Tooltip";

interface RoomUtilizationProps {
  entries: ReportEntry[];
}

function scoreColor(score: number): string {
  if (score >= 0.7) return "text-green-700 bg-green-100";
  if (score >= 0.4) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
}

export function RoomUtilization({ entries }: RoomUtilizationProps) {
  const rooms = useMemo(() => {
    const map = new Map<
      string,
      { count: number; scoreSum: number }
    >();

    for (const e of entries) {
      const current = map.get(e.roomName) ?? { count: 0, scoreSum: 0 };
      current.count++;
      current.scoreSum += e.totalScore;
      map.set(e.roomName, current);
    }

    const result = Array.from(map.entries())
      .map(([name, { count, scoreSum }]) => ({
        name,
        count,
        avgScore: scoreSum / count,
      }))
      .sort((a, b) => b.count - a.count);

    return result;
  }, [entries]);

  if (rooms.length === 0) return null;

  const maxCount = rooms[0].count;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <Tooltip content="Anzahl belegter Unterrichtsstunden pro Raum, sortiert nach Auslastung. Der farbige Badge zeigt den durchschnittlichen Qualitätsscore der in diesem Raum stattfindenden Stunden." position="bottom">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Raumnutzung ({rooms.length} Räume)
        </h3>
      </Tooltip>
      <div className="space-y-2">
        {rooms.map((room) => (
          <div key={room.name} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-28 truncate">
              {room.name}
            </span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400"
                style={{ width: `${(room.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-8 text-right">
              {room.count}h
            </span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded ${scoreColor(room.avgScore)}`}
            >
              {(room.avgScore * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
