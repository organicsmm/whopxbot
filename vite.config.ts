import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    // Strip console.* and debugger in production builds to shrink bundle
    // and skip runtime work on every page load.
    drop: mode === "production" ? ["console", "debugger"] : [],
    legalComments: "none",
  },
  build: {
    // Modern browsers only → smaller, faster JS.
    target: "es2020",
    // Increase limit to suppress warnings for intentionally large chunks
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React runtime — very stable, cache-friendly
          "react-vendor": ["react", "react-dom"],
          // UI library core
          "ui-core": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
          ],
          // Data fetching layer
          "data-layer": [
            "@tanstack/react-query",
            "@supabase/supabase-js",
          ],
          // Router
          "router": ["react-router-dom"],
          // Charts and heavy UI
          "charts": ["recharts"],
          // Date utilities
          "date-fns": ["date-fns"],
          // Form/validation stack
          "forms": ["react-hook-form", "zod", "@hookform/resolvers"],
        },
      },
    },
  },
}));

