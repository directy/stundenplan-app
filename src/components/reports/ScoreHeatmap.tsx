import { Fragment, useMemo } from "react";
import type { ReportEntry } from "../../types/report";

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr"];

interface ScoreHeatmapProps {
  entries: ReportEntry[];
}

function heatColor(score: number): string {
  if (score >= 0.7) return "bg-green-200 text-green-900";
  if (score >= 0.4) return "bg-yellow-200 text-yellow-900";
  return "bg-red-200 text-red-900";
}

export function ScoreHeatmap({ entries }: ScoreHeatmapProps) {
  const grid = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();

    for (const e of entries) {
      const key = `${e.dayOfWeek}-${e.period}`;
      const current = map.get(key) ?? { sum: 0, count: 0 };
      current.sum += e.totalScore;
      current.count++;
      map.set(key, current);
    }

    const result = new Map<string, number>();
    for (const [key, { sum, count }] of map) {
      result.set(key, sum / count);
    }
    return result;
  }, [entries]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Score-Heatmap (Tag / Stunde)
      </h3>
      <div className="overflow-auto">
        <div className="grid grid-cols-[50px_repeat(5,1fr)] gap-0.5 min-w-[350px]">
          {/* Header */}
          <div />
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-medium text-gray-600 py-1"
            >
              {name}
            </div>
          ))}

          {/* Rows */}
          {Array.from({ length: 9 }, (_, i) => i + 1).map((period) => (
            <Fragment key={period}>
              <div
                className="text-xs font-medium text-gray-600 flex items-center justify-center"
              >
                {period}. Std
              </div>
              {[1, 2, 3, 4, 5].map((day) => {
                const score = grid.get(`${day}-${period}`);
                return (
                  <div
                    key={`${day}-${period}`}
                    className={`text-center text-xs font-medium rounded py-2 ${
                      score !== undefined
                        ? heatColor(score)
                        : "bg-gray-50 text-gray-300"
                    }`}
                    title={
                      score !== undefined
                        ? `${DAY_NAMES[day - 1]} ${period}. Stunde: ${(score * 100).toFixed(0)}%`
                        : "Keine Eintraege"
                    }
                  >
                    {score !== undefined
                      ? `${(score * 100).toFixed(0)}%`
                      : "–"}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
