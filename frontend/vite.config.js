import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import svgr from "vite-plugin-svgr"; // Add this import at the top

export default defineConfig({
  plugins: [
    react(),
    svgr() // Fix the syntax - no square brackets around svgr()
  ],
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
      // Add alias for assets to help with SVG imports
      "assets": path.resolve(__dirname, "./src/BerryAdmin/assets"),
    },
  },
  server: {
    host: process.env.VITE_APP_HOST || "localhost",
    port: parseInt(process.env.VITE_APP_PORT, 10) || 5173,
    open: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});