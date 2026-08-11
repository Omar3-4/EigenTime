/**
 * Widget entry point — completely separate from the main app bundle.
 * No router, no providers, no DataGate. Just the pill.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { WidgetPill } from "./components/widget-pill";

const root = document.getElementById("widget-root")!;
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <WidgetPill />
  </React.StrictMode>,
);
