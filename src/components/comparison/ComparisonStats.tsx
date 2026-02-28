import type { ComparisonStats as Stats } from "../../utils/scheduleComparison";

interface ComparisonStatsProps {
  stats: Stats;
}

export function ComparisonStats({ stats }: ComparisonStatsProps) {
  return (
    <div className="flex gap-3 flex-wrap">
      <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
        Gesamt: <strong>{stats.total}</strong>
      </span>
      <span className="px-3 py-1 text-sm rounded-full bg-gray-50 text-gray-600">
        Identisch: <strong>{stats.identical}</strong>
      </span>
      {stats.changed > 0 && (
        <span className="px-3 py-1 text-sm rounded-full bg-amber-100 text-amber-800">
          Geaendert: <strong>{stats.changed}</strong>
        </span>
      )}
      {stats.added > 0 && (
        <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">
          Hinzugefuegt: <strong>{stats.added}</strong>
        </span>
      )}
      {stats.removed > 0 && (
        <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800">
          Entfernt: <strong>{stats.removed}</strong>
        </span>
      )}
    </div>
  );
}
