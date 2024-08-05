import esbuild from 'esbuild';
import vuePlugin from 'esbuild-plugin-vue3';
import * as fs from 'fs';
import path from 'path';

const watch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: ['app/main.ts'],
  bundle: true,
  outfile: 'dist/app/main.js',
  plugins: [vuePlugin()],
  minify: !watch,
  publicPath: 'app/public',
};

if (watch) {
  const ctx = await esbuild.context(config);
  ctx.watch();
} else {
  await esbuild.build(config);
  const destinationFolder = 'dist/app';
  fs.copyFileSync('app/index.html', path.join(destinationFolder, 'index.html'));

  const files = fs.readdirSync(path.resolve(config.publicPath), { recursive: true });
  files.forEach((file) => {
    fs.copyFileSync(path.join(config.publicPath, file), path.join(destinationFolder, file));
  });
}
