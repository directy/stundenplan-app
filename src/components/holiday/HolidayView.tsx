import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useHolidayStore } from "../../store/holidayStore";
import type { HolidayImportData } from "../../types";
import sachsen2026 from "../../data/sachsen-2026.json";

export function HolidayView() {
  const { holidays, loading, error, fetchHolidays, importHolidays, deleteAllHolidays } =
    useHolidayStore();
  const [importError, setImportError] = useState<string | null>(null);
  const [quickImporting, setQuickImporting] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleImport = async () => {
    setImportError(null);
    try {
      const filePath = await open({
        title: "Ferien-JSON importieren",
        filters: [{ name: "JSON-Dateien", extensions: ["json"] }],
        multiple: false,
        directory: false,
      });
      if (!filePath) return;

      const text = await readTextFile(filePath);
      const data: HolidayImportData = JSON.parse(text);

      if (!data.schoolYear || !data.state || !Array.isArray(data.holidays)) {
        throw new Error(
          "Ungültiges JSON-Format: schoolYear, state und holidays erforderlich",
        );
      }

      for (const h of data.holidays) {
        if (!h.name || !h.startDate || !h.endDate) {
          throw new Error(
            `Unvollständiger Ferieneintrag: name, startDate und endDate erforderlich`,
          );
        }
      }

      await importHolidays(data);
    } catch (err) {
      setImportError(String(err));
    }
  };

  const handleDeleteAll = async () => {
    if (holidays.length === 0) return;
    await deleteAllHolidays();
  };

  const schoolYear = holidays.length > 0 ? holidays[0].schoolYear : null;
  const state = holidays.length > 0 ? holidays[0].state : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Ferienplan</h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setQuickImporting(true);
              setImportError(null);
              try {
                await importHolidays(sachsen2026 as HolidayImportData);
              } catch (err) {
                setImportError(String(err));
              } finally {
                setQuickImporting(false);
              }
            }}
            disabled={loading || quickImporting}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {quickImporting ? "Lade..." : "Sachsen 2025/2026"}
          </button>
          <button
            onClick={handleImport}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            JSON importieren
          </button>
          {holidays.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Alle löschen
            </button>
          )}
        </div>
      </div>

      {(error || importError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error || importError}</p>
        </div>
      )}

      {holidays.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-lg">Keine Feriendaten vorhanden.</p>
          <p className="text-sm mt-2">
            Importieren Sie eine JSON-Datei mit den Schulferien Ihres
            Bundeslandes.
          </p>
          <div className="mt-4 text-left max-w-md mx-auto bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 mb-2">
              Erwartetes JSON-Format:
            </p>
            <pre className="text-xs text-gray-500 overflow-auto">
              {JSON.stringify(
                {
                  schoolYear: "2025/2026",
                  state: "Sachsen",
                  holidays: [
                    {
                      name: "Herbstferien",
                      startDate: "2025-10-20",
                      endDate: "2025-10-31",
                    },
                  ],
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {schoolYear && state && (
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              <span className="text-sm font-medium text-blue-800">
                {state} – Schuljahr {schoolYear}
              </span>
            </div>
          )}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Ferien
                </th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Von
                </th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">
                  Bis
                </th>
                <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">
                  Tage
                </th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => {
                const start = new Date(holiday.startDate);
                const end = new Date(holiday.endDate);
                const days =
                  Math.ceil(
                    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
                  ) + 1;
                return (
                  <tr
                    key={holiday.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {holiday.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(holiday.startDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(holiday.endDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">
                      {days}
                    </td>
                  </tr>
                );
              })}
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
