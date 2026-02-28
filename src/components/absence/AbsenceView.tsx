import { useEffect, useState } from "react";
import { useAbsenceStore } from "../../store/absenceStore";
import { useTeacherStore } from "../../store/teacherStore";
import type { AbsenceType, NewTeacherAbsence } from "../../types";

const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  illness: "Krankheit",
  maternity: "Mutterschutz/Elternzeit",
  sabbatical: "Sabbat",
  training: "Fortbildung",
  other: "Sonstiges",
};

const ABSENCE_TYPES: AbsenceType[] = [
  "illness",
  "maternity",
  "sabbatical",
  "training",
  "other",
];

export function AbsenceView() {
  const { absences, loading, error, fetchAbsences, createAbsence, deleteAbsence } =
    useAbsenceStore();
  const { teachers, fetchTeachers } = useTeacherStore();

  const [showForm, setShowForm] = useState(false);
  const [filterTeacherId, setFilterTeacherId] = useState<number | null>(null);
  const [formData, setFormData] = useState<NewTeacherAbsence>({
    teacherId: 0,
    absenceType: "illness",
    startDate: "",
    endDate: "",
    note: "",
  });

  useEffect(() => {
    fetchAbsences();
    fetchTeachers();
  }, [fetchAbsences, fetchTeachers]);

  const handleCreate = async () => {
    if (!formData.teacherId || !formData.startDate || !formData.endDate) return;
    try {
      await createAbsence(formData);
      setFormData({
        teacherId: 0,
        absenceType: "illness",
        startDate: "",
        endDate: "",
        note: "",
      });
      setShowForm(false);
    } catch {
      // Fehler wird im Store gesetzt
    }
  };

  const handleDelete = async (id: number) => {
    await deleteAbsence(id);
  };

  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));

  const filteredAbsences =
    filterTeacherId === null
      ? absences
      : absences.filter((a) => a.teacherId === filterTeacherId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Abwesenheiten</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Neue Abwesenheit
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Abwesenheit erfassen
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Lehrkraft
              </label>
              <select
                value={formData.teacherId}
                onChange={(e) =>
                  setFormData({ ...formData, teacherId: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>-- Bitte waehlen --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Typ</label>
              <select
                value={formData.absenceType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    absenceType: e.target.value as AbsenceType,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ABSENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ABSENCE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Von</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bis</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">
                Notiz (optional)
              </label>
              <input
                type="text"
                value={formData.note ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value || null })
                }
                placeholder="z.B. Voraussichtliche Rueckkehr..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreate}
              disabled={
                !formData.teacherId || !formData.startDate || !formData.endDate
              }
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Speichern
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterTeacherId ?? ""}
          onChange={(e) =>
            setFilterTeacherId(
              e.target.value ? Number(e.target.value) : null,
            )
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Lehrkraefte</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Lade...</div>
      ) : filteredAbsences.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-lg">Keine Abwesenheiten erfasst.</p>
          <p className="text-sm mt-2">
            Erfassen Sie Langzeitabwesenheiten (Krankheit, Mutterschutz, Sabbat
            etc.), damit der Solver diese Lehrkraefte bei der Planung
            ausschliesst.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Lehrkraft
                </th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Typ
                </th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Von
                </th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Bis
                </th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Notiz
                </th>
                <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">
                  Aktion
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAbsences.map((absence) => (
                <tr
                  key={absence.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {teacherMap.get(absence.teacherId) ?? `ID ${absence.teacherId}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        absence.absenceType === "illness"
                          ? "bg-red-100 text-red-700"
                          : absence.absenceType === "maternity"
                            ? "bg-purple-100 text-purple-700"
                            : absence.absenceType === "sabbatical"
                              ? "bg-blue-100 text-blue-700"
                              : absence.absenceType === "training"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ABSENCE_TYPE_LABELS[absence.absenceType as AbsenceType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(absence.startDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(absence.endDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {absence.note || "–"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(absence.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Loeschen
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

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}
