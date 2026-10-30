import { CREDITS } from "./credits";
import { t } from "./i18n";
import DonateButton from "./DonateButton";

export default function AboutDialog({ onClose, onManual }: { onClose: () => void; onManual: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={t("Acerca de")} style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <h2>{t("Acerca de")}</h2>
          <button className="btn" onClick={onClose} title={t("Cerrar (Esc)")}>✕</button>
        </div>
        <div className="modal-body about">
          <h3>SGIIPP-IPSCANER</h3>
          <p className="muted">{t("Versión")} {__APP_VERSION__}</p>
          <p>{t("Escáner de red: equipos, direcciones IP y MAC, sistema operativo, RAM, discos y último usuario, con informes PDF.")}</p>
          <dl>
            <dt>{t("Creado por")}</dt>
            <dd>{t(CREDITS.creadoPor)}</dd>
          </dl>
          <p className="muted small">{t("Hecho con:")}</p>
          <ul>
            {CREDITS.tecnologias.map(([n, d]) => (
              <li key={n}>
                <b>{n}</b> · {t(d)}
              </li>
            ))}
          </ul>
          <p className="muted small">© {CREDITS.anio} {t(CREDITS.creadoPor)}. {t("Uso interno.")}</p>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onManual}>{t("Manual")}</button>
          <div className="spacer" />
          <DonateButton />
          <button className="btn primary" onClick={onClose} autoFocus>{t("Cerrar")}</button>
        </div>
      </div>
    </div>
  );
}
