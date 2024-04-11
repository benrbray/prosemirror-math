// vite configuration for building the GitHub Pages site

import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [tsConfigPaths()],
	base: "/prosemirror-math/",
	build: {
		outDir: "dist-site",
	},
})