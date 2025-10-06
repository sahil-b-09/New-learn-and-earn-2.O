import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5000,
    hmr: false,
    ws: false,
    middlewareMode: false,
    watch: {
      ignored: ['**/.git/**', '**/node_modules/**'],
    },
    cors: true,
  },
  optimizeDeps: {
    exclude: ['@vite/client', 'ws']
  },
  clearScreen: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  build: {
    sourcemap: false,
    minify: false,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Custom plugin to remove Vite client from HTML
    {
      name: 'remove-vite-client',
      transformIndexHtml(html: string) {
        return html.replace(/<script type="module" src="\/@vite\/client"><\/script>/, '');
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
