import { useEffect, useState } from "react";
import { useWishStore } from "../../store/wishStore";
import type { NewTeacherWish, WishType, WishPriority } from "../../types";
import {
  wishTypeLabels,
  wishPriorityLabels,
  wishPriorityColors,
  dayOfWeekLabels,
} from "../../utils/wishLabels";

const WISH_TYPES: WishType[] = [
  "prefer_morning",
  "prefer_afternoon",
  "free_day",
  "max_consecutive",
  "compact_schedule",
  "custom",
];

const PRIORITIES: WishPriority[] = ["low", "medium", "high"];

interface Props {
  teacherId: number;
}

export function TeacherWishesPanel({ teacherId }: Props) {
  const { wishes, loading, fetchWishes, createWish, updateWish, deleteWish } =
    useWishStore();

  const [showForm, setShowForm] = useState(false);
  const [wishType, setWishType] = useState<WishType>("prefer_morning");
  const [priority, setPriority] = useState<WishPriority>("medium");
  const [note, setNote] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [maxHours, setMaxHours] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWishes(teacherId);
  }, [teacherId, fetchWishes]);

  const buildParameters = (): string => {
    switch (wishType) {
      case "free_day":
        return JSON.stringify({ day_of_week: dayOfWeek });
      case "max_consecutive":
        return JSON.stringify({ max_hours: maxHours });
      default:
        return "{}";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const wish: NewTeacherWish = {
        teacherId,
        wishType,
        priority,
        parameters: buildParameters(),
        note: note || undefined,
      };
      await createWish(wish);
      setShowForm(false);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (wishId: number) => {
    const wish = wishes.find((w) => w.id === wishId);
    if (!wish) return;
    await updateWish(wishId, {
      teacherId: wish.teacherId,
      wishType: wish.wishType,
      priority: wish.priority,
      parameters: wish.parameters,
      note: wish.note ?? undefined,
      isActive: !wish.isActive,
    });
  };

  const formatParameters = (type: WishType, params: string): string => {
    try {
      const parsed = JSON.parse(params);
      if (type === "free_day" && parsed.day_of_week) {
        return dayOfWeekLabels[parsed.day_of_week as number] ?? `Tag ${parsed.day_of_week}`;
      }
      if (type === "max_consecutive" && parsed.max_hours) {
        return `Max. ${parsed.max_hours} Stunden`;
      }
    } catch {
      // ignore parse errors
    }
    return "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {wishes.filter((w) => w.isActive).length} aktive Wünsche
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-2.5 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          {showForm ? "Abbrechen" : "Wunsch hinzufügen"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Wunsch-Typ</label>
              <select
                value={wishType}
                onChange={(e) => setWishType(e.target.value as WishType)}
                className="w-full px-2 py-1 text-sm border rounded"
              >
                {WISH_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {wishTypeLabels[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Priorität</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WishPriority)}
                className="w-full px-2 py-1 text-sm border rounded"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {wishPriorityLabels[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {wishType === "free_day" && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Freier Tag</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border rounded"
              >
                {Object.entries(dayOfWeekLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {wishType === "max_consecutive" && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Max. aufeinanderfolgende Stunden
              </label>
              <input
                type="number"
                min={1}
                max={9}
                value={maxHours}
                onChange={(e) => setMaxHours(Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-600 mb-1">Notiz (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z.B. Kinderbetreuung nachmittags"
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Speichern..." : "Speichern"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Lade...</p>
      ) : wishes.length === 0 ? (
        <p className="text-xs text-gray-400">Noch keine Sonderwünsche hinterlegt.</p>
      ) : (
        <div className="space-y-1">
          {wishes.map((w) => (
            <div
              key={w.id}
              className={`flex items-center justify-between px-3 py-2 rounded border text-sm ${
                w.isActive ? "bg-white border-gray-200" : "bg-gray-100 border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActive(w.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    w.isActive
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300"
                  }`}
                  title={w.isActive ? "Deaktivieren" : "Aktivieren"}
                >
                  {w.isActive && <span className="text-xs">{"\u2713"}</span>}
                </button>
                <div>
                  <span className="font-medium">
                    {wishTypeLabels[w.wishType as WishType] ?? w.wishType}
                  </span>
                  {formatParameters(w.wishType as WishType, w.parameters) && (
                    <span className="ml-2 text-gray-500">
                      ({formatParameters(w.wishType as WishType, w.parameters)})
                    </span>
                  )}
                  {w.note && (
                    <span className="ml-2 text-gray-400 text-xs">{w.note}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${wishPriorityColors[w.priority as WishPriority]}`}>
                  {wishPriorityLabels[w.priority as WishPriority] ?? w.priority}
                </span>
                <button
                  onClick={() => deleteWish(w.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                  title="Löschen"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
