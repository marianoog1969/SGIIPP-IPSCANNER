/** Créditos de la aplicación (se muestran en «Acerca de»). Edita aquí el texto. */
export const CREDITS = {
  creadoPor: "Servicio de Informática CIS Guillermo Miranda de Murcia",
  anio: "2026",
  tecnologias: [
    ["Tauri 2", "marco de aplicaciones de escritorio"],
    ["Rust", "motor de escaneo y consultas"],
    ["React + TypeScript", "interfaz"],
    ["jsPDF + AutoTable", "informes PDF"],
  ] as [string, string][],
};

/**
 * Enlace de donación de PayPal (https://www.paypal.com/... o https://paypal.me/...).
 * Mientras esté vacío, el botón «Donar» no se muestra.
 */
export const PAYPAL_URL = "https://www.paypal.me/marianoog";
