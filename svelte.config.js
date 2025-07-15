import adapter from '@sveltejs/adapter-static';
import { sveltePreprocess } from 'svelte-preprocess';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: sveltePreprocess(),

	kit: {
		adapter: adapter(),
		paths: {
			base: '',        // Required for custom domain
		},
		appDir: 'internal' // This renames `_app` to `internal`
	}
};

export default config;
