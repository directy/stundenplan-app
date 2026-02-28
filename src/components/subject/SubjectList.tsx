import { useEffect } from "react";
import { useSubjectStore } from "../../store/subjectStore";

export function SubjectList() {
  const { subjects, loading, error, fetchSubjects } = useSubjectStore();

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  if (loading) return <div className="text-gray-500">Lade Faecher...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Faecher</h2>
        <span className="text-sm text-gray-500">{subjects.length} Eintraege</span>
      </div>

      {subjects.length === 0 ? (
        <p className="text-gray-500">Noch keine Faecher angelegt.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kuerzel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raumtyp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Std./Woche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{subject.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{subject.shortName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{subject.roomType}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{subject.weeklyHoursDefault}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
