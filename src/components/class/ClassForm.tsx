import { useState } from "react";
import type { SchoolClass, NewSchoolClass, Teacher } from "../../types";

interface ClassFormProps {
  schoolClass?: SchoolClass;
  onSubmit: (data: NewSchoolClass) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  teachers: Teacher[];
}

export function ClassForm({
  schoolClass,
  onSubmit,
  onCancel,
  loading,
  teachers,
}: ClassFormProps) {
  const [name, setName] = useState(schoolClass?.name ?? "");
  const [gradeLevel, setGradeLevel] = useState(schoolClass?.gradeLevel ?? 5);
  const [classTeacherId, setClassTeacherId] = useState<number | null>(
    schoolClass?.classTeacherId ?? null,
  );
  const [studentCount, setStudentCount] = useState(
    schoolClass?.studentCount ?? 25,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      gradeLevel,
      classTeacherId,
      studentCount,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="z.B. 5a"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Klassenstufe
          </label>
          <input
            type="number"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(Number(e.target.value))}
            min={1}
            max={13}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Schueleranzahl
          </label>
          <input
            type="number"
            value={studentCount}
            onChange={(e) => setStudentCount(Number(e.target.value))}
            min={1}
            max={40}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Klassenlehrer (optional)
        </label>
        <select
          value={classTeacherId ?? ""}
          onChange={(e) =>
            setClassTeacherId(
              e.target.value === "" ? null : Number(e.target.value),
            )
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">– Kein Klassenlehrer –</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading
            ? "Speichere..."
            : schoolClass
              ? "Speichern"
              : "Hinzufuegen"}
        </button>
      </div>
    </form>
  );
}
