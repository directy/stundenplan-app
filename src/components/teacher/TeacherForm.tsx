import { useState } from "react";
import type { Teacher, NewTeacher } from "../../types";

interface TeacherFormProps {
  teacher?: Teacher;
  onSubmit: (data: NewTeacher) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function TeacherForm({
  teacher,
  onSubmit,
  onCancel,
  loading,
}: TeacherFormProps) {
  const [name, setName] = useState(teacher?.name ?? "");
  const [email, setEmail] = useState(teacher?.email ?? "");
  const [partTimeQuota, setPartTimeQuota] = useState(
    teacher?.partTimeQuota ?? 1.0,
  );
  const [maxHoursPerDay, setMaxHoursPerDay] = useState(
    teacher?.maxHoursPerDay ?? 6,
  );
  const [engagementScore, setEngagementScore] = useState(
    teacher?.engagementScore ?? 0.5,
  );
  const [pedagogicalScore, setPedagogicalScore] = useState(
    teacher?.pedagogicalScore ?? 0.5,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      email: email.trim() || null,
      partTimeQuota,
      maxHoursPerDay,
      engagementScore,
      pedagogicalScore,
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
          placeholder="z.B. Anna Müller"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-Mail (optional)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="z.B. müller@schule.de"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teilzeitquote
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={partTimeQuota}
              onChange={(e) => setPartTimeQuota(Number(e.target.value))}
              min={0.1}
              max={1.0}
              step={0.05}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-600 w-12 text-right">
              {Math.round(partTimeQuota * 100)}%
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max. Std./Tag
          </label>
          <input
            type="number"
            value={maxHoursPerDay}
            onChange={(e) => setMaxHoursPerDay(Number(e.target.value))}
            min={1}
            max={9}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Engagement
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={engagementScore}
              onChange={(e) => setEngagementScore(Number(e.target.value))}
              min={0}
              max={1.0}
              step={0.05}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-600 w-12 text-right">
              {(engagementScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pädagogik
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={pedagogicalScore}
              onChange={(e) => setPedagogicalScore(Number(e.target.value))}
              min={0}
              max={1.0}
              step={0.05}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-600 w-12 text-right">
              {(pedagogicalScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
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
          {loading ? "Speichere..." : teacher ? "Speichern" : "Hinzufügen"}
        </button>
      </div>
    </form>
  );
}
