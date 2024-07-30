import esbuild from 'esbuild';

await esbuild.build({
  bundle: true,
  entryPoints: ['./src/index.ts'],
  outfile: 'dist/index.js',
  treeShaking: true,
  platform: 'node',
});
