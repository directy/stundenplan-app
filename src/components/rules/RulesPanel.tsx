import { useEffect, useState, useCallback, useMemo } from "react";
import { useRulesStore } from "../../store/rulesStore";
import { useClassStore } from "../../store/classStore";
import { useTeacherStore } from "../../store/teacherStore";
import { useRoomStore } from "../../store/roomStore";
import type { ConstraintRule, NewConstraintRule } from "../../types";
import { CONSTRAINT_LABELS } from "../../utils/constraintLabels";
import { Modal } from "../shared/Modal";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { RuleForm } from "./RuleForm";

const SCOPE_BADGE_STYLES: Record<string, string> = {
  global: "bg-gray-100 text-gray-600",
  class: "bg-blue-100 text-blue-700",
  teacher: "bg-green-100 text-green-700",
  room: "bg-orange-100 text-orange-700",
};

function ScopeBadge({
  rule,
  entityName,
}: {
  rule: ConstraintRule;
  entityName: string | null;
}) {
  if (rule.scopeType === "global") {
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${SCOPE_BADGE_STYLES.global}`}>
        Global
      </span>
    );
  }

  const scopeLabel =
    rule.scopeType === "class"
      ? "Klasse"
      : rule.scopeType === "teacher"
        ? "Lehrkraft"
        : "Raum";

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${SCOPE_BADGE_STYLES[rule.scopeType] ?? SCOPE_BADGE_STYLES.global}`}>
      {scopeLabel}: {entityName ?? `#${rule.scopeId}`}
    </span>
  );
}

function PairDisplay({ rule }: { rule: ConstraintRule }) {
  if (rule.ruleType !== "forbidden_subject_sequence") return null;

  try {
    const params = JSON.parse(rule.parameters || "{}");
    // New single-pair format
    if (params.first && params.second) {
      return (
        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
          {params.second} &rarr; {params.first}
        </span>
      );
    }
    // Legacy multi-pair format
    if (Array.isArray(params.pairs) && params.pairs.length > 0) {
      return (
        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
          {params.pairs.length} {params.pairs.length === 1 ? "Paar" : "Paare"}
        </span>
      );
    }
  } catch {
    // ignore
  }
  return null;
}

