import { invoke } from "@tauri-apps/api/core";

/** Escribe una línea en el registro de errores (nunca lanza excepciones). */
export function logEvent(level: "info" | "warn" | "error", message: string) {
  try {
    invoke("log_event", { level, message: String(message).slice(0, 4000) }).catch(() => {});
  } catch {
    /* sin backend (modo web) */
  }
}

/** Captura errores no controlados de la interfaz. */
export function installGlobalLogging() {
  window.addEventListener("error", (e) => {
    logEvent("error", `Error no controlado: ${e.message} (${e.filename}:${e.lineno})`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    logEvent("error", `Promesa rechazada: ${String((e.reason && (e.reason.stack || e.reason.message)) || e.reason)}`);
  });
}
