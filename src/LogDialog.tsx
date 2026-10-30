import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { t } from "./i18n";

interface LogInfo {
  path: string;
  crashed: boolean;
  text: string;
}

export default function LogDialog({ onClose, notify }: { onClose: () => void; notify: (text: string) => void }) {
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
      <div className="modal wide" role="dialog" aria-label={t("Registro de errores")}>
        <div className="modal-head">
          <h2>{t("Registro de errores")}</h2>
          <button className="btn" onClick={onClose} title={t("Cerrar (Esc)")}>✕</button>
        </div>
        <div className="modal-body">
          {info?.crashed && (
            <p className="err">
              ⚠ {t("La última vez el programa se cerró de forma inesperada. Las últimas líneas anteriores a la marca «sesión anterior terminó…» indican qué estaba haciendo.")}
            </p>
          )}
          {err && <p className="err">{err}</p>}
          {info && (
            <p className="muted small">
              {t("Archivo")}: <code>{info.path}</code> ({t("últimas 300 líneas")})
            </p>
          )}
          <pre className="logbox">{info ? info.text || t("El registro está vacío.") : t("Cargando…")}</pre>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={load}>↻ {t("Actualizar")}</button>
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard.writeText(info?.text ?? "").then(
                () => notify(t("Registro copiado")),
                () => notify(t("No se pudo copiar"))
              );
            }}
          >
            {t("Copiar")}
          </button>
          <button className="btn" onClick={() => invoke("open_log_dir").catch((e) => setErr(String(e)))}>
            {t("Abrir carpeta")}
          </button>
          <div className="spacer" />
          <button className="btn primary" onClick={onClose}>{t("Cerrar")}</button>
        </div>
      </div>
    </div>
  );
}
