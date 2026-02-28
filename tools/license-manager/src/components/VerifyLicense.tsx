import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface VerifyResult {
  valid: boolean;
  error: string | null;
  licenseId: string | null;
  licenseeName: string | null;
  licenseeEmail: string | null;
  licenseType: string | null;
  productId: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  features: string[] | null;
  maxVersion: string | null;
}

export function VerifyLicense() {
  const [pubkeyPath, setPubkeyPath] = useState("");
  const [licPath, setLicPath] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSelectPubkey = useCallback(async () => {
    const path = await open({
      title: "Public Key waehlen",
      filters: [{ name: "Key-Datei", extensions: ["key", "pub", "pem"] }],
    });
    if (path) {
      setPubkeyPath(path);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleSelectLic = useCallback(async () => {
    const path = await open({
      title: "Lizenzdatei waehlen",
      filters: [{ name: "Lizenzdatei", extensions: ["lic"] }],
    });
    if (path) {
      setLicPath(path);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    setError(null);
    setResult(null);

    if (!pubkeyPath) {
      setError("Bitte zuerst einen Public Key waehlen.");
      return;
    }
    if (!licPath) {
      setError("Bitte zuerst eine Lizenzdatei waehlen.");
      return;
    }

    setVerifying(true);
    try {
      const res = await invoke<VerifyResult>("cmd_verify_license", {
        pubkeyPath,
        licPath,
      });
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setVerifying(false);
    }
  }, [pubkeyPath, licPath]);

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Dateien waehlen
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Public Key
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={pubkeyPath}
                placeholder="Noch kein Public Key gewaehlt..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
              />
              <button
                onClick={handleSelectPubkey}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                Datei waehlen
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Lizenzdatei (.lic)
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={licPath}
                placeholder="Noch keine Lizenzdatei gewaehlt..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
              />
              <button
                onClick={handleSelectLic}
                className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                Datei waehlen
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleVerify}
        disabled={verifying || !pubkeyPath || !licPath}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
      >
        {verifying ? "Pruefe..." : "Lizenz pruefen"}
      </button>

      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.valid
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{result.valid ? "\u2705" : "\u274C"}</span>
            <h3
              className={`text-lg font-semibold ${
                result.valid ? "text-green-800" : "text-red-800"
              }`}
            >
              {result.valid ? "Lizenz ist gueltig" : "Lizenz ist ungueltig"}
            </h3>
          </div>

          {result.error && (
            <p className="text-sm text-red-700 mb-3">{result.error}</p>
          )}

          {result.valid && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Detail label="Lizenz-ID" value={result.licenseId} mono />
              <Detail label="Produkt-ID" value={result.productId} />
              <Detail label="Lizenznehmer" value={result.licenseeName} />
              <Detail label="E-Mail" value={result.licenseeEmail} />
              <Detail label="Lizenztyp" value={result.licenseType} />
              <Detail label="Ausgestellt am" value={result.issuedAt} />
              <Detail
                label="Gueltig bis"
                value={result.expiresAt || "Unbegrenzt"}
              />
              <Detail
                label="Features"
                value={result.features?.join(", ") || "-"}
              />
              <Detail
                label="Max. Version"
                value={result.maxVersion || "Keine Einschraenkung"}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <p
        className={`text-gray-800 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value || "-"}
      </p>
    </div>
  );
}
