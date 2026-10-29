import { jsPDF } from "jspdf";
import { __createTable, __drawTable, type UserOptions } from "jspdf-autotable";
import { Col, Row } from "./columns";
import { ALERT_PCT, WARN_PCT, diskAlerts, diskPct, fmtBytes, lightClass, worstDisk } from "./lib";

type RGB = [number, number, number];

// Paleta corporativa (informe CIS «Guillermo Miranda»)
const AZUL_FONDO: RGB = [27, 58, 107];
const AZUL_PRIM: RGB = [37, 99, 168];
const AZUL_CLARO: RGB = [74, 144, 217];
const NARANJA: RGB = [232, 96, 28];
const ROJO: RGB = [192, 57, 43];
const GRIS_TEXTO: RGB = [74, 74, 74];
const GRIS_CLARO: RGB = [155, 155, 155];
const GRIS_FONDO: RGB = [245, 247, 250];
const BORDE: RGB = [224, 230, 239];
const BLANCO: RGB = [255, 255, 255];
const VERDE: RGB = [46, 170, 92];
const AMBAR: RGB = [224, 163, 26];
const AZUL_KPI: RGB = [43, 76, 128];

const ML = 40;
const MR = 40;
const MT = 62;
const MB = 48;

export interface ReportOptions {
  centro: string;
  localidad: string;
  organismo: string;
  titulo: string;
  observaciones: string;
  alcance: string;
  cols: Col[];
  rows: Row[];
  orientation: "portrait" | "landscape";
  incluirDiscos: boolean;
  now?: Date;
}

const spaced = (s: string) =>
  s
    .toUpperCase()
    .split(" ")
    .map((w) => w.split("").join(" "))
    .join("   ");

const fill = (d: jsPDF, c: RGB) => d.setFillColor(c[0], c[1], c[2]);
const text = (d: jsPDF, c: RGB) => d.setTextColor(c[0], c[1], c[2]);
const stroke = (d: jsPDF, c: RGB) => d.setDrawColor(c[0], c[1], c[2]);

const lightColor = (p: number): RGB => {
  const k = lightClass(p);
  return k === "bad" ? ROJO : k === "warn" ? AMBAR : VERDE;
};

