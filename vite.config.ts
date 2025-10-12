import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Temporarily disabled cartographer plugin due to traverse function error
    // Will be re-enabled once the babel/traverse compatibility is fixed
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined &&
    false // Set to false to disable cartographer temporarily
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    // Fix for Replit host blocking issue
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".replit.dev",
      ".repl.co",
      "34071b04-b6c8-46fb-850f-ff86046b4b89-00-3mpu0scgfalgf.riker.replit.dev",
      "school-manager-new.onrender.com",
      // Add any other Replit domains as needed
    ],
  },
  preview: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    // Fix for Replit host blocking issue in preview mode
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".replit.dev",
      ".repl.co",
      "34071b04-b6c8-46fb-850f-ff86046b4b89-00-3mpu0scgfalgf.riker.replit.dev",
      "school-manager-new.onrender.com",
    ],
  },
});
