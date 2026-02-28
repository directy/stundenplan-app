import { useMemo } from "react";
import type { ReportEntry } from "../../types/report";
import type { Subject } from "../../types";

interface SubjectCoverageProps {
  entries: ReportEntry[];
  subjects: Subject[];
}

function statusBadge(diff: number): { label: string; color: string } {
  if (diff === 0) return { label: "OK", color: "bg-green-100 text-green-700" };
  if (Math.abs(diff) === 1)
    return {
      label: diff > 0 ? "+1" : "-1",
      color: "bg-yellow-100 text-yellow-700",
    };
  return {
    label: diff > 0 ? `+${diff}` : `${diff}`,
    color: "bg-red-100 text-red-700",
  };
}

export function SubjectCoverage({
  entries,
  subjects,
}: SubjectCoverageProps) {
  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.name, s])),
    [subjects],
  );

  const coverage = useMemo(() => {
    // Zaehle Ist-Stunden pro Klasse+Fach
    const countMap = new Map<string, number>();
    for (const e of entries) {
      const key = `${e.className}|${e.subjectName}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    // Baue Ergebnis-Liste
    const result: {
      className: string;
      subjectName: string;
      actual: number;
      expected: number;
      diff: number;
    }[] = [];

    // Alle Klasse+Fach-Kombinationen aus den Entries
    const seen = new Set<string>();
    for (const e of entries) {
      const key = `${e.className}|${e.subjectName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const actual = countMap.get(key) ?? 0;
      const subject = subjectMap.get(e.subjectName);
      const expected = subject?.weeklyHoursDefault ?? 0;

      result.push({
        className: e.className,
        subjectName: e.subjectName,
        actual,
        expected,
        diff: actual - expected,
      });
    }

    result.sort((a, b) => {
      const cmp = a.className.localeCompare(b.className);
      if (cmp !== 0) return cmp;
      return a.subjectName.localeCompare(b.subjectName);
    });

    return result;
  }, [entries, subjectMap]);

  if (coverage.length === 0) return null;

  const problemCount = coverage.filter((c) => c.diff !== 0).length;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Fach-Abdeckung (Ist vs. Soll)
          {problemCount > 0 && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
              {problemCount} Abweichungen
            </span>
          )}
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 sticky top-0">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">
                Klasse
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-600">
                Fach
              </th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">
                Ist
              </th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">
                Soll
              </th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-600">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((row) => {
              const badge = statusBadge(row.diff);
              return (
                <tr
                  key={`${row.className}-${row.subjectName}`}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-1.5 text-sm text-gray-800">
                    {row.className}
                  </td>
                  <td className="px-4 py-1.5 text-sm text-gray-700">
                    {row.subjectName}
                  </td>
                  <td className="px-4 py-1.5 text-sm text-right text-gray-700">
                    {row.actual}
                  </td>
                  <td className="px-4 py-1.5 text-sm text-right text-gray-700">
                    {row.expected}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
