import { useMemo, useState } from "react";
import { t, tn, locale } from "./i18n";
import { diffSnaps, loadSnaps, type SnapHost } from "./history";
import { saveBytes } from "./files";

const fmt = (at: number) => new Date(at).toLocaleString(locale());
const label = (h: SnapHost) => `${h.name || "—"} · ${h.ip}${h.mac ? ` · ${h.mac}` : ""}`;

export default function CompareDialog({ onClose, notify }: { onClose: () => void; notify: (s: string) => void }) {
  const snaps = useMemo(() => loadSnaps(), []);
  const [a, setA] = useState(Math.max(0, snaps.length - 2));
  const [b, setB] = useState(Math.max(0, snaps.length - 1));
  const diff = snaps.length >= 2 && a !== b ? diffSnaps(snaps[Math.min(a, b)], snaps[Math.max(a, b)]) : null;

  const exportCsv = async () => {
    if (!diff) return;
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [[t("Cambio"), t("Nombre"), "IP", "MAC", t("Antes"), t("Después")].join(";")];
    diff.added.forEach((h) => lines.push([t("Nuevo"), q(h.name), h.ip, h.mac, "", ""].join(";")));
    diff.removed.forEach((h) => lines.push([t("Ya no aparece"), q(h.name), h.ip, h.mac, "", ""].join(";")));
    diff.ipChanged.forEach((c) => lines.push([t("Cambio de IP"), q(c.to.name), c.to.ip, c.to.mac, c.from.ip, c.to.ip].join(";")));
    diff.nameChanged.forEach((c) => lines.push([t("Cambio de nombre"), q(c.to.name), c.to.ip, c.to.mac, q(c.from.name), q(c.to.name)].join(";")));
    const bytes = new TextEncoder().encode("﻿" + lines.join("\r\n"));
    const path = await saveBytes(`${t("comparacion_escaneos")}_${new Date().toISOString().slice(0, 10)}.csv`, t("CSV (Excel)"), "csv", bytes);
    if (path) notify(t("CSV guardado"));
  };

  const section = (title: string, items: string[]) =>
    items.length > 0 && (
      <fieldset className="group">
        <legend>{title} ({items.length})</legend>
        <ul className="cmp">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </fieldset>
    );

  const sel = (v: number, set: (n: number) => void) => (
    <select value={v} onChange={(e) => set(Number(e.target.value))}>
      {snaps.map((s, i) => (
        <option key={s.at} value={i}>
          {fmt(s.at)} · {tn(s.hosts.length, "{n} equipo", "{n} equipos")}
        </option>
      ))}
    </select>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" role="dialog" aria-label={t("Comparar escaneos")}>
        <div className="modal-head">
          <h2>{t("Comparar escaneos")}</h2>
          <button className="btn" onClick={onClose} title={t("Cerrar (Esc)")}>✕</button>
        </div>
        <div className="modal-body">
          {snaps.length < 2 ? (
            <p className="muted">{t("Hacen falta al menos dos escaneos completados. Se guardan los últimos 10.")}</p>
          ) : (
            <>
              <div className="two">
                <label className="field"><span>{t("Escaneo anterior")}</span>{sel(a, setA)}</label>
                <label className="field"><span>{t("Escaneo posterior")}</span>{sel(b, setB)}</label>
              </div>
              {a === b && <p className="muted">{t("Elige dos escaneos distintos.")}</p>}
              {diff && !diff.added.length && !diff.removed.length && !diff.ipChanged.length && !diff.nameChanged.length && (
                <p className="muted">{t("Sin diferencias entre los dos escaneos.")}</p>
              )}
              {diff && (
                <>
                  {section(t("Equipos nuevos"), diff.added.map(label))}
                  {section(t("Ya no aparecen"), diff.removed.map(label))}
                  {section(t("Cambios de IP"), diff.ipChanged.map((c) => `${c.to.name || c.to.mac}: ${c.from.ip} → ${c.to.ip}`))}
                  {section(t("Cambios de nombre"), diff.nameChanged.map((c) => `${c.to.ip}: ${c.from.name} → ${c.to.name}`))}
                </>
              )}
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" disabled={!diff} onClick={exportCsv}>{t("Exportar CSV")}</button>
          <div className="spacer" />
          <button className="btn primary" onClick={onClose}>{t("Cerrar")}</button>
        </div>
      </div>
    </div>
  );
}
