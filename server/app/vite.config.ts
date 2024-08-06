import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import * as fs from 'fs';

const currentPath = (...str: string[]) => path.join(process.cwd(), 'app', ...str);
export default defineConfig({
  appType: 'spa',
  publicDir: 'app/public',
  plugins: [vue()],
  root: currentPath(),
  build: {
    outDir: path.join(process.cwd(), 'dist/app'),
    minify: true,
    copyPublicDir: true,
  },
  resolve: {
    alias: resolvePaths(),
  },
});

function resolvePaths(tsconfigPath: string = './tsconfig.json') {
  const tsconfig = fs.readFileSync(currentPath(tsconfigPath), 'utf-8');
  const { baseUrl, paths } = JSON.parse(tsconfig).compilerOptions;
  return paths
    ? Object.keys(paths).reduce((keys, key) => {
        const specialCharactersRegEx = new RegExp(/[*\\]/);
        const aliases: string[] = paths[key];
        const name = key.replace(specialCharactersRegEx, '').replace(/\/$/, '');
        return {
          ...keys,
          [name]: aliases.map((alias) =>
            path.resolve(
              __dirname,
              baseUrl.replace(specialCharactersRegEx, ''),
              alias.replace(specialCharactersRegEx, '')
            )
          ),
        };
      }, {})
    : {};
}
