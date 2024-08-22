import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { BootstrapVueNextResolver } from 'bootstrap-vue-next';
import { VitePWA } from 'vite-plugin-pwa';

import path from 'path';
import * as fs from 'fs';

const currentPath = (...str: string[]) => path.join(process.cwd(), 'app', ...str);
const outputPath = (...str: string[]) => path.join(process.cwd(), 'dist/app', ...str);

export default defineConfig({
  appType: 'spa',
  publicDir: 'app/public',
  plugins: [
    vue(),
    Components({
      dts: true,
      dirs: ['./src/components'],
      resolvers: [BootstrapVueNextResolver()],
    }),
    VitePWA({
      injectRegister: 'inline',
      disable: true,
      manifest: {
        name: 'Network-Controller',
        short_name: 'NC',
        description: 'Controller for enabling/disabling devices on network',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/assets/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/assets/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/assets/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/assets/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  root: currentPath(),
  server: {
    port: 3001,
  },
  build: {
    outDir: outputPath(),
    minify: true,
    copyPublicDir: true,
  },
  resolve: {
    alias: resolvePaths(),
  },
});

fs.cpSync(currentPath('public'), outputPath('assets'), { recursive: true });

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
