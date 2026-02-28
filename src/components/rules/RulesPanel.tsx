import { useEffect } from "react";
import { useRulesStore } from "../../store/rulesStore";

export function RulesPanel() {
  const { rules, loading, error, fetchRules } = useRulesStore();

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  if (loading) return <div className="text-gray-500">Lade Regeln...</div>;
  if (error) return <div className="text-red-600">Fehler: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Constraint-Regeln</h2>
        <span className="text-sm text-gray-500">{rules.length} Regeln</span>
      </div>

      {rules.length === 0 ? (
        <p className="text-gray-500">Keine Regeln konfiguriert.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-lg shadow p-4 flex items-center justify-between ${
                !rule.isActive ? "opacity-50" : ""
              }`}
            >
              <div>
                <div className="font-medium text-gray-800">{rule.description}</div>
                <div className="text-xs text-gray-500 mt-1">{rule.ruleType}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Gewicht: <span className="font-medium">{rule.weight}</span>
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    rule.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {rule.isActive ? "Aktiv" : "Inaktiv"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
