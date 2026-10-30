import { t } from "./i18n";

export interface Host {
  ip: string;
  name: string;
  mac: string;
  ms: number | null;
  alive: boolean;
  kind?: string;
}
export interface Network {
  name: string;
  ip: string;
  cidr: string;
}
export interface Disk {
  letter: string;
  label: string;
  total: number;
  free: number;
}
export interface Info {
  os: string | null;
  version: string | null;
  build: string | null;
  arch: string | null;
  uptime_s: number | null;
  ram_total: number | null;
  ram_free: number | null;
  user: string | null;
  last_user?: string | null;
  domain: string | null;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  cpu: string | null;
  cores: number | null;
  threads: number | null;
  cpu_load: number | null;
  disks: Disk[];
}
export interface InfoState {
  loading: boolean;
  info?: Info;
  error?: string;
}

export const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
};

// Semáforo de almacenamiento (según el disco más lleno)
export const WARN_PCT = 75; // naranja desde aquí
export const ALERT_PCT = 90; // rojo + ⚠ desde aquí

export const diskPct = (d: Disk) => (d.total ? Math.round(((d.total - d.free) / d.total) * 100) : 0);
export const lightClass = (p: number) => (p >= ALERT_PCT ? "bad" : p >= WARN_PCT ? "warn" : "ok");
export const worstDisk = (i: Info) =>
  i.disks
    .filter((d) => d.total > 0)
    .map((d) => ({ d, p: diskPct(d) }))
    .sort((a, b) => b.p - a.p)[0] ?? null;
export const diskText = (i?: Info) => {
  const w = i ? worstDisk(i) : null;
  return w ? `${w.p}% (${w.d.letter})` : "";
};

export const diskAlerts = (i: Info) =>
  i.disks
    .filter((d) => d.total > 0)
    .map((d) => ({ d, p: Math.round(((d.total - d.free) / d.total) * 100) }))
    .filter((x) => x.p >= ALERT_PCT);

export const pctClass = (p: number) => (p >= 90 ? "bad" : p >= 75 ? "warn" : "");

export const ficha = (h: Host, i: Info) =>
  [
    `${t("Equipo")}: ${h.name || "—"}`,
    `IP: ${h.ip}`,
    `MAC: ${h.mac || "—"}`,
    i.os && `${t("Sistema")}: ${i.os}${i.arch ? ` (${i.arch})` : ""}`,
    i.version && `${t("Versión")}: ${i.version}${i.build ? ` (build ${i.build})` : ""}`,
    (i.manufacturer || i.model) && `${t("Modelo")}: ${[i.manufacturer, i.model].filter(Boolean).join(" ")}`,
    i.serial && `${t("Nº de serie")}: ${i.serial}`,
    i.cpu && `${t("Procesador")}: ${i.cpu}`,
    i.ram_total && `RAM: ${fmtBytes(i.ram_total)}`,
    userOf(i) && `${t("Último usuario")}: ${userOf(i)}`,
    i.domain && `${t("Dominio")}: ${i.domain}`,
    ...i.disks.map(
      (d) => `${t("Disco")} ${d.letter} ${d.label}: ${t("{free} libres de {total}", { free: fmtBytes(d.free), total: fmtBytes(d.total) })}`
    ),
  ]
    .filter(Boolean)
    .join("\n");
export type SortKey = "ip" | "name" | "mac" | "ms" | "os" | "ram" | "disk" | "user";

/** Último usuario que inició sesión, sin el dominio (CENTRALES\\jperez → jperez). */
export function userOf(i?: Info | null): string {
  const raw = (i?.last_user || i?.user || "").trim();
  if (!raw) return "";
  return raw.split("\\").pop()!.split("@")[0];
}

export const fmtRam = (b: number) => `${Math.round(b / 2 ** 30)} GB`;
export const shortOs = (s: string | null | undefined) => (s ? s.replace(/^Microsoft\s+/i, "") : "");

export const fmtBytes = (b: number) => {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i >= 3 ? 1 : 0)} ${u[i]}`;
};

export const ipNum = (ip: string) =>
  ip.split(".").reduce((a, o) => a * 256 + Number(o), 0);

export type DeviceKind = "pc" | "server" | "printer" | "router" | "tv" | "phone" | "camera" | "other";

/** Etiquetas en español (clave de traducción); usa kindLabel() para mostrarlas. */
export const KIND_LABEL: Record<DeviceKind, string> = {
  pc: "Ordenador",
  server: "Servidor",
  printer: "Impresora",
  router: "Router / red",
  tv: "TV / multimedia",
  phone: "Móvil / teléfono",
  camera: "Cámara IP",
  other: "Otro dispositivo",
};

const NAME_RULES: [DeviceKind, RegExp][] = [
  ["printer", /^(imp|print|mfp|npi|brn|brw|epson|kyocera|ricoh|canon|xerox|lexmark|konica|sharp|oki|samsung.*(m|c)\d)/i],
  ["router", /^(router|rtr|gw|gateway|fw|firewall|switch|wifi|wlan|ubnt|unifi|mikrotik|cisco|tplink|tp-link|fritz|dlink|zyxel|huawei-?(router|ont))|^(ap|sw)[-_]?\d/i],
  ["tv", /(^|[-_ ])(tv|smarttv|bravia|webos|roku|chromecast|firetv|appletv|androidtv|android-tv)([-_ 0-9]|$)|^\[?tv\]?/i],
  ["camera", /(^|[-_ ])(cam|camara|cámara|ipcam|hikvision|dahua|axis)([-_ 0-9]|$)/i],
  ["phone", /(iphone|ipad|android|galaxy|redmi|xiaomi|poco|oppo|oneplus|pixel|realme|motorola|(^|[^a-z])tel([^a-z]|$)|tel\d+$)/i],
];

/** MAC "privada" (bit de administración local activo): típica de móviles y tablets (Wi-Fi privado). */
export function randomMac(mac: string): boolean {
  const m = mac.match(/^([0-9a-f]{2})/i);
  return !!m && (parseInt(m[1], 16) & 0x02) !== 0;
}

/** Tipo de dispositivo: el sistema operativo manda; luego puertos/puerta de enlace; luego nombre; luego MAC. */
export function deviceKind(h: Host, info?: Info | null): DeviceKind {
  const os = (info?.os || "").toLowerCase();
  if (os) return os.includes("server") ? "server" : "pc";
  const k = h.kind as DeviceKind | undefined;
  if (k && k !== "other" && k in KIND_LABEL) return k;
  for (const [kind, re] of NAME_RULES) if (re.test(h.name || "")) return kind;
  if (h.mac && randomMac(h.mac)) return "phone";
  return "other";
}

export const kindLabel = (k: DeviceKind) => t(KIND_LABEL[k]);
