import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [tsConfigPaths(), tanstackStart(), viteReact(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only apply manual chunks for client build
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) {
              return 'vendor-charts'
            }
            if (id.includes('zustand')) {
              return 'vendor-zustand'
            }
          }
        },
      },
    },
  },
})
