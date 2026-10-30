import EN from "./i18n.en";

export type Lang = "es" | "en";

let current: Lang = "es";

export const LANG_KEY = "ipscanner.lang";

/** Idioma inicial: el guardado; si no hay, español. */
export function initialLang(saved?: string): Lang {
  return saved === "en" || saved === "es" ? saved : "es";
}

export function setLang(l: Lang) {
  current = l;
  try {
    document.documentElement.lang = l;
  } catch {
    /* sin DOM */
  }
}

export const getLang = (): Lang => current;

/** Configuración regional para fechas y números. */
export const locale = () => (current === "en" ? "en-GB" : "es-ES");

declare global {
  interface Window {
    __i18nMissing?: Set<string>;
  }
}

/**
 * Traduce. El texto en español es la clave (y el valor por defecto);
 * `{nombre}` se sustituye por vars.nombre.
 */
export function t(es: string, vars?: Record<string, string | number>): string {
  let s = es;
  if (current === "en") {
    const v = EN[es];
    if (v === undefined) {
      (window.__i18nMissing ||= new Set()).add(es);
    } else {
      s = v;
    }
  }
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

/** Singular/plural: tn(n, "{n} equipo", "{n} equipos"). */
export const tn = (n: number, one: string, many: string) => t(n === 1 ? one : many, { n });
