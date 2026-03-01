import { useEffect } from "react";
import { useSettingsStore } from "../../store/settingsStore";

export function SetupView() {
  const { settings, loading, fetchSettings, setSetting, getBool } =
    useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggle = async (key: string) => {
    const current = getBool(key);
    await setSetting(key, current ? "false" : "true");
  };

  if (loading && settings.length === 0) {
    return <div className="text-gray-500">Lade Einstellungen...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Einstellungen
      </h2>

      <div className="bg-white rounded-lg shadow divide-y">
        <div className="p-4">
          <h3 className="font-medium text-gray-700 mb-3">
            Vertretungs-Scoring
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Diese Einstellungen steuern, welche Lehrkraft-Eigenschaften bei der
            Vertretungsplanung berücksichtigt werden.
          </p>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  Engagement-Score
                </span>
                <p className="text-xs text-gray-500">
                  Berücksichtigt den Engagement-Score der Lehrkraft bei der
                  Vertretungspriorisierung (Gewichtung: 20%)
                </p>
              </div>
              <button
                onClick={() => handleToggle("use_engagement_score")}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  getBool("use_engagement_score")
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    getBool("use_engagement_score")
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  Pädagogik-Score
                </span>
                <p className="text-xs text-gray-500">
                  Berücksichtigt den Pädagogik-Score der Lehrkraft bei der
                  Vertretungspriorisierung (Gewichtung: 15%)
                </p>
              </div>
              <button
                onClick={() => handleToggle("use_pedagogical_score")}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  getBool("use_pedagogical_score")
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    getBool("use_pedagogical_score")
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
