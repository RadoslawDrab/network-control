import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import https from 'https';
import * as fs from 'fs';

import { Config } from 'utils/class';

import status from 'routes/status';
import device from 'routes/device';
import login from 'routes/login';

import { Settings } from 'types/index';
import { standarizeAddresses } from 'utils';
import { checkOrigin } from 'middleware';

const PORT = process.env._PORT || 3000;
const HOSTNAME = process.env._HOSTNAME || 'localhost';
const SECURE = String(process.env._SECURE) == 'true';
export const PRODUCTION = process.env.NODE_ENV === 'production';
export const origin = PRODUCTION ? [`http://${HOSTNAME}:${PORT}`, 'http://localhost:10000'] : [`http://localhost:3001`];
const app = express();

const networkInterfaces = os.networkInterfaces();
const serverAddresses = standarizeAddresses(
  Object.keys(networkInterfaces)
    .map((key) => networkInterfaces[key]?.map((inter) => inter.mac))
    .flat()
    .filter((addr) => addr) as string[],
  (addr) => !addr.match(/0{12}/)
);

const config = new Config<Settings>(
  'data',
  {
    appName: 'network-controller',
    devices: [],
    adminAddresses: [...serverAddresses],
    showTimeInfoTill: 0,
    reminderTime: 5 * 60,
    showTimeInfoDuration: 10,
    adminPasswordCacheTime: 3600,
    adminPassword: process.env._ADMIN_PASSWORD,
  },
  process.env._ENC_KEY ?? 'data'
);

app.use(express.json());
app.use(cors({ origin }));

app.use('/api/status', status(config, app));
app.use('/api/device', device(config, app));
app.use('/api/login', login(config, app));

if (PRODUCTION)
  app
    .use((req, res, next) => {
      const isValid = checkOrigin.call(true, req, res, next);
      if (isValid) next();
      else {
        res.status(401).send('Odmowa dostępu');
      }
    })
    .use('/', express.static(path.resolve('app')));

if (PRODUCTION && SECURE) {
  try {
    const httpsServer = https.createServer(
      {
        key: fs.readFileSync(path.join(__dirname, 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
      },
      app
    );

    httpsServer.listen(PORT, HOSTNAME, listeningHandler.bind(true));
  } catch (error) {
    console.log(error);
    app.listen(PORT, HOSTNAME, listeningHandler.bind(false));
  }
} else {
  app.listen(PORT, HOSTNAME, listeningHandler.bind(false));
}

function listeningHandler(this: boolean) {
  console.clear();
  const url = `http${this ? 's' : ''}://${HOSTNAME}${PORT != 80 && PORT != 443 ? ':' + PORT : ''}`;
  console.log(`Listening on ${url}`);
}
