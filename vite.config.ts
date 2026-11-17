import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0", // Escuta em todas as interfaces de rede (0.0.0.0)
    cors: true,       // Libera totalmente o CORS (Access-Control-Allow-Origin: *)
  },
  preview: {
    port: 5173,
    host: "0.0.0.0",
    cors: true,
  },
});
