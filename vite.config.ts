import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import path from "path";
import fs from "fs";

// Plugin: treat .es files as raw text imports (no ?raw suffix needed)
function esRawPlugin(): Plugin {
	return {
		name: 'es-raw-loader',
		transform(_code: string, id: string) {
			if (id.endsWith('.es')) {
				const content = fs.readFileSync(id, 'utf-8');
				return {
					code: `export default ${JSON.stringify(content)};`,
					map: null,
				};
			}
		},
	};
}

export default defineConfig({
	plugins: [esRawPlugin(), sveltekit()],
	assetsInclude: ['**/*.es'],
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