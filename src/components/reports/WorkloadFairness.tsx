import { useMemo } from "react";
import type { TeacherWorkloadItem } from "../../types/report";
import type { Teacher } from "../../types";

interface WorkloadFairnessProps {
  workloads: TeacherWorkloadItem[];
  teachers: Teacher[];
}

function barColor(pct: number): string {
  if (pct >= 60 && pct <= 100) return "bg-green-400";
  if (pct > 100 && pct <= 120) return "bg-yellow-400";
  return "bg-red-400";
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function WorkloadFairness({
  workloads,
  teachers,
}: WorkloadFairnessProps) {
  const teacherMap = useMemo(
    () => new Map(teachers.map((t) => [t.id, t])),
    [teachers],
  );

  const data = useMemo(() => {
    return workloads
      .map((wl) => {
        const teacher = teacherMap.get(wl.teacherId);
        const maxWeekly =
          (teacher?.maxHoursPerDay ?? 6) *
          5 *
          (teacher?.partTimeQuota ?? 1);
        const utilization =
          maxWeekly > 0 ? (wl.totalHours / maxWeekly) * 100 : 0;
        return {
          ...wl,
          partTimeQuota: teacher?.partTimeQuota ?? 1,
          maxWeekly,
          utilization,
        };
      })
      .sort((a, b) => b.utilization - a.utilization);
  }, [workloads, teacherMap]);

  const fairnessScore = useMemo(() => {
    const utils = data.map((d) => d.utilization);
    return stdDev(utils);
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Workload-Fairness
        </h3>
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            fairnessScore <= 10
              ? "bg-green-100 text-green-700"
              : fairnessScore <= 20
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
          }`}
          title="Standardabweichung der Auslastung (niedrig = fair)"
        >
          Streuung: {fairnessScore.toFixed(1)}%
        </span>
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.teacherId} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-32 truncate">
              {d.teacherName}
            </span>
            <span className="text-[10px] text-gray-400 w-12">
              {d.partTimeQuota < 1
                ? `${Math.round(d.partTimeQuota * 100)}% TZ`
                : "VZ"}
            </span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor(d.utilization)}`}
                style={{ width: `${Math.min(d.utilization, 150)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-16 text-right">
              {d.utilization.toFixed(0)}%
              <span className="text-gray-400 ml-0.5">
                ({d.totalHours}/{Math.round(d.maxWeekly)})
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
