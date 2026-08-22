import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig(({ command }) => ({
	define: {
		__INTLIFY_JIT_COMPILATION__: false,
		__INTLIFY_DROP_MESSAGE_COMPILER__: true,
	},
	plugins: [
		vue(),
		...(command === 'serve' ? [vueDevTools()] : []),
		tailwindcss(),
		cloudflare(),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server: {
		hmr: {
			overlay: false,
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router') || id.includes('node_modules/vue-i18n')) {
						return 'vue'
					}
					if (id.includes('node_modules/bootstrap/') && !id.includes('select2-bootstrap')) {
						return 'bootstrap'
					}
					if (id.includes('node_modules/laravel-echo') || id.includes('node_modules/pusher-js')) {
						return 'echo'
					}
					return undefined
				},
			},
		},
	},
}))
