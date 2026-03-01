import { useState, useEffect, useMemo } from "react";
import type { ConstraintRule, NewConstraintRule } from "../../types";
import { useSubjectStore } from "../../store/subjectStore";
import { useClassStore } from "../../store/classStore";
import { useTeacherStore } from "../../store/teacherStore";
import { useRoomStore } from "../../store/roomStore";
import { CONSTRAINT_LABELS } from "../../utils/constraintLabels";

/** Rule types that can be created (no legacy types) */
const AVAILABLE_RULE_TYPES = [
  "forbidden_subject_sequence",
  "even_weekly_distribution",
  "avoid_edge_periods",
  "minimize_gaps",
  "class_teacher_first_period",
  "main_subjects_morning",
  "teacher_preferences",
  "teacher_wishes",
] as const;

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  class: "Klasse",
  teacher: "Lehrkraft",
  room: "Raum",
};

interface RuleFormProps {
  rule?: ConstraintRule;
  onSubmit: (data: NewConstraintRule) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function RuleForm({ rule, onSubmit, onCancel, loading }: RuleFormProps) {
  const [ruleType, setRuleType] = useState(
    rule?.ruleType === "no_sports_after_math"
      ? "forbidden_subject_sequence"
      : rule?.ruleType ?? ""
  );
  const [description, setDescription] = useState(rule?.description ?? "");
  const [weight, setWeight] = useState(rule?.weight ?? 0.5);
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [scopeType, setScopeType] = useState(rule?.scopeType ?? "global");
  const [scopeId, setScopeId] = useState<number | null>(rule?.scopeId ?? null);

  // Subject pair fields for forbidden_subject_sequence
  const [firstSubjectId, setFirstSubjectId] = useState("");
  const [secondSubjectId, setSecondSubjectId] = useState("");

  const { subjects, fetchSubjects } = useSubjectStore();
  const { classes, fetchClasses } = useClassStore();
  const { teachers, fetchTeachers } = useTeacherStore();
  const { rooms, fetchRooms } = useRoomStore();

  // Load subjects when rule type is forbidden_subject_sequence
  useEffect(() => {
    if (ruleType === "forbidden_subject_sequence" && subjects.length === 0) {
      fetchSubjects();
    }
  }, [ruleType, subjects.length, fetchSubjects]);

  // Load entities for scope picker
  useEffect(() => {
    if (scopeType === "class" && classes.length === 0) fetchClasses();
    if (scopeType === "teacher" && teachers.length === 0) fetchTeachers();
    if (scopeType === "room" && rooms.length === 0) fetchRooms();
  }, [scopeType, classes.length, teachers.length, rooms.length, fetchClasses, fetchTeachers, fetchRooms]);

  // Parse existing parameters for subject pair editing
  useEffect(() => {
    if (rule && ruleType === "forbidden_subject_sequence" && rule.parameters) {
      try {
        const params = JSON.parse(rule.parameters);
        if (params.first && params.second) {
          // Find subjects by shortName to set the select IDs
          const first = subjects.find((s) => s.shortName === params.first);
          const second = subjects.find((s) => s.shortName === params.second);
          if (first) setFirstSubjectId(String(first.id));
          if (second) setSecondSubjectId(String(second.id));
        }
      } catch {
        // ignore
      }
    }
  }, [rule, ruleType, subjects]);

  // Auto-generate description for forbidden_subject_sequence
  const autoDescription = useMemo(() => {
    if (ruleType !== "forbidden_subject_sequence") return null;
    const first = subjects.find((s) => String(s.id) === firstSubjectId);
    const second = subjects.find((s) => String(s.id) === secondSubjectId);
    if (first && second) {
      return `Kein ${first.shortName} nach ${second.shortName}`;
    }
    return null;
  }, [ruleType, firstSubjectId, secondSubjectId, subjects]);

  // Reset scope ID when scope type changes
  useEffect(() => {
    if (scopeType === "global") {
      setScopeId(null);
    }
  }, [scopeType]);

  // Auto-set description when rule type is changed (for non-pair types)
  const handleRuleTypeChange = (type: string) => {
    setRuleType(type);
    if (type !== "forbidden_subject_sequence" && !rule) {
      setDescription(CONSTRAINT_LABELS[type] ?? "");
    }
    if (type === "forbidden_subject_sequence" && !rule) {
      setDescription("");
    }
  };

  const isForbiddenPairType = ruleType === "forbidden_subject_sequence";

  const isFormValid = useMemo(() => {
    if (!ruleType) return false;
    if (isForbiddenPairType) {
      return !!firstSubjectId && !!secondSubjectId && firstSubjectId !== secondSubjectId;
    }
    return !!description.trim();
  }, [ruleType, isForbiddenPairType, firstSubjectId, secondSubjectId, description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    let parameters = rule?.parameters ?? "{}";
    let finalDescription = description.trim();

    if (isForbiddenPairType) {
      const first = subjects.find((s) => String(s.id) === firstSubjectId);
      const second = subjects.find((s) => String(s.id) === secondSubjectId);
      if (!first || !second) return;
      parameters = JSON.stringify({ first: first.shortName, second: second.shortName });
      finalDescription = autoDescription ?? `Kein ${first.shortName} nach ${second.shortName}`;
    }

    await onSubmit({
      ruleType,
      description: finalDescription,
      weight,
      isActive,
      parameters,
      scopeType,
      scopeId,
    });
  };

  const scopeEntities = useMemo(() => {
    switch (scopeType) {
      case "class":
        return classes.map((c) => ({ id: c.id, label: c.name }));
      case "teacher":
        return teachers.map((t) => ({ id: t.id, label: t.name }));
      case "room":
        return rooms.map((r) => ({ id: r.id, label: `${r.name} (${r.roomType})` }));
      default:
        return [];
    }
  }, [scopeType, classes, teachers, rooms]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rule Type Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Regeltyp
        </label>
        <select
          value={ruleType}
          onChange={(e) => handleRuleTypeChange(e.target.value)}
          required
          disabled={!!rule}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">-- Regeltyp wählen --</option>
          {AVAILABLE_RULE_TYPES.map((type) => (
            <option key={type} value={type}>
              {CONSTRAINT_LABELS[type] ?? type}
            </option>
          ))}
        </select>
      </div>

      {/* Subject Pair selectors for forbidden_subject_sequence */}
      {isForbiddenPairType && (
        <div className="bg-blue-50 rounded-lg p-3 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Verbotene Fächerfolge
          </label>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">Fach A (vorher)</label>
              <select
                value={secondSubjectId}
                onChange={(e) => setSecondSubjectId(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded-lg"
              >
                <option value="">-- Auswählen --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.shortName})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-gray-400 pb-2 text-lg">&rarr;</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">Fach B (nachher)</label>
              <select
                value={firstSubjectId}
                onChange={(e) => setFirstSubjectId(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded-lg"
              >
                <option value="">-- Auswählen --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.shortName})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {autoDescription && (
            <p className="text-xs text-blue-700 font-medium">{autoDescription}</p>
          )}
          <p className="text-xs text-gray-400">
            Fach B soll nicht direkt nach Fach A eingeplant werden.
          </p>
        </div>
      )}

      {/* Description (hidden for pair type, auto-generated) */}
      {!isForbiddenPairType && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beschreibung
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. Randstunden in Klasse 1 vermeiden"
          />
        </div>
      )}

      {/* Scope Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Geltungsbereich
        </label>
        <div className="flex gap-1 mb-2">
          {Object.entries(SCOPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScopeType(key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                scopeType === key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Entity picker for non-global scopes */}
        {scopeType !== "global" && (
          <select
            value={scopeId ?? ""}
            onChange={(e) => setScopeId(e.target.value ? Number(e.target.value) : null)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- {SCOPE_LABELS[scopeType]} wählen --</option>
            {scopeEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Weight Slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gewicht
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            min={0}
            max={1.0}
            step={0.05}
            className="flex-1"
          />
          <span className="text-sm font-medium text-gray-600 w-12 text-right">
            {weight.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Aktiv</label>
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Speichere..." : rule ? "Speichern" : "Hinzufügen"}
        </button>
      </div>
    </form>
  );
}
