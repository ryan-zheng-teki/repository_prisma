import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // es2020 keeps `import.meta` in the ESM build; the shims supply `import.meta.url` in CJS.
  target: 'es2020',
  shims: true,
  platform: 'node',
  external: ['@prisma/client', '@prisma/adapter-better-sqlite3'],
});
