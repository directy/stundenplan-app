import { useState } from "react";
import type { Room, NewRoom, RoomType } from "../../types";
import { ROOM_TYPE_LABELS, ROOM_TYPES } from "../../utils/roomTypeLabels";

interface RoomFormProps {
  room?: Room;
  onSubmit: (data: NewRoom) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function RoomForm({ room, onSubmit, onCancel, loading }: RoomFormProps) {
  const [name, setName] = useState(room?.name ?? "");
  const [roomType, setRoomType] = useState<RoomType>(
    room?.roomType ?? "standard",
  );
  const [capacity, setCapacity] = useState(room?.capacity ?? 30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      roomType,
      capacity,
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
          placeholder="z.B. R101"
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
          Kapazität
        </label>
        <input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          min={1}
          max={200}
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
          disabled={loading || !name.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Speichere..." : room ? "Speichern" : "Hinzufügen"}
        </button>
      </div>
    </form>
  );
}
