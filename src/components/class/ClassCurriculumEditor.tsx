import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useClassCurriculumStore } from "../../store/classCurriculumStore";
import { useSubjectStore } from "../../store/subjectStore";
import { useClassStore } from "../../store/classStore";
import { Spinner } from "../shared/Spinner";

export function ClassCurriculumEditor() {
  const { classSubjects, loading, fetchAll, upsert, remove } =
    useClassCurriculumStore();
  const { subjects, fetchSubjects } = useSubjectStore();
  const { classes, fetchClasses } = useClassStore();

  const [editCell, setEditCell] = useState<{
    classId: number;
    subjectId: number;
    value: string;
  } | null>(null);
  const [source, setSource] = useState("");
  const [sourceEditing, setSourceEditing] = useState(false);
  const [sourceValue, setSourceValue] = useState("");

  useEffect(() => {
    fetchAll();
    fetchSubjects();
    fetchClasses();
  }, [fetchAll, fetchSubjects, fetchClasses]);

  useEffect(() => {
    invoke<{ key: string; value: string }[]>("get_all_settings").then((settings) => {
      const s = settings.find((st) => st.key === "curriculum_source");
      if (s) setSource(s.value);
    });
  }, []);

  const saveSource = async () => {
    await invoke("set_setting", { key: "curriculum_source", value: sourceValue });
    setSource(sourceValue);
    setSourceEditing(false);
  };

  const getHours = useCallback(
    (classId: number, subjectId: number): number | null => {
      const override = classSubjects.find(
        (cs) => cs.classId === classId && cs.subjectId === subjectId,
      );
      return override ? override.weeklyHours : null;
    },
    [classSubjects],
  );

  const getDefaultHours = useCallback(
    (subjectId: number): number => {
      return subjects.find((s) => s.id === subjectId)?.weeklyHoursDefault ?? 2;
    },
    [subjects],
  );

  const handleCellClick = (
    classId: number,
    subjectId: number,
    currentHours: number | null,
    defaultHours: number,
  ) => {
    setEditCell({
      classId,
      subjectId,
      value: String(currentHours ?? defaultHours),
    });
  };

  const handleCellSave = async () => {
    if (!editCell) return;
    const hours = parseInt(editCell.value, 10);
    if (isNaN(hours) || hours < 0) {
      setEditCell(null);
      return;
    }

    const defaultHours = getDefaultHours(editCell.subjectId);
    if (hours === defaultHours) {
      // Remove override if it matches default
      const existing = classSubjects.find(
        (cs) =>
          cs.classId === editCell.classId &&
          cs.subjectId === editCell.subjectId,
      );
      if (existing) {
        await remove(editCell.classId, editCell.subjectId);
      }
    } else {
      await upsert({
        classId: editCell.classId,
        subjectId: editCell.subjectId,
        weeklyHours: hours,
      });
    }
    setEditCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCellSave();
    if (e.key === "Escape") setEditCell(null);
  };

  if (loading && classSubjects.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Spinner size="sm" /> Lade Stundentafel...
      </div>
    );
  }

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Bitte zuerst Klassen und Fächer anlegen.
      </p>
    );
  }

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
    return a.name.localeCompare(b.name);
  });

  const sortedSubjects = [...subjects].sort((a, b) =>
    a.shortName.localeCompare(b.shortName),
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Stundentafel</h3>
          <p className="text-xs text-gray-500">
            Klicken Sie auf eine Zelle, um die Wochenstunden anzupassen. Graue
            Werte sind Standardvorgaben des Fachs.
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            <span>Quelle:</span>
            {sourceEditing ? (
              <span className="flex items-center gap-1">
                <input
                  type="text"
                  value={sourceValue}
                  onChange={(e) => setSourceValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveSource();
                    if (e.key === "Escape") setSourceEditing(false);
                  }}
                  placeholder="z.B. Sächsischer Lehrplan 2024"
                  className="border border-blue-400 rounded px-1.5 py-0.5 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={saveSource}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setSourceEditing(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Abbrechen
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setSourceValue(source);
                  setSourceEditing(true);
                }}
                className="text-gray-600 hover:text-blue-600 hover:underline italic"
              >
                {source || "Keine Quelle hinterlegt – klicken zum Bearbeiten"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 sticky left-0 bg-gray-100 z-10 border-r">
                Klasse
              </th>
              {sortedSubjects.map((subject) => (
                <th
                  key={subject.id}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-600 min-w-[48px]"
                  title={subject.name}
                >
                  {subject.shortName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedClasses.map((cls) => (
              <tr key={cls.id} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 text-sm font-medium text-gray-800 sticky left-0 bg-white z-10 border-r">
                  {cls.name}
                </td>
                {sortedSubjects.map((subject) => {
                  const override = getHours(cls.id, subject.id);
                  const defaultHours = getDefaultHours(subject.id);
                  const isEditing =
                    editCell?.classId === cls.id &&
                    editCell?.subjectId === subject.id;
                  const displayHours = override ?? defaultHours;
                  const isOverridden = override !== null;
                  const isZero = displayHours === 0;

                  return (
                    <td
                      key={subject.id}
                      className="px-1 py-1 text-center"
                    >
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={editCell.value}
                          onChange={(e) =>
                            setEditCell({ ...editCell, value: e.target.value })
                          }
                          onBlur={handleCellSave}
                          onKeyDown={handleKeyDown}
                          className="w-12 text-center text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() =>
                            handleCellClick(
                              cls.id,
                              subject.id,
                              override,
                              defaultHours,
                            )
                          }
                          className={`w-10 py-0.5 rounded text-xs transition-colors ${
                            isZero
                              ? "text-gray-300 hover:bg-gray-100"
                              : isOverridden
                              ? "text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100"
                              : "text-gray-500 hover:bg-gray-100"
                          }`}
                          title={
                            isOverridden
                              ? `Überschrieben (Standard: ${defaultHours})`
                              : `Standard: ${defaultHours}`
                          }
                        >
                          {displayHours}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-200" />
          Überschrieben
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-white border border-gray-200" />
          Standardwert
        </span>
        <span className="flex items-center gap-1">
          <span className="text-gray-300">0</span> = Fach nicht in dieser
          Klasse
        </span>
      </div>
    </div>
  );
}
