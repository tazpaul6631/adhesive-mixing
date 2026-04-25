/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    legacy(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2,wasm}'],
        cleanupOutdatedCaches: true,
        // 1️⃣ THÊM DÒNG NÀY ĐỂ FIX LỖI "Assets exceeding the limit" (Tăng lên 5MB)
        maximumFileSizeToCacheInBytes: 5000000,
      },
      manifest: {
        name: 'My Security App',
        short_name: 'SecurityApp',
        description: 'Ứng dụng bảo mật tối ưu',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/assets/icon/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
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
  },

  server: {
    host: '0.0.0.0',
    port: 8100,
    // VITE RELOAD KHI ANDROID BUILD
    watch: {
      ignored: ['**/android/**'], // Không theo dõi các file trong thư mục android
    },
    // hmr: {
    //   host: '10.0.149.28',
    //   // port: 8101
    // },
    strictPort: false,
  }
})