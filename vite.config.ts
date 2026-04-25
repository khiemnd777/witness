import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ["@babylonjs/core", "@babylonjs/loaders"],
          react: ["react", "react-dom", "zustand"]
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
