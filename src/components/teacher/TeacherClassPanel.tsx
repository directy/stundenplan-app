import { useEffect } from "react";
import { useTeacherClassStore } from "../../store/teacherClassStore";
import { useClassStore } from "../../store/classStore";
import { Spinner } from "../shared/Spinner";
import type { RestrictionType } from "../../types/teacherClass";

interface Props {
  teacherId: number;
}

export function TeacherClassPanel({ teacherId }: Props) {
  const { restrictions, loading, fetchForTeacher, create, update, remove } =
    useTeacherClassStore();
  const { classes, fetchClasses } = useClassStore();

  useEffect(() => {
    fetchForTeacher(teacherId);
    fetchClasses();
  }, [teacherId, fetchForTeacher, fetchClasses]);

  const getRestriction = (classId: number) =>
    restrictions.find((r) => r.classId === classId);

  const handleToggle = async (classId: number) => {
    const existing = getRestriction(classId);
    if (existing) {
      await remove(existing.id);
    } else {
      await create({ teacherId, classId });
    }
  };

  const handleTypeChange = async (
    classId: number,
    newType: RestrictionType,
  ) => {
    const existing = getRestriction(classId);
    if (existing) {
      await update(existing.id, newType);
    }
  };

  if (loading && restrictions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Spinner size="sm" /> Lade Klassen-Zuordnungen...
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Bitte zuerst Klassen anlegen.
      </p>
    );
  }

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
    return a.name.localeCompare(b.name);
  });

  const hasQualifications = restrictions.some(
    (r) => r.restrictionType === "qualification",
  );

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Legen Sie fest, welche Klassen diese Lehrkraft unterrichten kann oder
        möchte.{" "}
        <strong>Kann</strong> = Harte Einschränkung (nur diese Klassen),{" "}
        <strong>Möchte</strong> = Weiche Präferenz (bevorzugt, nicht erzwungen).
      </p>

      {hasQualifications && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          Diese Lehrkraft hat &quot;Kann&quot;-Einträge. Sie wird{" "}
          <strong>nur</strong> für die markierten Klassen eingeplant.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {sortedClasses.map((cls) => {
          const restriction = getRestriction(cls.id);
          const isActive = !!restriction;

          return (
            <div
              key={cls.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isActive
                  ? restriction.restrictionType === "qualification"
                    ? "bg-green-50 border-green-300"
                    : "bg-blue-50 border-blue-300"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => handleToggle(cls.id)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">
                {cls.name}
              </span>
              {isActive && (
                <select
                  value={restriction.restrictionType}
                  onChange={(e) =>
                    handleTypeChange(
                      cls.id,
                      e.target.value as RestrictionType,
                    )
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="preference">Möchte</option>
                  <option value="qualification">Kann</option>
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
