import { CREDITS } from "./credits";

export default function AboutDialog({ onClose, onManual }: { onClose: () => void; onManual: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Acerca de" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <h2>Acerca de</h2>
          <button className="btn" onClick={onClose} title="Cerrar (Esc)">✕</button>
        </div>
        <div className="modal-body about">
          <h3>SGIIPP-IPSCANER</h3>
          <p className="muted">Versión {__APP_VERSION__}</p>
          <p>Escáner de red: equipos, direcciones IP y MAC, sistema operativo, RAM, discos y último usuario, con informes PDF.</p>
          <dl>
            <dt>Creado por</dt>
            <dd>{CREDITS.creadoPor}</dd>
          </dl>
          <p className="muted small">Hecho con:</p>
          <ul>
            {CREDITS.tecnologias.map(([n, d]) => (
              <li key={n}>
                <b>{n}</b> · {d}
              </li>
            ))}
          </ul>
          <p className="muted small">© {CREDITS.anio} {CREDITS.creadoPor}. Uso interno.</p>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onManual}>Manual</button>
          <div className="spacer" />
          <button className="btn primary" onClick={onClose} autoFocus>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
