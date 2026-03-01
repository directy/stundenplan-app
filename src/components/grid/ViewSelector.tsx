import type { SchoolClass, Teacher } from "../../types";
import type { ViewMode } from "../../hooks/useScheduleGrid";

interface ViewSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedId: number | null;
  onSelectedIdChange: (id: number | null) => void;
  classes: SchoolClass[];
  teachers: Teacher[];
}

export function ViewSelector({
  viewMode,
  onViewModeChange,
  selectedId,
  onSelectedIdChange,
  classes,
  teachers,
}: ViewSelectorProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => {
            onViewModeChange("class");
            onSelectedIdChange(null);
          }}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            viewMode === "class"
              ? "bg-white text-blue-700 shadow-sm font-medium"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Klassenansicht
        </button>
        <button
          onClick={() => {
            onViewModeChange("teacher");
            onSelectedIdChange(null);
          }}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            viewMode === "teacher"
              ? "bg-white text-blue-700 shadow-sm font-medium"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Lehrkraftansicht
        </button>
      </div>

      <select
        value={selectedId ?? ""}
        onChange={(e) =>
          onSelectedIdChange(e.target.value ? Number(e.target.value) : null)
        }
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">
          {viewMode === "class"
            ? "Klasse wählen..."
            : "Lehrkraft wählen..."}
        </option>
        {viewMode === "class"
          ? classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          : teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
      </select>
    </div>
  );
}
