// vite configuration for building the npm package

import { resolve } from 'path';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';

import pkg from "./package.json";

export default defineConfig({
	plugins: [
		tsConfigPaths(),
		dts({
			rollupTypes: true,
			tsconfigPath: "./tsconfig.build.json"
		}),
	],
	build: {
		lib: {
			formats: ["es"],
			entry: resolve(__dirname, 'lib/main.ts'),
		},
		rollupOptions: {
			external: [
				...Object.keys(pkg.peerDependencies || {}),
			]
		},
	},
})