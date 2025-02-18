import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Main alias for src directory
      "@components": path.resolve(__dirname, "./src/components"), // Alias for components folder
      "@lib": path.resolve(__dirname, "./src/lib"), // Alias for library folder
      "@data": path.resolve(__dirname, "./src/data"), // Alias for mockData or static data
    },
  },
  server: {
    host: process.env.VITE_APP_HOST || "localhost", // Host configuration
    port: parseInt(process.env.VITE_APP_PORT, 10) || 5173, // Port configuration
    open: true, // Automatically open in the browser
  },
});