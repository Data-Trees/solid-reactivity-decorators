import solid from 'vite-plugin-solid';
import path from 'path';
import packageJson from './package.json';
import dts from 'vite-plugin-dts';
import {defineConfig} from "vite";

export default defineConfig({
  plugins: [
    solid(),
    dts({
      rollupTypes: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
  build: {
    minify: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, packageJson.main),
      name: packageJson.name,
      formats: ['es', 'umd'],
    },
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      // Ensure peer dependencies are not bundled
      external: ['solid-js', '@solid-primitives/memo'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          'solid-js': 'SolidJS', // Use a conventional global name
          '@solid-primitives/memo': 'SolidPrimitivesMemo', // Choose a suitable global name
        },
      },
    },
  },
});
