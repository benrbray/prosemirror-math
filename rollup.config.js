// rollup.config.js
// (adapted from https://hackernoon.com/building-and-publishing-a-module-with-typescript-and-rollup-js-faa778c85396)

import ts from "@wessberg/rollup-plugin-ts";
import pkg from "./package.json"

export default {
  input: 'src/index.ts',
  output: [{
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true
  }, {
    file: 'dist/index.es.js',
    format: 'es',
    sourcemap: true,
	
  }],
  plugins: [ts()],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};