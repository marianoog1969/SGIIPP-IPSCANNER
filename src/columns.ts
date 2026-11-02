import { t } from "./i18n";
import { getNote } from "./notes";
import { Host, Info, kindLabel, deviceKind, userOf, diskText, fmtRam, fmtUptime, shortOs } from "./lib";

export interface Row {
  h: Host;
  info?: Info;
}

export interface Col {
  key: string;
  label: string;
  group: "lista" | "ficha";
  align?: "right";
  get: (r: Row) => string;
}

const dash = "-";

/** Columnas disponibles para los informes (las del listado + datos de la ficha). */
export const COLS: Col[] = [
  { key: "estado", label: "Estado", group: "lista", get: (r) => (r.h.alive ? t("Activo") : t("Solo ARP")) },
  { key: "tipo", label: "Tipo", group: "lista", get: (r) => kindLabel(deviceKind(r.h, r.info)) },
  { key: "nombre", label: "Nombre del equipo", group: "lista", get: (r) => r.h.name || dash },
  { key: "ip", label: "Dirección IP", group: "lista", get: (r) => r.h.ip },
  { key: "mac", label: "Dirección MAC", group: "lista", get: (r) => r.h.mac || dash },
  { key: "usuario", label: "Último usuario", group: "lista", get: (r) => userOf(r.info) || dash },
  { key: "os", label: "Sistema operativo", group: "lista", get: (r) => shortOs(r.info?.os) || dash },
  {
    key: "ram",
    label: "RAM",
    group: "lista",
    align: "right",
    get: (r) => (r.info?.ram_total ? fmtRam(r.info.ram_total) : dash),
  },
  { key: "disco", label: "Almacenamiento", group: "lista", get: (r) => diskText(r.info) || dash },
  {
    key: "ms",
    label: "Latencia",
    group: "lista",
    align: "right",
    get: (r) => (r.h.ms != null ? `${r.h.ms} ms` : dash),
  },
  {
    key: "modelo",
    label: "Modelo",
    group: "ficha",
    get: (r) => [r.info?.manufacturer, r.info?.model].filter(Boolean).join(" ") || dash,
  },
  { key: "ubic", label: "Ubicación", group: "ficha", get: (r) => getNote(r.h)?.ubic || dash },
  { key: "nota", label: "Nota", group: "ficha", get: (r) => getNote(r.h)?.nota || dash },
  { key: "serie", label: "Nº de serie", group: "ficha", get: (r) => r.info?.serial || dash },
  { key: "cpu", label: "Procesador", group: "ficha", get: (r) => r.info?.cpu || dash },
  { key: "dominio", label: "Dominio", group: "ficha", get: (r) => r.info?.domain || dash },
  {
    key: "uptime",
    label: "Encendido desde hace",
    group: "ficha",
    get: (r) => (r.info?.uptime_s != null ? fmtUptime(r.info.uptime_s) : dash),
  },
];

/** Etiqueta traducida de la columna. */
export const colLabel = (c: Col) => t(c.label);

export const DEFAULT_COLS = COLS.filter((c) => c.group === "lista").map((c) => c.key);
