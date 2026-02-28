import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface KeypairSectionProps {
  privateKeyPath: string;
  publicKeyB64: string;
  onKeypairLoaded: (privateKeyPath: string, publicKeyB64: string) => void;
  onError: (msg: string) => void;
}

export function KeypairSection({
  privateKeyPath,
  publicKeyB64,
  onKeypairLoaded,
  onError,
}: KeypairSectionProps) {
  const handleGenerate = useCallback(async () => {
    try {
      const dir = await open({
        title: "Zielverzeichnis fuer Schluessel waehlen",
        directory: true,
      });
      if (!dir) return;
      const result = await invoke<{
        privatePath: string;
        publicPath: string;
        publicKeyB64: string;
      }>("cmd_generate_keypair", { outputDir: dir });
      onKeypairLoaded(result.privatePath, result.publicKeyB64);
    } catch (e) {
      onError(String(e));
    }
  }, [onKeypairLoaded, onError]);

  const handleLoad = useCallback(async () => {
    try {
      const file = await open({
        title: "Private Key waehlen (private.key)",
        filters: [{ name: "Key-Datei", extensions: ["key"] }],
        multiple: false,
      });
      if (!file) return;
      const path = typeof file === "string" ? file : (file as { path: string }).path;
      const result = await invoke<{ publicKeyB64: string }>(
        "cmd_load_private_key",
        { path },
      );
      onKeypairLoaded(path, result.publicKeyB64);
    } catch (e) {
      onError(String(e));
    }
  }, [onKeypairLoaded, onError]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Schluessel
      </h3>

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleLoad}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Private Key laden
        </button>
        <button
          onClick={handleGenerate}
          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Neues Keypair generieren
        </button>
      </div>

      {privateKeyPath && (
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-500">Private Key:</span>{" "}
            <span className="font-mono text-xs text-gray-700 break-all">
              {privateKeyPath}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Public Key (Base64):</span>{" "}
            <code className="block mt-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-800 break-all select-all">
              {publicKeyB64}
            </code>
            <p className="text-xs text-gray-400 mt-1">
              Diesen Wert in der App unter PUBLIC_KEY_B64 einbetten.
            </p>
          </div>
        </div>
      )}

      {!privateKeyPath && (
        <p className="text-xs text-gray-400">
          Laden Sie einen vorhandenen Private Key oder generieren Sie ein neues Keypair.
        </p>
      )}
    </div>
  );
}
