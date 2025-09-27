import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Apunta "@" a la RAÍZ del repo para que
      // "@/components/..." y "@/services/..." funcionen:
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
