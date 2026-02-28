import { useState } from "react";
import type { ConstraintRule, NewConstraintRule } from "../../types";

interface RuleFormProps {
  rule?: ConstraintRule;
  onSubmit: (data: NewConstraintRule) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function RuleForm({ rule, onSubmit, onCancel, loading }: RuleFormProps) {
  const [ruleType, setRuleType] = useState(rule?.ruleType ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [weight, setWeight] = useState(rule?.weight ?? 0.5);
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleType.trim() || !description.trim()) return;
    await onSubmit({
      ruleType: ruleType.trim(),
      description: description.trim(),
      weight,
      isActive,
      parameters: rule?.parameters ?? "{}",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Regel-Typ (Bezeichner)
        </label>
        <input
          type="text"
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value)}
          required
          disabled={!!rule}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="z.B. no_sports_after_math"
        />
      </div>
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
          placeholder="z.B. Kein Sport nach Mathe"
        />
      </div>
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
          disabled={loading || !ruleType.trim() || !description.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Speichere..." : rule ? "Speichern" : "Hinzufuegen"}
        </button>
      </div>
    </form>
  );
}
