import changelogEs from "../CHANGELOG.md?raw";
import changelogEn from "../CHANGELOG.en.md?raw";
import { t, getLang, locale } from "./i18n";

export const fmtDate = (d?: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" }) : "");

interface Entry {
  version: string;
  date?: string;
  items: string[];
}

/** Últimas `n` versiones del CHANGELOG.md (única fuente de verdad). */
export function lastEntries(n: number): Entry[] {
  const out: Entry[] = [];
  let cur: Entry | null = null;
  for (const line of (getLang() === "en" ? changelogEn : changelogEs).split(/\r?\n/)) {
    const h = line.match(/^## (\d+\.\d+\.\d+)(?:\s*·\s*(\d{4}-\d{2}-\d{2}))?\s*$/);
    if (h) {
      cur = { version: h[1], date: h[2], items: [] };
      out.push(cur);
    } else if (cur && line.startsWith("- ")) {
      cur.items.push(line.slice(2));
    }
  }
  return out.slice(0, n);
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
    p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith("`") ? <kbd key={i}>{p.slice(1, -1)}</kbd> : p
  );
}

export default function NewsDialog({
  hideOnStart,
  onHideChange,
  onClose,
}: {
  hideOnStart: boolean;
  onHideChange: (v: boolean) => void;
  onClose: () => void;
}) {
  const entries = lastEntries(4);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={t("Novedades")}>
        <div className="modal-head">
          <h2>{t("Novedades")} · v{__APP_VERSION__}</h2>
          <button className="btn" onClick={onClose} title={t("Cerrar (Esc)")}>✕</button>
        </div>
        <div className="modal-body news">
          {entries.map((e, i) => (
            <section key={e.version}>
              <h3>
                {t("Versión")} {e.version}{e.date && <span className="news-date"> · {fmtDate(e.date)}</span>} {i === 0 && <span className="badge-new">{t("Nueva")}</span>}
              </h3>
              <ul>
                {e.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="modal-foot">
          <label className="chk">
            <input type="checkbox" checked={hideOnStart} onChange={(e) => onHideChange(e.target.checked)} />
            {t("No mostrar al iniciar")}
          </label>
          <div className="spacer" />
          <button className="btn primary" onClick={onClose} autoFocus>{t("Entendido")}</button>
        </div>
      </div>
    </div>
  );
}
