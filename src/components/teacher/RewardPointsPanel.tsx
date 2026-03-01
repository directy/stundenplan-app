import { useEffect, useState } from "react";
import { useRewardStore } from "../../store/rewardStore";
import type { NewRewardPoint, RewardCategory } from "../../types";
import { rewardCategoryLabels } from "../../utils/wishLabels";

const CATEGORIES: RewardCategory[] = [
  "extra_tasks",
  "mentoring",
  "event_organization",
  "training",
  "committee_work",
  "exam_supervision",
  "project_lead",
  "other",
];

interface Props {
  teacherId: number;
}

export function RewardPointsPanel({ teacherId }: Props) {
  const { rewardPoints, loading, fetchRewardPoints, createRewardPoint, deleteRewardPoint } =
    useRewardStore();

  const [showForm, setShowForm] = useState(false);
  const [points, setPoints] = useState(1);
  const [category, setCategory] = useState<RewardCategory>("extra_tasks");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRewardPoints(teacherId);
  }, [teacherId, fetchRewardPoints]);

  const totalPoints = rewardPoints.reduce((sum, r) => sum + r.points, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const reward: NewRewardPoint = {
        teacherId,
        points,
        category,
        reason: reason || undefined,
        date,
      };
      await createRewardPoint(reward);
      setShowForm(false);
      setPoints(1);
      setCategory("extra_tasks");
      setReason("");
      setDate(new Date().toISOString().slice(0, 10));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Gesamt: <span className="font-semibold text-blue-700">{totalPoints} Punkte</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          {showForm ? "Abbrechen" : "Punkte vergeben"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Punkte</label>
              <input
                type="number"
                min={1}
                max={100}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RewardCategory)}
                className="w-full px-2 py-1 text-sm border rounded"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {rewardCategoryLabels[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Datum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grund (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z.B. Projektwoche organisiert"
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
      ) : rewardPoints.length === 0 ? (
        <p className="text-xs text-gray-400">Noch keine Belohnungspunkte vergeben.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left text-gray-500">Datum</th>
                <th className="px-2 py-1 text-left text-gray-500">Kategorie</th>
                <th className="px-2 py-1 text-right text-gray-500">Punkte</th>
                <th className="px-2 py-1 text-left text-gray-500">Grund</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rewardPoints.map((rp) => (
                <tr key={rp.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1 text-gray-600">{rp.date}</td>
                  <td className="px-2 py-1 text-gray-600">
                    {rewardCategoryLabels[rp.category as RewardCategory] ?? rp.category}
                  </td>
                  <td className="px-2 py-1 text-right font-medium text-green-700">+{rp.points}</td>
                  <td className="px-2 py-1 text-gray-500 truncate max-w-[150px]">{rp.reason || "-"}</td>
                  <td className="px-2 py-1 text-right">
                    <button
                      onClick={() => deleteRewardPoint(rp.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Löschen"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
