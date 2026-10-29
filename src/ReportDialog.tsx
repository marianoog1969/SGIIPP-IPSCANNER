import { useMemo, useState } from "react";
import { COLS, Row } from "./columns";
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
  const [titulo, setTitulo] = useState("Informe de red");
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
          scope === "visible" ? "según el listado" : scope === "all" ? "todos los equipos" : "solo equipos con alerta",
        cols: selCols,
        rows,
        orientation,
        incluirDiscos: discos,
      });
      const stamp = new Date().toISOString().slice(0, 10);
      const path = await saveBytes(`informe_red_${stamp}.pdf`, "Documento PDF", "pdf", bytes);
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
            {c.label}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" role="dialog" aria-label="Informe PDF">
        <div className="modal-head">
          <h2>Informe PDF</h2>
          <button className="btn" onClick={onClose} title="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          <div className="center-line">
            <span>
              Centro: <b>{settings.centro || "—"}</b>
              {settings.localidad && <> · {settings.localidad}</>}
            </span>
            <button className="link" onClick={onOpenSettings}>Cambiar en Ajustes</button>
          </div>

          <label className="field">
            <span>Título del informe</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>

          {group("lista", "Columnas del listado")}
          {group("ficha", "Datos adicionales de la ficha")}

          <div className="two">
            <fieldset className="group">
              <legend>Equipos a incluir</legend>
              {(
                [
                  ["visible", `Lo que muestra el listado ahora (${visible.length})`],
                  ["all", `Todos los equipos (${all.length})`],
                  ["alerts", `Solo equipos con alerta de disco (${alertRows.length})`],
                ] as [Scope, string][]
              ).map(([v, label]) => (
                <label key={v} className="chk2">
                  <input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} />
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset className="group">
              <legend>Página</legend>
              {(
                [
                  ["auto", "Automática"],
                  ["portrait", "Vertical"],
                  ["landscape", "Horizontal"],
                ] as [Orient, string][]
              ).map(([v, label]) => (
                <label key={v} className="chk2">
                  <input type="radio" name="orient" checked={orient === v} onChange={() => setOrient(v)} />
                  {label}
                </label>
              ))}
              <label className="chk2 top">
                <input type="checkbox" checked={discos} onChange={(e) => setDiscos(e.target.checked)} />
                Añadir apartado «Discos con alerta»
              </label>
            </fieldset>
          </div>

          <label className="field">
            <span>Observaciones (opcional)</span>
            <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Texto que se añadirá como último apartado del informe" />
          </label>

          {error && <p className="err">{error}</p>}
        </div>
        <div className="modal-foot">
          <span className="muted small">
            {rows.length} equipos · {selCols.length} columnas · {orientation === "landscape" ? "horizontal" : "vertical"}
          </span>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy || !selCols.length || !rows.length} onClick={generate}>
            {busy ? "Generando…" : "Generar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
