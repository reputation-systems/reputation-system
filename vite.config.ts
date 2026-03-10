import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import path from "path";

function esRawPlugin() {
	return {
		name: 'es-raw',
		enforce: 'pre',
		load(id: string) {
			if (!id.endsWith('.es')) return null;
			const source = readFileSync(id, 'utf-8');
			return `export default ${JSON.stringify(source)};`;
		},
	};
}

export default defineConfig({
	plugins: [esRawPlugin(), sveltekit()],
	test: {
		globals: true,
		environment: 'node',
	},
	resolve: {
		alias: {
			$components: path.resolve('./src/components'),
			$lib: path.resolve("./src/lib"),
		},
	},
	optimizeDeps: {
		esbuildOptions: {
			loader: {
				'.es': 'text',
			},
		},
	},
});

const config = {
	// …
	ssr: {
		noExternal: ['three']
	}
}
