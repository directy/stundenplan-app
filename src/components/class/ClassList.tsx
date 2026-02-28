import { useEffect, useState } from "react";
import { useClassStore } from "../../store/classStore";
import { useTeacherStore } from "../../store/teacherStore";
import type { SchoolClass, NewSchoolClass } from "../../types";
import { Modal } from "../shared/Modal";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { Spinner } from "../shared/Spinner";
import { ClassForm } from "./ClassForm";

export function ClassList() {
  const { classes, loading, error, fetchClasses, createClass, updateClass, deleteClass } =
    useClassStore();
  const { teachers, fetchTeachers } = useTeacherStore();

  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [fetchClasses, fetchTeachers]);

  const getTeacherName = (id: number | null) => {
    if (id === null) return "-";
    return teachers.find((t) => t.id === id)?.name ?? "-";
  };

  const handleCreate = async (data: NewSchoolClass) => {
    setFormLoading(true);
    try {
      await createClass(data);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data: NewSchoolClass) => {
    if (!editingClass) return;
    setFormLoading(true);
    try {
      await updateClass(editingClass.id, data);
      setEditingClass(null);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    await deleteClass(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Spinner size="sm" /> Lade Klassen...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Klassen</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{classes.length} Eintraege</span>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Hinzufuegen
          </button>
        </div>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klassenlehrer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schueleranzahl</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.gradeLevel}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{getTeacherName(c.classTeacherId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.studentCount}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => setEditingClass(c)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(c.id)}
                      className="text-red-600 hover:text-red-800"
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Neue Klasse">
        <ClassForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={formLoading}
          teachers={teachers}
        />
      </Modal>

      <Modal
        open={editingClass !== null}
        onClose={() => setEditingClass(null)}
        title="Klasse bearbeiten"
      >
        {editingClass && (
          <ClassForm
            schoolClass={editingClass}
            onSubmit={handleUpdate}
            onCancel={() => setEditingClass(null)}
            loading={formLoading}
            teachers={teachers}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Klasse loeschen"
        message="Soll diese Klasse wirklich geloescht werden?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
