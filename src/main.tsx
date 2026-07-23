import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { isTauri } from "./lib/backend";
import "./styles/global.css";

// Outside the Tauri shell there is no desktop behind the transparent window;
// flag the document so CSS can paint a stand-in wallpaper for the glass.
if (!isTauri) {
  document.documentElement.classList.add("browser-preview");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
