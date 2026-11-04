import type { Host } from "./lib";
import { noteKey } from "./notes";

const SNAPS = "ipscanner.snaps.v1";
const HIST = "ipscanner.hist.v1";
const MAX_SNAPS = 10;

export interface SnapHost {
  ip: string;
  name: string;
  mac: string;
}
export interface Snap {
  at: number;
  range: string;
  hosts: SnapHost[];
}
export interface Hist {
  first: number;
  last: number;
  names: string[];
  ips: string[];
}

const read = <T,>(k: string, d: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? "null");
    return v ?? d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sin almacenamiento */
  }
};

export const loadSnaps = (): Snap[] => {
  const v = read<Snap[]>(SNAPS, []);
  return Array.isArray(v) ? v : [];
};

const hist = (): Record<string, Hist> => read<Record<string, Hist>>(HIST, {});
export const getHist = (h: Pick<Host, "mac" | "ip">): Hist | undefined => hist()[noteKey(h)];

const pushUnique = (arr: string[], v: string) => (v && !arr.includes(v) ? [...arr, v].slice(-6) : arr);

/** Guarda el escaneo en el historial (últimos 10) y actualiza «primera/última vez visto» por equipo. */
export function recordScan(hosts: Host[], range: string) {
  const at = Date.now();
  const snaps = [...loadSnaps(), { at, range, hosts: hosts.map((h) => ({ ip: h.ip, name: h.name, mac: h.mac })) }];
  write(SNAPS, snaps.slice(-MAX_SNAPS));
  const hs = hist();
  for (const h of hosts) {
    const k = noteKey(h);
    const cur = hs[k] ?? { first: at, last: at, names: [], ips: [] };
    hs[k] = { first: cur.first, last: at, names: pushUnique(cur.names, h.name), ips: pushUnique(cur.ips, h.ip) };
  }
  write(HIST, hs);
}

export interface Diff {
  added: SnapHost[];
  removed: SnapHost[];
  ipChanged: { from: SnapHost; to: SnapHost }[];
  nameChanged: { from: SnapHost; to: SnapHost }[];
}

/** Diferencias entre dos escaneos. Los equipos se emparejan por MAC; sin MAC, por IP. */
export function diffSnaps(a: Snap, b: Snap): Diff {
  const key = (h: SnapHost) => (h.mac ? h.mac.toUpperCase() : `ip:${h.ip}`);
  const ma = new Map(a.hosts.map((h) => [key(h), h]));
  const mb = new Map(b.hosts.map((h) => [key(h), h]));
  const d: Diff = { added: [], removed: [], ipChanged: [], nameChanged: [] };
  mb.forEach((h, k) => {
    const o = ma.get(k);
    if (!o) d.added.push(h);
    else {
      if (o.ip !== h.ip) d.ipChanged.push({ from: o, to: h });
      if (o.name && h.name && o.name !== h.name) d.nameChanged.push({ from: o, to: h });
    }
  });
  ma.forEach((h, k) => {
    if (!mb.has(k)) d.removed.push(h);
  });
  return d;
}
