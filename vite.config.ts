import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        main: path.resolve(__dirname, "index.html"),
        // Widget gets its own completely separate bundle
        widget: path.resolve(__dirname, "widget.html"),
      },
    },
  },
});

