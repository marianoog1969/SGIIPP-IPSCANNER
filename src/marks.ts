import type { Host } from "./lib";
import { noteKey } from "./notes";

const STARS = "ipscanner.stars.v1";
const KNOWN = "ipscanner.known.v1";

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

type K = Pick<Host, "mac" | "ip">;

/* ★ Equipos importantes (por MAC, o por IP si no hay MAC) */
export const loadStars = (): Set<string> => new Set(read<string[]>(STARS, []));
export const saveStars = (s: Set<string>) => write(STARS, [...s]);
export const starKey = (h: K) => noteKey(h);

/* Equipos conocidos: cualquier MAC que no esté aquí se considera desconocida */
export interface Known {
  init: boolean;
  keys: string[];
}
export const loadKnown = (): Known => {
  const v = read<Known>(KNOWN, { init: false, keys: [] });
  return v && Array.isArray(v.keys) ? v : { init: false, keys: [] };
};
export const saveKnown = (k: Known) => write(KNOWN, k);
/** Solo los equipos con MAC pueden ser «desconocidos» (sin MAC no hay identidad estable). */
export const hasMac = (h: K) => !!h.mac;