const fecha = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
const fechaCorta = (d: Date) => d.toLocaleDateString("es-ES");
const fechaHora = (d: Date) =>
  `${fechaCorta(d)} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;

interface Section {
  num: number;
  titulo: string;
  sub: string;
  page: number; // nº de página mostrado (la portada no cuenta)
}

export function generateReport(o: ReportOptions): Uint8Array {
  const now = o.now ?? new Date();
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: o.orientation });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const k = H / 842; // escala vertical de la portada (apaisado)
  const centro = o.centro.trim() || "Centro";
  const localidad = o.localidad.trim();
  const titulo = o.titulo.trim() || "Informe de red";

  // ───────── 1. Portada ─────────
  fill(doc, AZUL_FONDO);
  doc.rect(0, 0, W, H, "F");

  text(doc, BLANCO);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(spaced(titulo), 50, 280 * k);

  text(doc, NARANJA);
  doc.setFontSize(72);
  doc.text(String(now.getFullYear()), 50, 370 * k);
  stroke(doc, BLANCO);
  doc.setLineWidth(2);
  doc.line(230, 340 * k, W - 50, 340 * k);

  text(doc, GRIS_CLARO);
  doc.setFont("helvetica", "normal").setFontSize(13);
  doc.text("CENTRO", 50, 410 * k);

  text(doc, BLANCO);
  doc.setFont("helvetica", "bold").setFontSize(15);
  const nombreLines = doc.splitTextToSize(centro.toUpperCase(), W - 100) as string[];
  let y = 432 * k;
  nombreLines.forEach((l) => {
    doc.text(l, 50, y);
    y += 20;
  });
  if (localidad) {
    text(doc, NARANJA);
    doc.text(localidad.toUpperCase(), 50, y);
    y += 20;
  }
  text(doc, GRIS_CLARO);
  doc.setFont("helvetica", "italic").setFontSize(9);
  doc.text(`Datos a ${fecha(now)}`, 50, y + 8);

  if (o.organismo.trim()) {
    text(doc, GRIS_CLARO);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text(o.organismo.trim(), W / 2, H - 55, { align: "center" });
  }

  // ───────── 2. Síntesis + índice (se rellena al final) ─────────
  doc.addPage();

  // ───────── 3. Apartados ─────────
  const sections: Section[] = [];
  const pageShown = () => doc.getNumberOfPages() - 1; // la portada no se numera

  const sectionHeader = (num: number, t: string, sub: string) => {
    const x = ML + 12;
    const yy = MT + 14;
    text(doc, AZUL_CLARO);
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(spaced(`Apartado ${String(num).padStart(2, "0")}`), x, yy);
    text(doc, [26, 26, 26]);
    doc.setFont("helvetica", "bold").setFontSize(26);
    doc.text(t, x, yy + 32);
    fill(doc, NARANJA);
    doc.rect(ML, yy + 8, 4, 30, "F");
    text(doc, GRIS_CLARO);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text(sub, x, yy + 50);
    sections.push({ num, titulo: t, sub, page: pageShown() });
    return yy + 70;
  };

  const baseTable = (extra: UserOptions): UserOptions => ({
    margin: { top: MT, left: ML, right: MR, bottom: MB },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      textColor: GRIS_TEXTO,
      lineColor: BORDE,
      lineWidth: 0.4,
      overflow: "linebreak",
    },
    headStyles: { fillColor: AZUL_FONDO, textColor: BLANCO, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: GRIS_FONDO },
    ...extra,
  });

  let num = 1;

  // — Apartado: listado de equipos —
  doc.addPage();
  {
    const colsTxt = `${o.cols.length} ${o.cols.length === 1 ? "columna" : "columnas"}`;
    const startY = sectionHeader(
      num++,
      "Listado de equipos",
      `${o.rows.length} ${o.rows.length === 1 ? "equipo" : "equipos"} · ${colsTxt} · ${o.alcance}`
    );
    const keyAt = (i: number) => o.cols[i]?.key;
    const rowData = o.rows;
    const opts = baseTable({
      startY,
      head: [o.cols.map((c) => c.label.toUpperCase())],
      body: rowData.map((r) => o.cols.map((c) => c.get(r))),
      columnStyles: Object.fromEntries(
        o.cols.map((c, i) => [i, c.align === "right" ? { halign: "right" as const } : {}])
      ),
      didParseCell: (d) => {
        if (d.section !== "body") return;
        const key = keyAt(d.column.index);
        const r = rowData[d.row.index];
        if (key === "estado") {
          d.cell.styles.cellPadding = { top: 4, bottom: 4, left: 16, right: 5 };
        } else if (key === "disco") {
          const w = r.info ? worstDisk(r.info) : null;
          if (w) {
            d.cell.styles.cellPadding = { top: 4, bottom: 4, left: 16, right: 5 };
            if (w.p >= ALERT_PCT) {
              d.cell.styles.textColor = ROJO;
              d.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
      didDrawCell: (d) => {
        if (d.section !== "body") return;
        const key = keyAt(d.column.index);
        const r = rowData[d.row.index];
        let c: RGB | null = null;
        if (key === "estado") c = r.h.alive ? VERDE : AMBAR;
        else if (key === "disco") {
          const w = r.info ? worstDisk(r.info) : null;
          if (w) c = lightColor(w.p);
        }
        if (c) {
          fill(doc, c);
          doc.circle(d.cell.x + 9, d.cell.y + d.cell.height / 2, 3.2, "F");
        }
      },
    });
    const tbl = __createTable(doc, opts);
    __drawTable(doc, tbl);
    let fy = (tbl.finalY ?? startY) + 16;

    if (o.cols.some((c) => c.key === "disco")) {
      if (fy > H - MB - 24) {
        doc.addPage();
        fy = MT + 10;
      }
      const items: [RGB, string][] = [
        [VERDE, `menos del ${WARN_PCT} %`],
        [AMBAR, `${WARN_PCT} - ${ALERT_PCT - 1} %`],
        [ROJO, `${ALERT_PCT} % o más`],
      ];
      doc.setFont("helvetica", "normal").setFontSize(8);
      text(doc, GRIS_CLARO);
      doc.text("Semáforo de almacenamiento (ocupación del disco más lleno):", ML, fy);
      let lx = ML + 232;
      items.forEach(([c, label]) => {
        fill(doc, c);
        doc.circle(lx, fy - 2.5, 3.2, "F");
        text(doc, GRIS_TEXTO);
        doc.text(label, lx + 7, fy);
        lx += doc.getTextWidth(label) + 26;
      });
    }
  }

  // — Apartado: discos con alerta —
  const discos = o.rows.flatMap((r) =>
    r.info
      ? diskAlerts(r.info).map((x) => ({ r, d: x.d, p: x.p }))
      : []
  );
  discos.sort((a, b) => b.p - a.p);
  if (o.incluirDiscos && discos.length) {
    doc.addPage();
    const startY = sectionHeader(
      num++,
      "Discos con alerta",
      `${discos.length} ${discos.length === 1 ? "unidad" : "unidades"} con ${ALERT_PCT} % o más de ocupación`
    );
    const opts = baseTable({
      startY,
      head: [["EQUIPO", "IP", "UNIDAD", "ETIQUETA", "CAPACIDAD", "LIBRE", "OCUPACIÓN"]],
      body: discos.map(({ r, d, p }) => [
        r.h.name || "-",
        r.h.ip,
        d.letter,
        d.label || "-",
        fmtBytes(d.total),
        fmtBytes(d.free),
        `${p} %`,
      ]),
      columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "left" } },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 6) {
          d.cell.styles.cellPadding = { top: 4, bottom: 4, left: 16, right: 5 };
          d.cell.styles.textColor = ROJO;
          d.cell.styles.fontStyle = "bold";
        }
      },
      didDrawCell: (d) => {
        if (d.section === "body" && d.column.index === 6) {
          const p = diskPct(discos[d.row.index].d);
          fill(doc, lightColor(p));
          doc.circle(d.cell.x + 9, d.cell.y + d.cell.height / 2, 3.2, "F");
        }
      },
    });
    const tbl = __createTable(doc, opts);
    __drawTable(doc, tbl);
  }

  // — Apartado: observaciones —
  if (o.observaciones.trim()) {
    doc.addPage();
    const startY = sectionHeader(num++, "Observaciones", "Notas del responsable del informe");
    text(doc, GRIS_TEXTO);
    doc.setFont("helvetica", "normal").setFontSize(10);
    const lines = doc.splitTextToSize(o.observaciones.trim(), W - ML - MR - 12) as string[];
    let ty = startY + 4;
    lines.forEach((l) => {
      if (ty > H - MB) {
        doc.addPage();
        ty = MT + 10;
      }
      doc.text(l, ML + 12, ty);
      ty += 14;
    });
  }

  // ───────── Síntesis ejecutiva + índice (página 2) ─────────
  doc.setPage(2);
  {
    const bw = W - ML - MR;
    const top = MT + 6;
    const bh = 128;
    fill(doc, AZUL_FONDO);
    doc.roundedRect(ML, top, bw, bh, 6, 6, "F");
    text(doc, AZUL_CLARO);
    doc.setFont("helvetica", "bold").setFontSize(7);
    doc.text(spaced(`Síntesis ejecutiva · Datos a ${fechaCorta(now)}`), ML + 16, top + 22);

    const total = o.rows.length;
    const activos = o.rows.filter((r) => r.h.alive).length;
    const consultados = o.rows.filter((r) => r.info).length;
    const alertas = o.rows.filter((r) => r.info && diskAlerts(r.info).length > 0).length;
    const kpis: [string, string, string, RGB][] = [
      ["Equipos", String(total), "incluidos en este informe", BLANCO],
      ["Activos", String(activos), "responden a ping", BLANCO],
      ["Consultados", String(consultados), "con datos de sistema", BLANCO],
      ["Con alerta", String(alertas), `disco al ${ALERT_PCT} % o más`, alertas > 0 ? NARANJA : BLANCO],
    ];
    const gap = 10;
    const cw = (bw - 32 - gap * 3) / 4;
    kpis.forEach(([label, value, note, color], i) => {
      const cx = ML + 16 + i * (cw + gap);
      fill(doc, AZUL_KPI);
      doc.roundedRect(cx, top + 34, cw, 80, 4, 4, "F");
      text(doc, [160, 185, 220]);
      doc.setFont("helvetica", "normal").setFontSize(7);
      doc.text(label.toUpperCase(), cx + 10, top + 52);
      text(doc, color);
      doc.setFont("helvetica", "bold").setFontSize(28);
      doc.text(value, cx + 10, top + 85);
      text(doc, [160, 185, 220]);
      doc.setFont("helvetica", "normal").setFontSize(7.5);
      doc.text(note, cx + 10, top + 104);
    });

    // Índice
    let iy = top + bh + 40;
    text(doc, [26, 26, 26]);
    doc.setFont("helvetica", "bold").setFontSize(16);
    doc.text("Índice de contenidos", ML, iy);
    iy += 26;
    sections.forEach((s) => {
      fill(doc, AZUL_PRIM);
      doc.rect(ML, iy - 14, 3, 34, "F");
      text(doc, NARANJA);
      doc.setFont("helvetica", "bold").setFontSize(16);
      doc.text(String(s.num).padStart(2, "0"), ML + 14, iy + 8);
      text(doc, [26, 26, 26]);
      doc.setFontSize(11);
      doc.text(s.titulo, ML + 48, iy + 2);
      text(doc, GRIS_CLARO);
      doc.setFont("helvetica", "normal").setFontSize(8.5);
      doc.text(s.sub, ML + 48, iy + 16);
      text(doc, NARANJA);
      doc.setFont("helvetica", "bold").setFontSize(11);
      doc.text(String(s.page), W - MR, iy + 2, { align: "right" });
      iy += 46;
    });
  }

  // ───────── Cabecera y pie en todas las páginas menos la portada ─────────
  const n = doc.getNumberOfPages();
  for (let p = 2; p <= n; p++) {
    doc.setPage(p);
    const hy = 30;
    doc.setFont("helvetica", "normal").setFontSize(8);
    text(doc, GRIS_TEXTO);
    doc.text(localidad ? `${centro} — ${localidad}` : centro, ML, hy);
    doc.setFont("helvetica", "bold");
    text(doc, AZUL_PRIM);
    doc.text(titulo.toUpperCase(), W - MR, hy, { align: "right" });
    stroke(doc, AZUL_PRIM);
    doc.setLineWidth(0.8);
    doc.line(ML, hy + 6, W - MR, hy + 6);

    const fy = H - 30;
    stroke(doc, AZUL_CLARO);
    doc.setLineWidth(0.5);
    doc.line(ML, fy - 10, W - MR, fy - 10);
    doc.setFont("helvetica", "normal").setFontSize(8);
    text(doc, GRIS_CLARO);
    doc.text(`Generado con SGIIPP-IPSCANER v${__APP_VERSION__} · ${fechaHora(now)}`, ML, fy);
    doc.text(`Pág. ${p - 1}`, W - MR, fy, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
