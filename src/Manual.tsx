import { useMemo, useState } from "react";
import { t, getLang } from "./i18n";
import { SECTIONS_ES, type Block, type Section } from "./manual.es";
import { SECTIONS_EN } from "./manual.en";
import { lastEntries, fmtDate } from "./NewsDialog";

// Texto con **negrita** y `código`
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <kbd key={i}>{part.slice(1, -1)}</kbd>;
    return part;
  });
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const plain = (s: Section) =>
  norm(
    s.title +
      " " +
      s.blocks
        .map((b) =>
          b.t === "ul" || b.t === "ol"
            ? b.x.join(" ")
            : b.t === "table"
            ? b.head.join(" ") + " " + b.rows.flat().join(" ")
            : b.x
        )
        .join(" ")
  );

function renderBlock(b: Block, i: number) {
  switch (b.t) {
    case "p":
      return <p key={i}>{inline(b.x)}</p>;
    case "h":
      return <h3 key={i}>{b.x}</h3>;
    case "ul":
      return (
        <ul key={i}>
          {b.x.map((x, j) => (
            <li key={j}>{inline(x)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={i}>
          {b.x.map((x, j) => (
            <li key={j}>{inline(x)}</li>
          ))}
        </ol>
      );
    case "note":
      return (
        <div key={i} className="mnote">
          {inline(b.x)}
        </div>
      );
    case "warn":
      return (
        <div key={i} className="mnote warn">
          {inline(b.x)}
        </div>
      );
    case "table":
      return (
        <table key={i} className="mtable">
          <thead>
            <tr>
              {b.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r, j) => (
              <tr key={j}>
                {r.map((c, k) => (
                  <td key={k}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

export default function Manual({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const base = getLang() === "en" ? SECTIONS_EN : SECTIONS_ES;
  const SECTIONS: Section[] = useMemo(
    () => [
      ...base,
      {
        id: "novedades",
        title: t("Novedades"),
        blocks: lastEntries(8).flatMap((e): Block[] => [
          { t: "h", x: `${t("Versión")} ${e.version}${e.date ? ` · ${fmtDate(e.date)}` : ""}` },
          { t: "ul", x: e.items },
        ]),
      },
    ],
    [base]
  );
  const [active, setActive] = useState(SECTIONS[0].id);

  const shown = useMemo(() => {
    const nq = norm(q.trim());
    return nq ? SECTIONS.filter((s) => plain(s).includes(nq)) : SECTIONS;
  }, [q, SECTIONS]);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(`m-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="manual" role="dialog" aria-label={t("Manual de usuario")}>
      <aside className="m-nav">
        <div className="m-title">{t("Manual de usuario")}</div>
        <input
          className="m-search"
          placeholder={t("Buscar en el manual…")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <nav>
          {shown.map((s) => (
            <button key={s.id} className={active === s.id ? "on" : ""} onClick={() => go(s.id)}>
              {s.title}
            </button>
          ))}
          {!shown.length && <p className="muted small">{t("Sin resultados.")}</p>}
        </nav>
      </aside>
      <div className="m-body">
        <button className="btn m-close" onClick={onClose} title={t("Cerrar (Esc)")}>
          ✕ {t("Cerrar")}
        </button>
        <div className="m-content">
          {shown.map((s, i) => (
            <section key={s.id} id={`m-${s.id}`}>
              <div className="m-num">{String(SECTIONS.indexOf(s) + 1).padStart(2, "0")}</div>
              <h2>{s.title}</h2>
              {s.blocks.map(renderBlock)}
              {i < shown.length - 1 && <hr />}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
