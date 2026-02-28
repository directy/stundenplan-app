import { useEffect } from "react";
import { useClassStore } from "../../store/classStore";

export function ClassList() {
  const { classes, loading, error, fetchClasses } = useClassStore();

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  if (loading) return <div className="text-gray-500">Lade Klassen...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Klassen</h2>
        <span className="text-sm text-gray-500">{classes.length} Eintraege</span>
      </div>

      {classes.length === 0 ? (
        <p className="text-gray-500">Noch keine Klassen angelegt.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klassenstufe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schueleranzahl</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.gradeLevel}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
