import * as fs from 'fs';

fs.copyFileSync(process.execPath, 'dist/index.exe');
