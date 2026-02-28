import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRulesStore } from "../../store/rulesStore";
import type { ConstraintRule, NewConstraintRule } from "../../types";
import { Modal } from "../shared/Modal";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { RuleForm } from "./RuleForm";

function SortableRuleItem({
  rule,
  onToggle,
  onWeightChange,
  onEdit,
  onDelete,
}: {
  rule: ConstraintRule;
  onToggle: (id: number, active: boolean) => void;
  onWeightChange: (id: number, weight: number) => void;
  onEdit: (rule: ConstraintRule) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow p-4 ${
        !rule.isActive ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
          title="Ziehen zum Sortieren"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

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
          <div className="font-medium text-sm text-gray-800 truncate">
            {rule.description}
          </div>
          <div className="text-xs text-gray-500">{rule.ruleType}</div>
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
          Loeschen
        </button>
      </div>
    </div>
  );
}

export function RulesPanel() {
  const { rules, loading, error, fetchRules, createRule, updateRule, deleteRule, updateOrder } =
    useRulesStore();

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ConstraintRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(rules, oldIndex, newIndex);
      const updates = reordered.map((r, i) => ({ id: r.id, sortOrder: i }));
      await updateOrder(updates);
    },
    [rules, updateOrder],
  );

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
        <h2 className="text-lg font-semibold text-gray-800">Constraint-Regeln</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{rules.length} Regeln</span>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Neue Regel
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-gray-500">Keine Regeln konfiguriert.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rules.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {rules.map((rule) => (
                <SortableRuleItem
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggle}
                  onWeightChange={handleWeightChange}
                  onEdit={setEditingRule}
                  onDelete={setDeleteConfirmId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
        title="Regel loeschen"
        message="Soll diese Regel wirklich geloescht werden?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
