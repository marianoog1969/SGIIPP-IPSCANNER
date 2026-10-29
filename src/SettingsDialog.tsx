import { useState } from "react";

export interface Settings {
  centro: string;
  localidad: string;
  organismo: string;
  hilos: number;
  consultas: number;
  dameware: string;
  damewareAuth: string;
  damewareArgs: string;
}

export const DEFAULT_SETTINGS: Settings = {
  centro: "CIS Guillermo Miranda",
  localidad: "Murcia",
  organismo: "Secretaría General de Instituciones Penitenciarias",
  hilos: 100,
  consultas: 6,
  dameware: "",
  damewareAuth: "1",
  damewareArgs: "",
};

export default function SettingsDialog({
  value,
  onSave,
  onClose,
  onOpenLog,
}: {
  value: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
  onOpenLog?: () => void;
}) {
  const [s, setS] = useState(value);
  const set = (k: "centro" | "localidad" | "organismo" | "dameware" | "damewareArgs") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: e.target.value });
  const num = (k: "hilos" | "consultas", min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: Math.min(max, Math.max(min, Math.round(Number(e.target.value)) || min)) });

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Ajustes">
        <div className="modal-head">
          <h2>Ajustes</h2>
          <button className="btn" onClick={onClose} title="Cerrar">✕</button>
        </div>
        <div className="modal-body">
          <p className="muted small">
            Estos datos aparecen en la portada, la cabecera y el pie de los informes PDF. Se guardan en este
            equipo.
          </p>
          <label className="field">
            <span>Nombre del centro</span>
            <input value={s.centro} onChange={set("centro")} placeholder="Ej.: CIS Guillermo Miranda" autoFocus />
          </label>
          <label className="field">
            <span>Localidad</span>
            <input value={s.localidad} onChange={set("localidad")} placeholder="Ej.: Murcia" />
          </label>
          <label className="field">
            <span>Organismo (opcional)</span>
            <input value={s.organismo} onChange={set("organismo")} placeholder="Se muestra al pie de la portada" />
          </label>
          <p className="muted small" style={{ marginTop: 14 }}>
            Rendimiento. El escaneo es paralelo; más hilos = más rápido, pero más carga de red.
          </p>
          <label className="field">
            <span>Hilos de escaneo simultáneos (10–500)</span>
            <input type="number" min={10} max={500} value={s.hilos} onChange={num("hilos", 10, 500)} />
          </label>
          <label className="field">
            <span>Consultas de detalle simultáneas (1–20)</span>
            <input type="number" min={1} max={20} value={s.consultas} onChange={num("consultas", 1, 20)} />
          </label>
          <p className="muted small" style={{ marginTop: 14 }}>
            Control remoto. Escritorio remoto (RDP) usa el cliente de Windows. DameWare se detecta solo si está
            instalado; si no, indica aquí la ruta de <code>DWRCC.exe</code>.
          </p>
          <label className="field">
            <span>Ruta de DameWare (opcional)</span>
            <input
              value={s.dameware}
              onChange={set("dameware")}
              placeholder="C:\Program Files\SolarWinds\DameWare Mini Remote Control x64\DWRCC.exe"
            />
          </label>
          <label className="field">
            <span>Autenticación de DameWare</span>
            <select value={s.damewareAuth} onChange={(e) => setS({ ...s, damewareAuth: e.target.value })}>
              <option value="1">Windows NT Challenge/Response (recomendada)</option>
              <option value="2">Encrypted Windows Logon</option>
              <option value="3">Smart card</option>
              <option value="">Sin indicar (la que tenga DameWare)</option>
            </select>
          </label>
          <label className="field">
            <span>Parámetros adicionales de DameWare (opcional)</span>
            <input value={s.damewareArgs} onChange={set("damewareArgs")} placeholder="Ej.: -x:" />
          </label>
          <p className="muted small" style={{ marginTop: 14 }}>
            Registro de errores. Si el programa falla o se cierra, queda escrito en un archivo de registro.
          </p>
          <button className="btn" onClick={onOpenLog}>Ver registro de errores</button>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={() => setS(DEFAULT_SETTINGS)}>Restablecer</button>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn primary"
            disabled={!s.centro.trim()}
            onClick={() => {
              onSave({ ...s, dameware: s.dameware.trim(), damewareArgs: s.damewareArgs.trim(), centro: s.centro.trim(), localidad: s.localidad.trim(), organismo: s.organismo.trim() });
              onClose();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
