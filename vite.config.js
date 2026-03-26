import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Split vendor deps into a separate chunk — improves caching across deploys
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
            if (id.includes("framer-motion")) return "vendor-motion";
          }
        },
      },
    },
  },
  server: {
    // Proxy /api requests to the Express TTS server during development.
    // In production, server.js serves both the API and the built frontend.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
