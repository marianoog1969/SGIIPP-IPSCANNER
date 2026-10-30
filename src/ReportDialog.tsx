import { useMemo, useState } from "react";
import { COLS, Row, colLabel } from "./columns";
import { t } from "./i18n";
import { diskAlerts } from "./lib";
import { generateReport } from "./pdf";
import { saveBytes } from "./files";
import type { Settings } from "./SettingsDialog";

type Scope = "visible" | "all" | "alerts";
type Orient = "auto" | "portrait" | "landscape";

export default function ReportDialog({
  settings,
  visible,
  all,
  initialCols,
  onColsChange,
  onOpenSettings,
  onSaved,
  onClose,
}: {
  settings: Settings;
  visible: Row[];
  all: Row[];
  initialCols: string[];
  onColsChange: (keys: string[]) => void;
  onOpenSettings: () => void;
  onSaved: (path: string) => void;
  onClose: () => void;
}) {
  const [cols, setCols] = useState<string[]>(initialCols);
  const [scope, setScope] = useState<Scope>("visible");
  const [orient, setOrient] = useState<Orient>("auto");
  const [titulo, setTitulo] = useState(t("Informe de red"));
  const [obs, setObs] = useState("");
  const [discos, setDiscos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const alertRows = useMemo(() => all.filter((r) => r.info && diskAlerts(r.info).length > 0), [all]);
  const rows = scope === "visible" ? visible : scope === "all" ? all : alertRows;
  const selCols = COLS.filter((c) => cols.includes(c.key));
  const orientation = orient === "auto" ? (selCols.length > 5 ? "landscape" : "portrait") : orient;

  const toggle = (k: string) => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      onColsChange(cols);
      const bytes = generateReport({
        ...settings,
        titulo,
        observaciones: obs,
        alcance:
          scope === "visible" ? t("según el listado") : scope === "all" ? t("todos los equipos") : t("solo equipos con alerta"),
        cols: selCols,
        rows,
        orientation,
        incluirDiscos: discos,
      });
      const stamp = new Date().toISOString().slice(0, 10);
      const path = await saveBytes(`${t("informe_red")}_${stamp}.pdf`, t("Documento PDF"), "pdf", bytes);
      if (path) {
        onSaved(path);
        onClose();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const group = (g: "lista" | "ficha", title: string) => (
    <fieldset className="group">
      <legend>{title}</legend>
      <div className="checks">
        {COLS.filter((c) => c.group === g).map((c) => (
          <label key={c.key} className="chk2">
            <input type="checkbox" checked={cols.includes(c.key)} onChange={() => toggle(c.key)} />
            {colLabel(c)}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" role="dialog" aria-label={t("Informe PDF")}>
        <div className="modal-head">
          <h2>{t("Informe PDF")}</h2>
          <button className="btn" onClick={onClose} title={t("Cerrar")}>✕</button>
        </div>
        <div className="modal-body">
          <div className="center-line">
            <span>
              {t("Centro")}: <b>{settings.centro || "—"}</b>
              {settings.localidad && <> · {settings.localidad}</>}
            </span>
            <button className="link" onClick={onOpenSettings}>{t("Cambiar en Ajustes")}</button>
          </div>

          <label className="field">
            <span>{t("Título del informe")}</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>

          {group("lista", t("Columnas del listado"))}
          {group("ficha", t("Datos adicionales de la ficha"))}

          <div className="two">
            <fieldset className="group">
              <legend>{t("Equipos a incluir")}</legend>
              {(
                [
                  ["visible", t("Lo que muestra el listado ahora ({n})", { n: visible.length })],
                  ["all", t("Todos los equipos ({n})", { n: all.length })],
                  ["alerts", t("Solo equipos con alerta de disco ({n})", { n: alertRows.length })],
                ] as [Scope, string][]
              ).map(([v, label]) => (
                <label key={v} className="chk2">
                  <input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} />
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset className="group">
              <legend>{t("Página")}</legend>
              {(
                [
                  ["auto", t("Automática")],
                  ["portrait", t("Vertical")],
                  ["landscape", t("Horizontal")],
                ] as [Orient, string][]
              ).map(([v, label]) => (
                <label key={v} className="chk2">
                  <input type="radio" name="orient" checked={orient === v} onChange={() => setOrient(v)} />
                  {label}
                </label>
              ))}
              <label className="chk2 top">
                <input type="checkbox" checked={discos} onChange={(e) => setDiscos(e.target.checked)} />
                {t("Añadir apartado «Discos con alerta»")}
              </label>
            </fieldset>
          </div>

          <label className="field">
            <span>{t("Observaciones (opcional)")}</span>
            <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder={t("Texto que se añadirá como último apartado del informe")} />
          </label>

          {error && <p className="err">{error}</p>}
        </div>
        <div className="modal-foot">
          <span className="muted small">
            {t("{a} equipos · {b} columnas · {o}", { a: rows.length, b: selCols.length, o: orientation === "landscape" ? t("horizontal") : t("vertical") })}
          </span>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>{t("Cancelar")}</button>
          <button className="btn primary" disabled={busy || !selCols.length || !rows.length} onClick={generate}>
            {busy ? t("Generando…") : t("Generar PDF")}
          </button>
        </div>
      </div>
    </div>
  );
}
