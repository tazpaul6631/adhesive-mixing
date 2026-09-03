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
          // App feature chunks (src) — tách BT/print/scale khỏi page shell.
          if (
            id.includes(`${path.sep}BluetoothPrinterStatus`)
            || id.includes(`${path.sep}BatchPrintRetryDialog`)
            || id.includes(`${path.sep}ElectronicScale`)
            || id.includes(`${path.sep}ScaleDevicePicker`)
            || id.includes(`${path.sep}useBluetoothPrinter`)
            || id.includes(`${path.sep}useScaleManager`)
            || id.includes(`${path.sep}useScaleKeepAwake`)
            || id.includes(`${path.sep}useMixGlueLabelBatchPrint`)
            || id.includes(`${path.sep}useSeparateLabelBatchPrint`)
            || id.includes(`${path.sep}mixGlueLabelPrint`)
            || id.includes(`${path.sep}separateMixedGlueLabelPrint`)
            || id.includes(`${path.sep}mixPrintPendingStorage`)
            || id.includes(`${path.sep}separatePrintPendingStorage`)
            || id.includes(`${path.sep}mixGluePrintQueue`)
            || id.includes(`${path.sep}usePrintQueue`)
            || id.includes(`${path.sep}labelPrintSession`)
            || id.includes(`${path.sep}useLabelPrintGapConfirm`)
            || id.includes(`${path.sep}useTabletBarcodeScan`)
            || id.includes(`${path.sep}componentWeightLabelPrint`)
          ) {
            return 'feature-print';
          }
          if (id.includes('node_modules')) {
            // Keep vue-icons out of vendor-vue-core (`includes('vue')` would match "vue-icons").
            if (id.includes('@kalimahapps/vue-icons')) {
              return 'vendor-vue-icons';
            }
            if (id.includes('@capacitor-mlkit')) {
              return 'feature-print';
            }
            if (id.includes('primevue') || id.includes('primeicons')) return 'vendor-primevue';
            if (
              id.includes(`${path.sep}vue${path.sep}`)
              || id.includes('/vue/')
              || id.includes('\\vue\\')
              || id.includes('@vue')
              || id.includes('pinia')
              || id.includes('vue-router')
              || id.includes('vue-i18n')
            ) {
              return 'vendor-vue-core';
            }
            if (id.includes('@capacitor')) return 'vendor-capacitor';
            return 'vendor-others';
          }
        }
      }
    }
  }
})