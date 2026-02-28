import { useEffect } from "react";
import { useTeacherStore } from "../../store/teacherStore";

export function TeacherList() {
  const { teachers, loading, error, fetchTeachers } = useTeacherStore();

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  if (loading) {
    return <div className="text-gray-500">Lade Lehrkraefte...</div>;
  }

  if (error) {
    return <div className="text-red-600">Fehler: {error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Lehrkraefte</h2>
        <span className="text-sm text-gray-500">
          {teachers.length} Eintraege
        </span>
      </div>

      {teachers.length === 0 ? (
        <p className="text-gray-500">
          Noch keine Lehrkraefte angelegt.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-Mail</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teilzeit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max. Std./Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{teacher.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{teacher.email ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{Math.round(teacher.partTimeQuota * 100)}%</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{teacher.maxHoursPerDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
