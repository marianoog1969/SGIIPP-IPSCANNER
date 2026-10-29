import changelog from "../CHANGELOG.md?raw";

interface Entry {
  version: string;
  items: string[];
}

/** Últimas `n` versiones del CHANGELOG.md (única fuente de verdad). */
export function lastEntries(n: number): Entry[] {
  const out: Entry[] = [];
  let cur: Entry | null = null;
  for (const line of changelog.split(/\r?\n/)) {
    const h = line.match(/^## (\d+\.\d+\.\d+)\s*$/);
    if (h) {
      cur = { version: h[1], items: [] };
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
      <div className="modal" role="dialog" aria-label="Novedades">
        <div className="modal-head">
          <h2>Novedades · v{__APP_VERSION__}</h2>
          <button className="btn" onClick={onClose} title="Cerrar (Esc)">✕</button>
        </div>
        <div className="modal-body news">
          {entries.map((e, i) => (
            <section key={e.version}>
              <h3>
                Versión {e.version} {i === 0 && <span className="badge-new">Nueva</span>}
              </h3>
              <ul>
                {e.items.map((t, j) => (
                  <li key={j}>{inline(t)}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="modal-foot">
          <label className="chk">
            <input type="checkbox" checked={hideOnStart} onChange={(e) => onHideChange(e.target.checked)} />
            No mostrar al iniciar
          </label>
          <div className="spacer" />
          <button className="btn primary" onClick={onClose} autoFocus>Entendido</button>
        </div>
      </div>
    </div>
  );
}
