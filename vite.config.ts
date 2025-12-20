import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from "path";

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true, 
		environment: 'node', 
	},
  	resolve: {
    		alias: {
				$components: path.resolve('./src/components'),
      			$lib: path.resolve("./src/lib"),
    		},
  	}
});

const config = {
	// …
	ssr: {
	  noExternal: ['three']
	}
  }