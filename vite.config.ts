import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    tailwindcss(),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  clearScreen: false,
  base: "",
  build: {
    outDir: ".output/public",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Main app entry
        main: resolve(import.meta.dirname, "index.html"),
        // Widget gets its own completely separate bundle
        widget: resolve(import.meta.dirname, "widget.html"),
      },
    },
  },
});

