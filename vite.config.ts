import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['verovio']
	},
	resolve: {
		alias: [
			// Use lib entry point instead of browser (which requires Vue)
			// Use exact match to not affect subpath imports
			{
				find: /^@k-l-lambda\/music-widgets$/,
				replacement: '@k-l-lambda/music-widgets/lib/index.js'
			}
		]
	},
	server: {
		fs: {
			allow: ['..']
		}
	}
});
