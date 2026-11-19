import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { t, tn } from "./i18n";
import type { Host, Software } from "./lib";

interface Props {
  host: Host;
  cred: { user: string; pass: string } | null;
  onClose: () => void;
  notify: (text: string) => void;
}

/** Lista de programas instalados en un equipo (consulta remota por WMI; puede tardar). */
export default function SoftwareDialog({ host, cred, onClose, notify }: Props) {
  const [list, setList] = useState<Software[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    invoke<Software[]>("get_software", {
      ip: host.ip,
      name: host.name,
      user: cred?.user ?? null,
      password: cred?.pass ?? null,
    })
      .then((l) => alive && setList(l))
      .catch((e) => alive && setErr(String(e)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host.ip]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const shown = useMemo(() => {
    const f = q.trim().toLowerCase();
    return (list ?? []).filter((s) => !f || `${s.name} ${s.version} ${s.publisher}`.toLowerCase().includes(f));
  }, [list, q]);

  const copy = () =>
    navigator.clipboard
      .writeText(shown.map((s) => [s.name, s.version, s.publisher].join("\t")).join("\n"))
      .then(
        () => notify(t("Lista copiada")),
        () => notify(t("No se pudo copiar"))
      );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide" role="dialog" aria-label={t("Software instalado")}>
        <div className="modal-head">
          <h2>
            {t("Software instalado")} · {host.name || host.ip}
          </h2>
          <button className="btn" onClick={onClose} title={t("Cerrar (Esc)")}>✕</button>
        </div>
        <div className="modal-body">
          {!list && !err && <p className="muted">{t("Consultando programas instalados… puede tardar hasta un minuto.")}</p>}
          {err && <p className="err">{err}</p>}
          {list && (
            <>
              <input
                autoFocus
                placeholder={t("Filtrar por nombre, versión o editor…")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <p className="muted small">
                {tn(shown.length, "{n} programa", "{n} programas")}
                {q.trim() && ` (${t("de {total}", { total: list.length })})`}
              </p>
              <div className="swlist">
                {shown.map((s, i) => (
                  <div className="swrow" key={i}>
                    <span className="swname" title={s.publisher}>{s.name}</span>
                    <span className="swver">{s.version}</span>
                  </div>
                ))}
                {!shown.length && <p className="muted">{t("Sin resultados.")}</p>}
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" disabled={!shown.length} onClick={copy}>{t("Copiar")}</button>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>{t("Cerrar")}</button>
        </div>
      </div>
    </div>
  );
}
