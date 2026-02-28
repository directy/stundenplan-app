import { useEffect, useMemo } from "react";
import { usePreferenceStore } from "../../store/preferenceStore";
import type { TeacherPreference } from "../../types";

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr"];

interface TeacherPreferencesGridProps {
  teacherId: number;
}

export function TeacherPreferencesGrid({
  teacherId,
}: TeacherPreferencesGridProps) {
  const { preferences, loading, fetchPreferences, createPreference, deletePreference } =
    usePreferenceStore();

  useEffect(() => {
    fetchPreferences(teacherId);
  }, [fetchPreferences, teacherId]);

  const prefMap = useMemo(() => {
    const map = new Map<string, TeacherPreference>();
    for (const p of preferences) {
      map.set(`${p.dayOfWeek}-${p.period}`, p);
    }
    return map;
  }, [preferences]);

  const handleCellClick = async (dayOfWeek: number, period: number) => {
    const key = `${dayOfWeek}-${period}`;
    const existing = prefMap.get(key);

    if (!existing) {
      await createPreference({
        teacherId,
        dayOfWeek,
        period,
        preferenceType: "preferred",
      });
    } else if (existing.preferenceType === "preferred") {
      await deletePreference(existing.id);
      await createPreference({
        teacherId,
        dayOfWeek,
        period,
        preferenceType: "unavailable",
      });
    } else {
      await deletePreference(existing.id);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 py-2">Lade Praeferenzen...</div>;
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-3">
        Klicken Sie auf eine Zelle, um den Status zu wechseln: neutral → bevorzugt → nicht verfuegbar → neutral
      </p>

      <div className="inline-block">
        <div className="grid grid-cols-[50px_repeat(5,56px)] gap-px bg-gray-300 rounded overflow-hidden">
          {/* Kopfzeile */}
          <div className="bg-gray-100 p-1.5 text-xs font-medium text-gray-500 text-center">
            Std.
          </div>
          {DAY_NAMES.map((name, i) => (
            <div
              key={i}
              className="bg-gray-100 p-1.5 text-xs font-medium text-gray-700 text-center"
            >
              {name}
            </div>
          ))}

          {/* Zeilen */}
          {Array.from({ length: 9 }, (_, i) => i + 1).map((period) => (
            <>
              <div
                key={`label-${period}`}
                className="bg-gray-100 p-1.5 text-xs font-medium text-gray-700 text-center"
              >
                {period}.
              </div>
              {[1, 2, 3, 4, 5].map((day) => {
                const pref = prefMap.get(`${day}-${period}`);
                const type = pref?.preferenceType;
                let cellClass = "bg-white";
                let cellText = "";
                if (type === "preferred") {
                  cellClass = "bg-green-200 hover:bg-green-300";
                  cellText = "✓";
                } else if (type === "unavailable") {
                  cellClass = "bg-red-200 hover:bg-red-300";
                  cellText = "✗";
                } else {
                  cellClass = "bg-white hover:bg-gray-100";
                }

                return (
                  <button
                    key={`${day}-${period}`}
                    onClick={() => handleCellClick(day, period)}
                    className={`${cellClass} p-1.5 text-xs text-center cursor-pointer transition-colors min-h-[28px]`}
                  >
                    {cellText}
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legende */}
      <div className="flex gap-4 mt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-400" />
          Bevorzugt
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-red-200 border border-red-400" />
          Nicht verfuegbar
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-white border border-gray-300" />
          Neutral
        </div>
      </div>

      {preferences.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {preferences.filter((p) => p.preferenceType === "preferred").length} bevorzugt,{" "}
          {preferences.filter((p) => p.preferenceType === "unavailable").length} nicht verfuegbar
        </div>
      )}
    </div>
  );
}
