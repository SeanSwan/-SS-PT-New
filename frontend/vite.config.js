import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Main alias for src directory
      "@components": path.resolve(__dirname, "./src/components"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@data": path.resolve(__dirname, "./src/data"),
      // Additional aliases for BerryAdmin:
      "ui-component": path.resolve(__dirname, "./src/BerryAdmin/ui-component"),
      "api": path.resolve(__dirname, "./src/BerryAdmin/api"),
      "hooks": path.resolve(__dirname, "./src/BerryAdmin/hooks"),
      "store": path.resolve(__dirname, "./src/BerryAdmin/store"),
      "contexts": path.resolve(__dirname, "./src/BerryAdmin/contexts"),
      "menu-items": path.resolve(__dirname, "./src/BerryAdmin/menu-items"),
      "config": path.resolve(__dirname, "./src/BerryAdmin/config.js"),
    },
  },
  server: {
    host: process.env.VITE_APP_HOST || "localhost",
    port: parseInt(process.env.VITE_APP_PORT, 10) || 5173,
    open: true,
  },
});