function RuleItem({
  rule,
  entityName,
  onToggle,
  onWeightChange,
  onEdit,
  onDelete,
}: {
  rule: ConstraintRule;
  entityName: string | null;
  onToggle: (id: number, active: boolean) => void;
  onWeightChange: (id: number, weight: number) => void;
  onEdit: (rule: ConstraintRule) => void;
  onDelete: (id: number) => void;
}) {
  const typeLabel = CONSTRAINT_LABELS[rule.ruleType] ?? rule.ruleType;

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 ${
        !rule.isActive ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Weight indicator */}
        <span className="text-xs font-bold text-gray-400 w-8 text-center tabular-nums">
          {rule.weight.toFixed(2)}
        </span>

        {/* Toggle */}
        <button
          onClick={() => onToggle(rule.id, !rule.isActive)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
            rule.isActive ? "bg-green-500" : "bg-gray-300"
          }`}
          title={rule.isActive ? "Deaktivieren" : "Aktivieren"}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              rule.isActive ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-800 truncate flex items-center gap-2">
            {rule.description}
            <PairDisplay rule={rule} />
            <ScopeBadge rule={rule} entityName={entityName} />
          </div>
          <div className="text-xs text-gray-500">{typeLabel}</div>
        </div>

        {/* Weight Slider */}
        <div className="flex items-center gap-2 w-40">
          <input
            type="range"
            value={rule.weight}
            onChange={(e) => onWeightChange(rule.id, Number(e.target.value))}
            min={0}
            max={1.0}
            step={0.05}
            className="flex-1"
          />
          <span className="text-xs font-medium text-gray-600 w-8 text-right">
            {rule.weight.toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <button
          onClick={() => onEdit(rule)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Bearbeiten
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}

export function RulesPanel() {
  const { rules, loading, error, fetchRules, createRule, updateRule, deleteRule } =
    useRulesStore();
  const { classes, fetchClasses } = useClassStore();
  const { teachers, fetchTeachers } = useTeacherStore();
  const { rooms, fetchRooms } = useRoomStore();

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ConstraintRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [sortAscending, setSortAscending] = useState(() => {
    return localStorage.getItem("stundenplan_rules_sort_asc") === "true";
  });

  useEffect(() => {
    fetchRules();
    fetchClasses();
    fetchTeachers();
    fetchRooms();
  }, [fetchRules, fetchClasses, fetchTeachers, fetchRooms]);

  // Build entity name lookup
  const entityNameMap = useMemo(() => {
    const map: Record<string, Record<number, string>> = {
      class: {},
      teacher: {},
      room: {},
    };
    for (const c of classes) map.class[c.id] = c.name;
    for (const t of teachers) map.teacher[t.id] = t.name;
    for (const r of rooms) map.room[r.id] = r.name;
    return map;
  }, [classes, teachers, rooms]);

  const getEntityName = useCallback(
    (rule: ConstraintRule): string | null => {
      if (rule.scopeType === "global" || rule.scopeId == null) return null;
      return entityNameMap[rule.scopeType]?.[rule.scopeId] ?? null;
    },
    [entityNameMap],
  );

  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) =>
      sortAscending ? a.weight - b.weight : b.weight - a.weight,
    );
  }, [rules, sortAscending]);

  const toggleSort = useCallback(() => {
    setSortAscending((prev) => {
      const next = !prev;
      localStorage.setItem("stundenplan_rules_sort_asc", String(next));
      return next;
    });
  }, []);

  const handleToggle = useCallback(
    async (id: number, active: boolean) => {
      const rule = rules.find((r) => r.id === id);
      if (!rule) return;
      await updateRule(id, {
        ruleType: rule.ruleType,
        description: rule.description,
        weight: rule.weight,
        isActive: active,
        parameters: rule.parameters,
        scopeType: rule.scopeType,
        scopeId: rule.scopeId,
      });
    },
    [rules, updateRule],
  );

  const handleWeightChange = useCallback(
    async (id: number, weight: number) => {
      const rule = rules.find((r) => r.id === id);
      if (!rule) return;
      await updateRule(id, {
        ruleType: rule.ruleType,
        description: rule.description,
        weight,
        isActive: rule.isActive,
        parameters: rule.parameters,
        scopeType: rule.scopeType,
        scopeId: rule.scopeId,
      });
    },
    [rules, updateRule],
  );

  const handleCreate = async (data: NewConstraintRule) => {
    setFormLoading(true);
    try {
      await createRule(data);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data: NewConstraintRule) => {
    if (!editingRule) return;
    setFormLoading(true);
    try {
      await updateRule(editingRule.id, data);
      setEditingRule(null);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId === null) return;
    await deleteRule(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  if (loading) return <div className="text-gray-500">Lade Regeln...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Planungsregeln</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSort}
            className="px-2.5 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title={sortAscending ? "Aufsteigend nach Gewicht" : "Absteigend nach Gewicht"}
          >
            Gewicht {sortAscending ? "\u2191" : "\u2193"}
          </button>
          <span className="text-sm text-gray-500">{rules.length} Regeln</span>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Neue Regel
          </button>
        </div>
      </div>

      {sortedRules.length === 0 ? (
        <p className="text-gray-500">Keine Regeln konfiguriert.</p>
      ) : (
        <div className="space-y-2">
          {sortedRules.map((rule) => (
            <RuleItem
              key={rule.id}
              rule={rule}
              entityName={getEntityName(rule)}
              onToggle={handleToggle}
              onWeightChange={handleWeightChange}
              onEdit={setEditingRule}
              onDelete={setDeleteConfirmId}
            />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Neue Regel">
        <RuleForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={formLoading}
        />
      </Modal>

      <Modal
        open={editingRule !== null}
        onClose={() => setEditingRule(null)}
        title="Regel bearbeiten"
      >
        {editingRule && (
          <RuleForm
            rule={editingRule}
            onSubmit={handleUpdate}
            onCancel={() => setEditingRule(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Regel löschen"
        message="Soll diese Regel wirklich gelöscht werden?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
