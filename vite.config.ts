import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite options tailored for Tauri development.
// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Prevent Vite from obscuring Rust compiler errors.
  clearScreen: false,

  server: {
    // Tauri expects a fixed port; fail loudly instead of falling back.
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  // Env variables prefixed with TAURI_ENV_* are exposed for platform-specific builds.
  envPrefix: ["VITE_", "TAURI_ENV_"],
});
