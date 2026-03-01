import { useEffect } from "react";
import { useRewardStore } from "../../store/rewardStore";
import { Spinner } from "../shared/Spinner";

export function TeacherRankingView() {
  const { rankings, loading, error, fetchRankings } = useRewardStore();

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Spinner size="sm" /> Lade Ranking...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  if (rankings.length === 0) {
    return <p className="text-sm text-gray-400">Keine Lehrkräfte vorhanden.</p>;
  }

  const maxPoints = Math.max(...rankings.map((r) => r.totalPoints), 1);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rang</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Punkte</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balken</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Multiplier</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rankings.map((r) => (
            <tr key={r.teacherId} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  r.rank === 1
                    ? "bg-yellow-100 text-yellow-700"
                    : r.rank === 2
                    ? "bg-gray-200 text-gray-700"
                    : r.rank === 3
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {r.rank}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-gray-900">{r.teacherName}</td>
              <td className="px-4 py-2 text-sm text-right font-medium text-gray-700">{r.totalPoints}</td>
              <td className="px-4 py-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${(r.totalPoints / maxPoints) * 100}%` }}
                  />
                </div>
              </td>
              <td className="px-4 py-2 text-sm text-right">
                <span className={`font-mono text-xs ${
                  r.rankingMultiplier > 1.0
                    ? "text-green-600"
                    : r.rankingMultiplier < 1.0
                    ? "text-red-600"
                    : "text-gray-500"
                }`}>
                  {r.rankingMultiplier.toFixed(2)}x
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
