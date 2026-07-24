/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    legacy(),
  ],

  // SASS DEPRECATION
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // Sử dụng compiler mới để tắt cảnh báo legacy API
      },
    },
  },

  optimizeDeps: {
    exclude: ['@capacitor-community/sqlite']
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  },
  build: {
    chunkSizeWarningLimit: 2000,
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // THÊM ĐOẠN NÀY ĐỂ TÁCH NHỎ FILE RA, GIẢI QUYẾT CẢNH BÁO MÀU VÀNG
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@ionic')) return 'vendor-ionic';
            if (id.includes('primevue') || id.includes('primeicons')) return 'vendor-primevue';
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) return 'vendor-vue-core';
            if (id.includes('@capacitor')) return 'vendor-capacitor';
            return 'vendor-others';
          }
        }
      }
    }
  }
})