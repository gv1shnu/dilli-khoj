import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production is served by GitHub Pages at https://www.vishnugandarapu.in/dilli-khoj/.
// Dev stays at the root so local URLs and browser checks are unchanged.
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? "/dilli-khoj/" : "/",
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
  worker: {
    format: "es",
  },
}));
