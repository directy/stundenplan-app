import { useDraggable } from "@dnd-kit/core";
import type { GridEntry } from "../../hooks/useScheduleGrid";
import type { SubjectColorMap } from "../../hooks/useSubjectColors";

interface EntryCardProps {
  entry: GridEntry;
  colorMap: SubjectColorMap;
  isDraftSchedule: boolean;
  showClassName: boolean;
  onEntryClick: (entry: GridEntry) => void;
}

export function EntryCard({
  entry,
  colorMap,
  isDraftSchedule,
  showClassName,
  onEntryClick,
}: EntryCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `entry-${entry.id}`,
      data: { entry },
      disabled: !isDraftSchedule,
    });

  const colors = colorMap.get(entry.subjectId);
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const scoreColor =
    entry.score === null
      ? "bg-gray-300"
      : entry.score >= 0.7
        ? "bg-green-500"
        : entry.score >= 0.4
          ? "bg-yellow-500"
          : "bg-red-500";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onEntryClick(entry)}
      className={`
        p-1.5 rounded-md border select-none
        ${colors?.bg ?? "bg-gray-100"} ${colors?.border ?? "border-gray-300"}
        ${isDragging ? "opacity-50 shadow-lg z-50" : "hover:shadow-sm"}
        ${isDraftSchedule ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
      `}
    >
      <div
        className={`text-xs font-bold ${colors?.text ?? "text-gray-800"}`}
      >
        {entry.subjectShortName}
      </div>
      <div className="text-[10px] text-gray-600 truncate">
        {entry.teacherName}
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[10px] text-gray-500">
          {showClassName ? entry.className : entry.roomName}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${scoreColor}`}
          title={
            entry.score !== null
              ? `Score: ${(entry.score * 100).toFixed(0)}%`
              : "Kein Score"
          }
        />
      </div>
    </div>
  );
}
