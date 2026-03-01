import { Fragment } from "react";
import type { GridEntry } from "../../hooks/useScheduleGrid";
import type { SubjectColorMap } from "../../hooks/useSubjectColors";
import type { CellStatus, ComparisonCell } from "../../utils/scheduleComparison";

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

interface ComparisonGridProps {
  label: string;
  cells: Map<string, ComparisonCell>;
  side: "A" | "B";
  colorMap: SubjectColorMap;
  periodLabels: Map<number, { startTime: string; endTime: string }>;
}

function cellKey(day: number, period: number) {
  return `${day}-${period}`;
}

const statusBg: Record<CellStatus, string> = {
  identical: "",
  changed: "bg-amber-50",
  added: "bg-green-50",
  removed: "bg-red-50",
  empty: "",
};

const statusBorder: Record<CellStatus, string> = {
  identical: "border-gray-200",
  changed: "border-amber-300",
  added: "border-green-300",
  removed: "border-red-300",
  empty: "border-gray-200",
};

function EntryDisplay({
  entry,
  colorMap,
}: {
  entry: GridEntry;
  colorMap: SubjectColorMap;
}) {
  const colors = colorMap.get(entry.subjectId);

  return (
    <div
      className={`p-1.5 rounded-md border ${colors?.bg ?? "bg-gray-100"} ${colors?.border ?? "border-gray-300"}`}
    >
      <div className={`text-xs font-bold ${colors?.text ?? "text-gray-800"}`}>
        {entry.subjectShortName}
      </div>
      <div className="text-[10px] text-gray-600 truncate">
        {entry.teacherName}
      </div>
      <div className="text-[10px] text-gray-500">{entry.roomName}</div>
    </div>
  );
}

export function ComparisonGrid({
  label,
  cells,
  side,
  colorMap,
  periodLabels,
}: ComparisonGridProps) {
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 truncate">
        {label}
      </h3>
      <div className="bg-white rounded-lg shadow overflow-auto">
        <div className="grid grid-cols-[60px_repeat(5,1fr)] min-w-[400px]">
          {/* Kopfzeile */}
          <div className="p-1 bg-gray-50 border-b border-r border-gray-200 text-[10px] font-medium text-gray-500">
            Std.
          </div>
          {DAY_NAMES.map((name, i) => (
            <div
              key={i}
              className="p-1 bg-gray-50 border-b border-gray-200 text-[10px] font-medium text-gray-700 text-center"
            >
              {name.slice(0, 2)}
            </div>
          ))}

          {/* Periodenzeilen */}
          {Array.from({ length: 9 }, (_, i) => i + 1).map((period) => {
            const pl = periodLabels.get(period);
            return (
              <Fragment key={period}>
                <div className="p-1 border-r border-b border-gray-200 text-center bg-gray-50">
                  <div className="text-xs font-medium text-gray-700">
                    {period}.
                  </div>
                  {pl && (
                    <div className="text-[9px] text-gray-400">
                      {pl.startTime}
                    </div>
                  )}
                </div>

                {[1, 2, 3, 4, 5].map((day) => {
                  const key = cellKey(day, period);
                  const cell = cells.get(key);
                  const entry = side === "A" ? cell?.entryA : cell?.entryB;
                  const status = cell?.status ?? "empty";

                  return (
                    <div
                      key={key}
                      className={`border-b p-0.5 min-h-[48px] ${statusBorder[status]} ${statusBg[status]}`}
                      title={
                        cell?.changes.length
                          ? `Geändert: ${cell.changes.join(", ")}`
                          : undefined
                      }
                    >
                      {entry && (
                        <EntryDisplay entry={entry} colorMap={colorMap} />
                      )}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
