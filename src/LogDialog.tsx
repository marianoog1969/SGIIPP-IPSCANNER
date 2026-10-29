import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface LogInfo {
  path: string;
  crashed: boolean;
  text: string;
}

export default function LogDialog({ onClose, notify }: { onClose: () => void; notify: (t: string) => void }) {
  const [info, setInfo] = useState<LogInfo | null>(null);
  const [err, setErr] = useState("");

  const load = () =>
    invoke<LogInfo>("log_info")
      .then(setInfo)
      .catch((e) => setErr(String(e)));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" role="dialog" aria-label="Registro de errores">
        <div className="modal-head">
          <h2>Registro de errores</h2>
          <button className="btn" onClick={onClose} title="Cerrar (Esc)">✕</button>
        </div>
        <div className="modal-body">
          {info?.crashed && (
            <p className="err">
              ⚠ La última vez el programa se cerró de forma inesperada. Las últimas líneas anteriores a la marca «sesión anterior terminó…» indican qué estaba haciendo.
            </p>
          )}
          {err && <p className="err">{err}</p>}
          {info && (
            <p className="muted small">
              Archivo: <code>{info.path}</code> (últimas 300 líneas)
            </p>
          )}
          <pre className="logbox">{info ? info.text || "El registro está vacío." : "Cargando…"}</pre>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={load}>↻ Actualizar</button>
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard.writeText(info?.text ?? "").then(
                () => notify("Registro copiado"),
                () => notify("No se pudo copiar")
              );
            }}
          >
            Copiar
          </button>
          <button className="btn" onClick={() => invoke("open_log_dir").catch((e) => setErr(String(e)))}>
            Abrir carpeta
          </button>
          <div className="spacer" />
          <button className="btn primary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
