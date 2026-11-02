import { invoke } from "@tauri-apps/api/core";
import type { Host } from "./lib";
import { logEvent } from "./log";

export interface Note {
  nota: string;
  ubic: string;
}

/** Las notas se guardan por MAC (la IP cambia); si no hay MAC, por IP. */
export const noteKey = (h: Pick<Host, "mac" | "ip">) => (h.mac ? h.mac.toUpperCase() : `ip:${h.ip}`);

let store: Record<string, Note> = {};

export const getNote = (h: Pick<Host, "mac" | "ip">): Note | undefined => store[noteKey(h)];

export const noteText = (h: Pick<Host, "mac" | "ip">) => {
  const n = getNote(h);
  return n ? [n.ubic, n.nota].filter(Boolean).join(" · ") : "";
};

export async function loadNotes(dir: string): Promise<void> {
  try {
    const raw = await invoke<string>("notes_load", { dir });
    const o = JSON.parse(raw || "{}");
    store = o && typeof o === "object" ? o : {};
  } catch (e) {
    store = {};
    logEvent("warn", `Notas: ${String(e)}`);
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
const pending = new Map<string, Note | null>();

/**
 * Guarda una nota (vacía = se borra). Al escribir, vuelve a leer el fichero y aplica solo los
 * cambios pendientes, para no pisar las notas que otro puesto haya guardado entre medias.
 */
export function setNote(h: Pick<Host, "mac" | "ip">, n: Note, dir: string, onError: (m: string) => void) {
  const k = noteKey(h);
  const empty = !n.nota.trim() && !n.ubic.trim();
  const clean = { nota: n.nota.trim(), ubic: n.ubic.trim() };
  if (empty) delete store[k];
  else store[k] = clean;
  pending.set(k, empty ? null : clean);
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      let disk: Record<string, Note> = {};
      try {
        disk = JSON.parse((await invoke<string>("notes_load", { dir })) || "{}") || {};
      } catch {
        /* se parte de lo que hay en memoria */
      }
      pending.forEach((v, key) => (v ? (disk[key] = v) : delete disk[key]));
      pending.clear();
      store = disk;
      await invoke("notes_save", { dir, json: JSON.stringify(disk, null, 1) });
    } catch (e) {
      logEvent("error", `Notas: ${String(e)}`);
      onError(String(e));
    }
  }, 400);
}
