import esbuild from 'esbuild';

const envVariables = Object.keys(process.env)
  .filter((key) => key.startsWith('_'))
  .reduce((obj, key) => ({ ...obj, ['process.env.' + key]: `"${process.env[key]}"` }), {});

await esbuild.build({
  bundle: true,
  entryPoints: ['./src/index.ts'],
  outfile: 'dist/index.cjs',
  treeShaking: true,
  platform: 'node',
  define: envVariables,
});
