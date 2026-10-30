import { invoke } from "@tauri-apps/api/core";
import { PAYPAL_URL } from "./credits";
import { t } from "./i18n";

/** Botón «Donar» de PayPal. No se muestra si no hay enlace configurado. */
export default function DonateButton({ compact }: { compact?: boolean }) {
  if (!PAYPAL_URL) return null;
  const open = () => {
    invoke("open_url", { url: PAYPAL_URL }).catch(() => {
      window.open(PAYPAL_URL, "_blank");
    });
  };
  return (
    <button className={"btn donate" + (compact ? " icon" : "")} onClick={open} title={t("Apoyar el proyecto con una donación (PayPal)")}>
      ♥{compact ? "" : ` ${t("Donar")}`}
    </button>
  );
}
