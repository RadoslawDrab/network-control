import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';

import { Config } from 'utils/class';

import status from 'routes/status';
import device from 'routes/device';
import login from 'routes/login';

import { Settings } from 'types/index';
import { standarizeAddresses } from 'utils';

const PORT = process.env._PORT || 3000;
const HOSTNAME = process.env._HOSTNAME || '127.0.0.1';
const PRODUCTION = process.env.NODE_ENV === 'production';
export const origin = [`http://${HOSTNAME}:${PORT}`, `http://localhost:3001`];
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
    adminPassword: process.env._ADMIN_PASSWORD,
  },
  process.env._ENC_KEY ?? 'data'
);

app.use(express.json());
app.use(cors({ origin }));

app.use('/api/status', status(config, app));
app.use('/api/device', device(config, app));
app.use('/api/login', login(config, app));

if (PRODUCTION) app.use('/', express.static(path.resolve('app')));

app.listen(PORT, HOSTNAME, () => {
  console.clear();
  console.log(`Listening on http://${HOSTNAME}:${PORT}`);
});
