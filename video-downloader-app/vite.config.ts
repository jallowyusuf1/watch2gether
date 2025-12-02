import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Optimize dependency handling to prevent cache issues
  optimizeDeps: {
    // Force re-optimization when dependencies change
    force: false,
    // Include dependencies that might cause issues
    include: [
      'lucide-react',
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'axios',
      'dexie',
      'dexie-react-hooks',
    ],
    // Exclude problematic dependencies from pre-bundling
    exclude: [],
  },
  // Server configuration
  server: {
    // Increase timeout for dependency optimization
    hmr: {
      overlay: true,
    },
    // Watch for dependency changes
    watch: {
      usePolling: false,
    },
  },
  // Build configuration
  build: {
    // Clear cache on build
    emptyOutDir: true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion'],
          'utils-vendor': ['axios', 'dexie', 'dexie-react-hooks'],
        },
      },
    },
  },
})
