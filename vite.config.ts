import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter(),
			paths: {
				base: '' // Required for custom domain
			},
			appDir: 'internal' // This renames `_app` to `internal`
		})
	],
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	test: {
		environment: 'node',
		setupFiles: ['./src/vitest-setup.ts'],
		passWithNoTests: true
	}
});
