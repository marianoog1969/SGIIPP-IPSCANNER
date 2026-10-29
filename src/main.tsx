import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import ErrorBoundary from "./ErrorBoundary";
import { installGlobalLogging } from "./log";

installGlobalLogging();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
