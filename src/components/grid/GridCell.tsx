import { useDroppable } from "@dnd-kit/core";
import type { GridEntry } from "../../hooks/useScheduleGrid";
import type { SubjectColorMap } from "../../hooks/useSubjectColors";
import { EntryCard } from "./EntryCard";

interface GridCellProps {
  cellId: string;
  entry: GridEntry | null;
  colorMap: SubjectColorMap;
  isDraftSchedule: boolean;
  showClassName: boolean;
  onEntryClick: (entry: GridEntry) => void;
}

export function GridCell({
  cellId,
  entry,
  colorMap,
  isDraftSchedule,
  showClassName,
  onEntryClick,
}: GridCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${cellId}`,
    data: { cellId },
    disabled: !isDraftSchedule,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[60px] p-1 border border-gray-200 rounded transition-colors
        ${isOver && !entry ? "bg-blue-50 border-blue-400" : ""}
        ${isOver && entry ? "bg-amber-50 border-amber-400" : ""}
        ${!isOver && !entry ? "bg-white" : ""}
      `}
    >
      {entry && (
        <EntryCard
          entry={entry}
          colorMap={colorMap}
          isDraftSchedule={isDraftSchedule}
          showClassName={showClassName}
          onEntryClick={onEntryClick}
        />
      )}
    </div>
  );
}
