import { Fragment, useEffect, useState } from "react";
import { useTeacherStore } from "../../store/teacherStore";
import { useRewardStore } from "../../store/rewardStore";
import type { Teacher, NewTeacher } from "../../types";
import { Modal } from "../shared/Modal";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { Spinner } from "../shared/Spinner";
import { TeacherForm } from "./TeacherForm";
import { TeacherSubjectManager } from "./TeacherSubjectManager";
import { TeacherPreferencesGrid } from "./TeacherPreferencesGrid";
import { RewardPointsPanel } from "./RewardPointsPanel";
import { TeacherWishesPanel } from "./TeacherWishesPanel";
import { TeacherClassPanel } from "./TeacherClassPanel";

type ExpandedSection = "subjects" | "preferences" | "rewards" | "wishes" | "classes";

export function TeacherList() {
  const { teachers, loading, error, fetchTeachers, createTeacher, updateTeacher, deleteTeacher } =
    useTeacherStore();
  const { rankings, fetchRankings } = useRewardStore();

  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>("subjects");

  useEffect(() => {
    fetchTeachers();
    fetchRankings();
  }, [fetchTeachers, fetchRankings]);

  const rankingMap = new Map(rankings.map((r) => [r.teacherId, r]));

  const handleCreate = async (data: NewTeacher) => {
    setFormLoading(true);
    try {
      await createTeacher(data);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data: NewTeacher) => {
    if (!editingTeacher) return;
    setFormLoading(true);
    try {
      await updateTeacher(editingTeacher.id, data);
      setEditingTeacher(null);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    await deleteTeacher(deleteConfirmId);
    setDeleteConfirmId(null);
    if (expandedId === deleteConfirmId) setExpandedId(null);
  };

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Spinner size="sm" /> Lade Lehrkräfte...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  const tabs: { key: ExpandedSection; label: string }[] = [
    { key: "subjects", label: "Fächer" },
    { key: "preferences", label: "Präferenzen" },
    { key: "rewards", label: "Belohnungspunkte" },
    { key: "wishes", label: "Sonderwünsche" },
    { key: "classes", label: "Klassen" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Lehrkräfte</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{teachers.length} Einträge</span>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      {teachers.length === 0 ? (
        <p className="text-gray-500">Noch keine Lehrkräfte angelegt.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-Mail</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teilzeit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max. Std./Tag</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engagement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pädagogik</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rang</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teachers.map((teacher) => {
                const ranking = rankingMap.get(teacher.id);
                return (
                  <Fragment key={teacher.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === teacher.id ? null : teacher.id)}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="mr-1 text-gray-400">{expandedId === teacher.id ? "\u25BE" : "\u25B8"}</span>
                        {teacher.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{teacher.email ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{Math.round(teacher.partTimeQuota * 100)}%</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{teacher.maxHoursPerDay}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{(teacher.engagementScore * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{(teacher.pedagogicalScore * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-sm text-center">
                        {ranking ? (
                          <span className={`inline-flex items-center gap-1 ${
                            ranking.rankingMultiplier > 1.0
                              ? "text-green-600"
                              : ranking.rankingMultiplier < 1.0
                              ? "text-orange-600"
                              : "text-gray-500"
                          }`}>
                            <span className="font-medium">#{ranking.rank}</span>
                            <span className="text-xs font-mono">({ranking.rankingMultiplier.toFixed(1)}x)</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingTeacher(teacher); }}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(teacher.id); }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                    {expandedId === teacher.id && (
                      <tr>
                        <td colSpan={8} className="px-4 py-3 bg-gray-50">
                          <div className="flex gap-1 mb-3">
                            {tabs.map((tab) => (
                              <button
                                key={tab.key}
                                onClick={(e) => { e.stopPropagation(); setExpandedSection(tab.key); }}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                  expandedSection === tab.key
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          {expandedSection === "subjects" && (
                            <TeacherSubjectManager teacherId={teacher.id} />
                          )}
                          {expandedSection === "preferences" && (
                            <TeacherPreferencesGrid teacherId={teacher.id} />
                          )}
                          {expandedSection === "rewards" && (
                            <RewardPointsPanel teacherId={teacher.id} />
                          )}
                          {expandedSection === "wishes" && (
                            <TeacherWishesPanel teacherId={teacher.id} />
                          )}
                          {expandedSection === "classes" && (
                            <TeacherClassPanel teacherId={teacher.id} />
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Neue Lehrkraft">
        <TeacherForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={formLoading}
        />
      </Modal>

      <Modal
        open={editingTeacher !== null}
        onClose={() => setEditingTeacher(null)}
        title="Lehrkraft bearbeiten"
      >
        {editingTeacher && (
          <TeacherForm
            teacher={editingTeacher}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTeacher(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Lehrkraft löschen"
        message="Soll diese Lehrkraft wirklich gelöscht werden? Zugeordnete Fächer werden ebenfalls entfernt."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
