import React from "react";
import { logEvent } from "./log";
import { t } from "./i18n";

/** Si la interfaz falla, se muestra el error (y se registra) en lugar de dejar la ventana en blanco. */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logEvent("error", `Fallo de la interfaz: ${error.stack || error.message}\n${info.componentStack}`);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 32, fontFamily: "system-ui, sans-serif", maxWidth: 720 }}>
        <h2>{t("Ha ocurrido un error inesperado")}</h2>
        <p>{t("Se ha guardado en el registro de errores. Puedes continuar recargando la vista.")}</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f3f4f6", padding: 12, borderRadius: 6, color: "#b91c1c" }}>
          {this.state.error.message}
        </pre>
        <button className="btn primary" onClick={() => location.reload()}>
          {t("Recargar")}
        </button>
      </div>
    );
  }
}
