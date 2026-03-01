import { Fragment, useMemo, useState } from "react";
import type { ReportEntry } from "../../types/report";
import { Tooltip } from "../shared/Tooltip";

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr"];

interface ScoreHeatmapProps {
  entries: ReportEntry[];
}

function heatColor(score: number): string {
  if (score >= 0.7) return "bg-green-200 text-green-900";
  if (score >= 0.4) return "bg-yellow-200 text-yellow-900";
  return "bg-red-200 text-red-900";
}

function heatGradient(score: number): string {
  const hue = score * 120; // 0=rot, 60=gelb, 120=grün
  const lightness = 45 + (1 - score) * 10;
  return `hsl(${hue}, 70%, ${lightness}%)`;
}

export function ScoreHeatmap({ entries }: ScoreHeatmapProps) {
  const [gradientMode, setGradientMode] = useState(false);

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
      <div className="flex items-center justify-between mb-3">
        <Tooltip content="Durchschnittlicher Qualitätsscore pro Zeitfenster (Tag x Stunde). Hilft, systematische Schwachstellen zu erkennen (z.B. Freitag Nachmittag)." position="bottom">
          <h3 className="text-sm font-medium text-gray-700">
            Score-Heatmap (Tag / Stunde)
          </h3>
        </Tooltip>
        <button
          onClick={() => setGradientMode(!gradientMode)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            gradientMode
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {gradientMode ? "Gradient" : "Stufen"}
        </button>
      </div>
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
                const tooltipText = score !== undefined
                  ? `${DAY_NAMES[day - 1]} ${period}. Stunde: ${(score * 100).toFixed(0)}%`
                  : "Keine Einträge";

                if (score !== undefined && gradientMode) {
                  return (
                    <div
                      key={`${day}-${period}`}
                      className="text-center text-xs font-medium rounded py-2 text-white"
                      style={{ backgroundColor: heatGradient(score) }}
                      title={tooltipText}
                    >
                      {(score * 100).toFixed(0)}%
                    </div>
                  );
                }

                return (
                  <div
                    key={`${day}-${period}`}
                    className={`text-center text-xs font-medium rounded py-2 ${
                      score !== undefined
                        ? heatColor(score)
                        : "bg-gray-50 text-gray-300"
                    }`}
                    title={tooltipText}
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

      {/* Legende */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        {gradientMode ? (
          <>
            <span>Legende:</span>
            <div className="flex items-center gap-1">
              <div className="w-16 h-3 rounded" style={{
                background: "linear-gradient(to right, hsl(0,70%,50%), hsl(60,70%,48%), hsl(120,70%,45%))"
              }} />
              <span>0%</span>
              <span className="ml-10">100%</span>
            </div>
          </>
        ) : (
          <>
            <span>Legende:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-200" /> &ge; 70%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-200" /> &ge; 40%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-200" /> &lt; 40%
            </span>
          </>
        )}
      </div>
    </div>
  );
}
