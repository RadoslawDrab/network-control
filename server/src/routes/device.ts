import express from 'express';

import { checkBody, checkOrigin, checkTokenValidity } from 'middleware';
import { getPosition, standarizeAddresses } from 'utils';
import { setStatus } from 'utils/server';

import { AppConfig } from 'types';

export default (config: AppConfig, app: express.Express) => {
  const router = express.Router();
  router
    .use(checkOrigin)
    .get('/:address', (req, res) => {
      const devices = config.get().devices ?? [];

      const device = devices.find((addr) => addr.address === req.params.address);

      if (!device) {
        return setStatus(res, { code: 404, message: 'Device not found' });
      }

      res.status(200).json(device);
    })
    .get('/', (req, res) => {
      const devices = config.get()?.devices ?? [];
      res.status(200).json(devices);
    })
    .use(checkTokenValidity.bind(config))
    .delete('/:address', (req, res) => {
      const address = standarizeAddresses([req.params.address])[0];

      const savedDevices = config.get().devices ?? [];

      if (!savedDevices.find((addr) => addr.address === address))
        return setStatus(res, { code: 404, message: 'Device not found' });

      const filteredDevices = savedDevices.filter((admin) => admin.address !== address);

      config.set({ devices: filteredDevices });

      setStatus(res, { code: 200, message: 'Device deleted' });
    })
    .use(
      checkBody.bind({
        values: ['address', 'name', 'position'],
        all: (req) => req.method === 'POST',
        any: (req) => req.method === 'PUT',
      })
    )
    .put('/:address', (req, res) => {
      const [address, newAddress] = standarizeAddresses([req.params.address, req.body.address ?? '']);

      const savedDevices = config.get().devices ?? [];

      const savedDevice = savedDevices.find((addr) => addr.address === address);
      if (!savedDevice) return setStatus(res, { code: 404, message: 'Device not found' });
      const position = getPosition(req);

      config.set({
        devices: [
          ...savedDevices.filter((addr) => addr.address !== address),
          {
            ...savedDevice,
            address: newAddress || savedDevice.address,
            name: req.body.name,
            position: position,
            shortName: req.body.shortName,
          },
        ],
      });
      setStatus(res, { code: 200, message: 'Updated device' });
    })
    .post('/', (req, res) => {
      const address = standarizeAddresses([req.body.address ?? ''])[0];

      const savedDevices = config.get().devices ?? [];

      if (savedDevices.some((addr) => addr.address === address))
        return setStatus(res, { code: 400, message: 'Device already exists' });
      const position = getPosition(req);

      if (savedDevices.some((addr) => addr.position[0] === position[0] && addr.position[1] === position[1])) {
        return setStatus(res, { code: 400, message: 'Device in this position is already added' });
      }

      config.set({
        devices: [
          ...savedDevices,
          {
            address,
            lockAfter: Date.now(),
            position,
            name: req.body.name,
            shortName: req.body.shortName,
            lastOnline: 0,
            showTime: 0,
            restartTime: 0,
            shutdownTime: 0,
          },
        ],
      });

      setStatus(res, { code: 201, message: 'Device added' });
    });
  return router;
};
