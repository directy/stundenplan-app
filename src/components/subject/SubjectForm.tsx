import { useState } from "react";
import type { Subject, NewSubject, RoomType } from "../../types";
import { ROOM_TYPE_LABELS, ROOM_TYPES } from "../../utils/roomTypeLabels";

interface SubjectFormProps {
  subject?: Subject;
  onSubmit: (data: NewSubject) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function SubjectForm({
  subject,
  onSubmit,
  onCancel,
  loading,
}: SubjectFormProps) {
  const [name, setName] = useState(subject?.name ?? "");
  const [shortName, setShortName] = useState(subject?.shortName ?? "");
  const [roomType, setRoomType] = useState<RoomType>(
    subject?.roomType ?? "standard",
  );
  const [weeklyHours, setWeeklyHours] = useState(
    subject?.weeklyHoursDefault ?? 2,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) return;
    await onSubmit({
      name: name.trim(),
      shortName: shortName.trim(),
      roomType,
      weeklyHoursDefault: weeklyHours,
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
          placeholder="z.B. Mathematik"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kürzel
        </label>
        <input
          type="text"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          required
          maxLength={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="z.B. Ma"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Raumtyp
        </label>
        <select
          value={roomType}
          onChange={(e) => setRoomType(e.target.value as RoomType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROOM_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {ROOM_TYPE_LABELS[rt]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Std./Woche (Standard)
        </label>
        <input
          type="number"
          value={weeklyHours}
          onChange={(e) => setWeeklyHours(Number(e.target.value))}
          min={1}
          max={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
          disabled={loading || !name.trim() || !shortName.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Speichere..." : subject ? "Speichern" : "Hinzufügen"}
        </button>
      </div>
    </form>
  );
}
