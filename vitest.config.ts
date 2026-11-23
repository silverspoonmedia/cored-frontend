import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// The plugin is required even for node-environment unit tests: `@/i18n` pulls
// the feature registry, whose feature modules import their route tables, and a
// route table imports views (`.vue`). Without the transform Vite hands the SFC
// to the import analyser and fails on the first `<script>` tag.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
