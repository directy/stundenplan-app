import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { KeypairSection } from "./KeypairSection";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0] + "T00:00:00Z";
}

export function CreateLicenseForm() {
  const [privateKeyPath, setPrivateKeyPath] = useState("");
  const [publicKeyB64, setPublicKeyB64] = useState("");

  const [licenseId, setLicenseId] = useState(generateUUID());
  const [productId, setProductId] = useState("stundenplan");
  const [licenseeName, setLicenseeName] = useState("");
  const [licenseeEmail, setLicenseeEmail] = useState("");
  const [licenseType, setLicenseType] = useState("standard");
  const [issuedAt, setIssuedAt] = useState(todayISO());
  const [expiresAt, setExpiresAt] = useState("");
  const [features, setFeatures] = useState("all");
  const [maxVersion, setMaxVersion] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const handleKeypairLoaded = useCallback(
    (path: string, pkB64: string) => {
      setPrivateKeyPath(path);
      setPublicKeyB64(pkB64);
      setError(null);
      setSuccess(null);
    },
    [],
  );

  const handleSign = useCallback(async () => {
    setError(null);
    setSuccess(null);

    if (!privateKeyPath) {
      setError("Bitte zuerst einen Private Key laden.");
      return;
    }
    if (!licenseeName.trim()) {
      setError("Name des Lizenznehmers ist ein Pflichtfeld.");
      return;
    }
    if (!licenseeEmail.trim()) {
      setError("E-Mail ist ein Pflichtfeld.");
      return;
    }

    const outputPath = await save({
      title: "Lizenzdatei speichern",
      defaultPath: `${licenseeName.replace(/\s+/g, "_")}.lic`,
      filters: [{ name: "Lizenzdatei", extensions: ["lic"] }],
    });
    if (!outputPath) return;

    setSigning(true);
    try {
      const result = await invoke<{
        licPath: string;
        licenseeName: string;
        licenseType: string;
      }>("cmd_sign_license", {
        keyPath: privateKeyPath,
        formData: {
          licenseId,
          productId,
          licenseeName: licenseeName.trim(),
          licenseeEmail: licenseeEmail.trim(),
          licenseType,
          issuedAt,
          expiresAt: expiresAt || null,
          features,
          maxVersion: maxVersion || null,
        },
        outputPath,
      });
      setSuccess(
        `Lizenz erstellt: ${result.licenseeName} (${result.licenseType}) → ${result.licPath}`,
      );
      // Reset for next license
      setLicenseId(generateUUID());
      setLicenseeName("");
      setLicenseeEmail("");
      setIssuedAt(todayISO());
    } catch (e) {
      setError(String(e));
    } finally {
      setSigning(false);
    }
  }, [
    privateKeyPath,
    licenseId,
    productId,
    licenseeName,
    licenseeEmail,
    licenseType,
    issuedAt,
    expiresAt,
    features,
    maxVersion,
  ]);

  return (
    <div>
      <KeypairSection
        privateKeyPath={privateKeyPath}
        publicKeyB64={publicKeyB64}
        onKeypairLoaded={handleKeypairLoaded}
        onError={setError}
      />

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Lizenz-Daten
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Lizenz-ID" value={licenseId} onChange={setLicenseId} mono />
          <Field label="Produkt-ID" value={productId} onChange={setProductId} />
          <Field
            label="Name des Lizenznehmers *"
            value={licenseeName}
            onChange={setLicenseeName}
            placeholder="z.B. Musterschule Berlin"
          />
          <Field
            label="E-Mail *"
            value={licenseeEmail}
            onChange={setLicenseeEmail}
            placeholder="verwaltung@musterschule.de"
            type="email"
          />

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Lizenztyp
            </label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="trial">Trial</option>
              <option value="standard">Standard</option>
              <option value="professional">Professional</option>
            </select>
          </div>

          <Field
            label="Ausgestellt am"
            value={issuedAt}
            onChange={setIssuedAt}
            placeholder="2026-02-28T00:00:00Z"
          />
          <Field
            label="Gueltig bis (leer = unbegrenzt)"
            value={expiresAt}
            onChange={setExpiresAt}
            placeholder="2027-02-28T23:59:59Z"
          />
          <Field
            label="Features (Komma-separiert)"
            value={features}
            onChange={setFeatures}
            placeholder="all"
          />
          <Field
            label="Max. Version (optional)"
            value={maxVersion}
            onChange={setMaxVersion}
            placeholder="z.B. 2.0.0"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <button
        onClick={handleSign}
        disabled={signing || !privateKeyPath}
        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {signing ? "Signiere..." : "Lizenz signieren & speichern"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${mono ? "font-mono text-xs" : ""}`}
      />
    </div>
  );
}
