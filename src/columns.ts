import { t } from "./i18n";
import { getNote } from "./notes";
import { vendorOf } from "./oui";
import { Host, Info, bitlockerText, portsText, osVersion, kindLabel, deviceKind, userOf, diskText, fmtRam, fmtUptime, shortOs } from "./lib";

export interface Row {
  h: Host;
  info?: Info;
  ports?: number[];
}

export interface Col {
  key: string;
  label: string;
  /** Cabecera abreviada para el informe PDF (si no hay, se usa la etiqueta). */
  short?: string;
  group: "lista" | "ficha";
  align?: "right";
  get: (r: Row) => string;
}

const dash = "-";

/** Columnas disponibles para los informes (las del listado + datos de la ficha). */
export const COLS: Col[] = [
  { key: "estado", label: "Estado", group: "lista", get: (r) => (r.h.alive ? t("Activo") : t("Solo ARP")) },
  { key: "tipo", label: "Tipo", group: "lista", get: (r) => kindLabel(deviceKind(r.h, r.info)) },
  { key: "nombre", short: "Equipo", label: "Nombre del equipo", group: "lista", get: (r) => r.h.name || dash },
  { key: "ip", short: "IP", label: "Dirección IP", group: "lista", get: (r) => r.h.ip },
  { key: "mac", short: "MAC", label: "Dirección MAC", group: "lista", get: (r) => r.h.mac || dash },
  { key: "fabmac", short: "Fabr.", label: "Fabricante (MAC)", group: "ficha", get: (r) => (r.h.mac && vendorOf(r.h.mac)) || dash },
  { key: "usuario", short: "Usuario", label: "Último usuario", group: "lista", get: (r) => userOf(r.info) || dash },
  { key: "os", short: "SO", label: "Sistema operativo", group: "lista", get: (r) => shortOs(r.info?.os) || dash },
  { key: "sover", short: "Ver. SO", label: "Versión del SO", group: "lista", get: (r) => osVersion(r.info) || dash },
  {
    key: "ram",
    label: "RAM",
    group: "lista",
    align: "right",
    get: (r) => (r.info?.ram_total ? fmtRam(r.info.ram_total) : dash),
  },
  { key: "disco", short: "Disco", label: "Almacenamiento", group: "lista", get: (r) => diskText(r.info) || dash },
  {
    key: "ms",
    short: "Lat.",
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
  { key: "ubic", short: "Ubic.", label: "Ubicación", group: "ficha", get: (r) => getNote(r.h)?.ubic || dash },
  { key: "nota", label: "Nota", group: "ficha", get: (r) => getNote(r.h)?.nota || dash },
  { key: "serie", short: "Nº serie", label: "Nº de serie", group: "ficha", get: (r) => r.info?.serial || dash },
  { key: "cpu", short: "CPU", label: "Procesador", group: "ficha", get: (r) => r.info?.cpu || dash },
  { key: "dominio", label: "Dominio", group: "ficha", get: (r) => r.info?.domain || dash },
  { key: "av", short: "AV", label: "Antivirus", group: "ficha", get: (r) => r.info?.av || dash },
  { key: "bitlocker", short: "BitLocker", label: "BitLocker", group: "ficha", get: (r) => bitlockerText(r.info?.bitlocker) || dash },
  {
    key: "parche",
    short: "Parche",
    label: "Último parche",
    group: "ficha",
    get: (r) =>
      r.info?.last_patch
        ? `${r.info.last_patch}${r.info.patches ? ` (${r.info.patches})` : ""}`
        : dash,
  },
  { key: "puertos", short: "Puertos", label: "Puertos abiertos", group: "ficha", get: (r) => portsText(r.ports) || dash },
  {
    key: "uptime",
    short: "Encendido",
    label: "Encendido desde hace",
    group: "ficha",
    get: (r) => (r.info?.uptime_s != null ? fmtUptime(r.info.uptime_s) : dash),
  },
];

/** Etiqueta traducida de la columna. */
export const colLabel = (c: Col) => t(c.label);
/** Etiqueta abreviada (informe PDF). */
export const colShort = (c: Col) => t(c.short ?? c.label);

export const DEFAULT_COLS = COLS.filter((c) => c.group === "lista").map((c) => c.key);
