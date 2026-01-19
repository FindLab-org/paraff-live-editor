import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['verovio']
	},
	resolve: {
		alias: {
			// Use lib entry point instead of browser (which requires Vue)
			'@k-l-lambda/music-widgets': '@k-l-lambda/music-widgets/lib/index.js'
		}
	},
	server: {
		fs: {
			allow: ['..']
		}
	}
});
