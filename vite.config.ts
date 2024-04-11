import { resolve } from 'path';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths'

import pkg from "./package.json";

export default defineConfig({
	plugins: [tsConfigPaths()],
	build: {
		lib: {
			formats: ["es"],
			entry: resolve(__dirname, 'lib/main.ts'),
		},
		rollupOptions: {
			// externalize dependencies that shouldn't be bundled with the package
			external: [
				// ...Object.keys(pkg.dependencies || {}),
				...Object.keys(pkg.peerDependencies || {}),
			]
		},
	},
})