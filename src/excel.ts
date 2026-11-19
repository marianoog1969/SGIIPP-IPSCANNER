import type ExcelJS from "exceljs";
import { Col, Row, colLabel } from "./columns";
import { t } from "./i18n";
import { ALERT_PCT, WARN_PCT, diskPct } from "./lib";

const HEAD_FILL = "FF1E3A6B";
const RED = "FFF8C9C4";
const AMBER = "FFFCE8B2";

/** Libro de Excel con el inventario: hoja de equipos (todas las columnas) y hoja de discos. */
export async function buildXlsx(
  rows: Row[],
  cols: Col[],
  names: { sheet: string; disks: string }
): Promise<Uint8Array> {
  // se carga solo al exportar (la librería es pesada)
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "SGIIPP-IPSCANNER";
  wb.created = new Date();

  const style = (ws: ExcelJS.Worksheet, ncols: number) => {
    const head = ws.getRow(1);
    head.height = 20;
    for (let c = 1; c <= ncols; c++) {
      const cell = head.getCell(c);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } };
      cell.alignment = { vertical: "middle" };
    }
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ncols } };
    for (let c = 1; c <= ncols; c++) {
      let w = String(head.getCell(c).value ?? "").length;
      ws.eachRow((r, n) => {
        if (n > 1) w = Math.max(w, String(r.getCell(c).value ?? "").length);
      });
      ws.getColumn(c).width = Math.min(Math.max(w + 2, 8), 48);
    }
  };

  // — Equipos —
  const ws = wb.addWorksheet(names.sheet);
  ws.addRow(cols.map((c) => colLabel(c)));
  for (const r of rows) ws.addRow(cols.map((c) => c.get(r)).map((v) => (v === "-" ? "" : v)));
  style(ws, cols.length);
  cols.forEach((c, i) => {
    if (c.align === "right") ws.getColumn(i + 1).alignment = { horizontal: "right" };
  });

  // — Discos —
  const wd = wb.addWorksheet(names.disks);
  wd.addRow([t("Equipo"), "IP", t("Unidad"), t("Etiqueta"), t("Capacidad (GB)"), t("Libre (GB)"), t("Ocupación (%)")]);
  for (const r of rows) {
    for (const d of r.info?.disks ?? []) {
      const p = diskPct(d);
      const row = wd.addRow([
        r.h.name,
        r.h.ip,
        d.letter,
        d.label,
        Math.round((d.total / 1024 ** 3) * 10) / 10,
        Math.round((d.free / 1024 ** 3) * 10) / 10,
        p,
      ]);
      if (p >= WARN_PCT) {
        row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: p >= ALERT_PCT ? RED : AMBER } };
      }
    }
  }
  style(wd, 7);

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
