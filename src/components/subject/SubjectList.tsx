import { useEffect, useState } from "react";
import { useSubjectStore } from "../../store/subjectStore";
import type { Subject, NewSubject } from "../../types";
import { ROOM_TYPE_LABELS } from "../../utils/roomTypeLabels";
import { Modal } from "../shared/Modal";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { Spinner } from "../shared/Spinner";
import { SubjectForm } from "./SubjectForm";

export function SubjectList() {
  const { subjects, loading, error, fetchSubjects, createSubject, updateSubject, deleteSubject } =
    useSubjectStore();

  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreate = async (data: NewSubject) => {
    setFormLoading(true);
    try {
      await createSubject(data);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data: NewSubject) => {
    if (!editingSubject) return;
    setFormLoading(true);
    try {
      await updateSubject(editingSubject.id, data);
      setEditingSubject(null);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    await deleteSubject(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Spinner size="sm" /> Lade Faecher...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Faecher</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{subjects.length} Eintraege</span>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Hinzufuegen
          </button>
        </div>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{subject.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{subject.shortName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {ROOM_TYPE_LABELS[subject.roomType] ?? subject.roomType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{subject.weeklyHoursDefault}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => setEditingSubject(subject)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(subject.id)}
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

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Neues Fach"
      >
        <SubjectForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={formLoading}
        />
      </Modal>

      <Modal
        open={editingSubject !== null}
        onClose={() => setEditingSubject(null)}
        title="Fach bearbeiten"
      >
        {editingSubject && (
          <SubjectForm
            subject={editingSubject}
            onSubmit={handleUpdate}
            onCancel={() => setEditingSubject(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Fach loeschen"
        message="Soll dieses Fach wirklich geloescht werden? Dies kann nicht rueckgaengig gemacht werden."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
