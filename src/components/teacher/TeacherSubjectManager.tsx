import { useEffect, useState } from "react";
import { useTeacherStore } from "../../store/teacherStore";
import { useSubjectStore } from "../../store/subjectStore";
import type { Subject } from "../../types";

interface TeacherSubjectManagerProps {
  teacherId: number;
}

export function TeacherSubjectManager({
  teacherId,
}: TeacherSubjectManagerProps) {
  const { getTeacherSubjects, addTeacherSubject, removeTeacherSubject } =
    useTeacherStore();
  const { subjects, fetchSubjects } = useSubjectStore();
  const [assigned, setAssigned] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");

  const loadAssigned = async () => {
    setLoading(true);
    try {
      const subs = await getTeacherSubjects(teacherId);
      setAssigned(subs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssigned();
    fetchSubjects();
  }, [teacherId]);

  const available = subjects.filter(
    (s) => !assigned.some((a) => a.id === s.id),
  );

  const handleAdd = async () => {
    if (selectedSubjectId === "") return;
    await addTeacherSubject(teacherId, Number(selectedSubjectId));
    setSelectedSubjectId("");
    await loadAssigned();
  };

  const handleRemove = async (subjectId: number) => {
    await removeTeacherSubject(teacherId, subjectId);
    await loadAssigned();
  };

  if (loading) {
    return <div className="text-sm text-gray-500 py-2">Lade Fächer...</div>;
  }

  return (
    <div className="py-2">
      <div className="text-xs font-medium text-gray-500 uppercase mb-2">
        Zugewiesene Fächer
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {assigned.length === 0 ? (
          <span className="text-sm text-gray-400">Keine Fächer zugewiesen</span>
        ) : (
          assigned.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg"
            >
              {s.shortName} – {s.name}
              <button
                onClick={() => handleRemove(s.id)}
                className="text-blue-400 hover:text-red-500 ml-1"
                title="Entfernen"
              >
                &times;
              </button>
            </span>
          ))
        )}
      </div>
      {available.length > 0 && (
        <div className="flex gap-2 items-center">
          <select
            value={selectedSubjectId}
            onChange={(e) =>
              setSelectedSubjectId(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Fach auswählen...</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName} – {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={selectedSubjectId === ""}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}
