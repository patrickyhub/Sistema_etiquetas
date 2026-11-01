import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/900.css";
import "./index.css";
import App from "./App.tsx";
import { LicenciaGate } from "./LicenciaGate.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LicenciaGate>
      <App />
    </LicenciaGate>
  </React.StrictMode>
);