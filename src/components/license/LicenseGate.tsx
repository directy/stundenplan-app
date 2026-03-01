import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface LicenseStatus {
  valid: boolean;
  reason: string;
  licenseeName: string;
  licenseeEmail: string;
  licenseType: string;
  features: string[];
  expiresAt: string | null;
  maxVersion: string | null;
}

interface LicenseGateProps {
  children: React.ReactNode;
}

export function LicenseGate({ children }: LicenseGateProps) {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<LicenseStatus>("get_license_status")
      .then(setStatus)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setError(null);
    try {
      const selected = await open({
        title: "Lizenzdatei auswählen",
        filters: [{ name: "Lizenzdatei", extensions: ["lic"] }],
        multiple: false,
      });
      if (!selected) {
        setImporting(false);
        return;
      }
      const path =
        typeof selected === "string"
          ? selected
          : (selected as { path: string }).path;
      const newStatus = await invoke<LicenseStatus>("import_license_file", {
        path,
      });
      setStatus(newStatus);
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Lizenz wird geprüft...</div>
      </div>
    );
  }

  // Valid license → render app
  if (status?.valid) {
    return <>{children}</>;
  }

  // No valid license → lock screen
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-2">
          Stundenplan-System
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          Stunden- und Vertretungsplanung
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-left">
          <p className="text-sm text-amber-800">
            {status?.reason || "Keine gültige Lizenz gefunden"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? "Importiere..." : "Lizenzdatei importieren (.lic)"}
        </button>

        <p className="text-xs text-gray-400 mt-4">
          Kontakt:{" "}
          <span className="text-gray-500">mail@rene-budich.de</span>
        </p>
      </div>
    </div>
  );
}
