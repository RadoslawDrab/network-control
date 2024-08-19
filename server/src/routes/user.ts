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
      const addresses = config.get().addresses ?? [];

      const address = addresses.find((addr) => addr.address === req.params.address);

      if (!address) {
        return setStatus(res, { code: 400, message: 'MAC address not found' });
      }

      res.status(200).json(address);
    })
    .get('/', (req, res) => {
      const addresses = config.get().addresses ?? [];

      res.status(200).json(addresses);
    })
    .use(checkTokenValidity.bind(config))
    .delete('/:address', (req, res) => {
      const address = standarizeAddresses([req.params.address])[0];

      const savedAddresses = config.get().addresses ?? [];

      console.log(savedAddresses);
      if (!savedAddresses.find((addr) => addr.address === address))
        return setStatus(res, { code: 400, message: "MAC address doesn't exist" });

      const filteredAddresses = savedAddresses.filter((admin) => admin.address !== address);

      config.set({ addresses: filteredAddresses });

      setStatus(res, { code: 200, message: 'MAC address deleted' });
    })
    .use(
      checkBody.bind({
        values: ['address', 'name', 'position'],
        all: true,
      })
    )
    .post('/', (req, res) => {
      const address = standarizeAddresses([req.body.address ?? ''])[0];

      const savedAddresses = config.get().addresses ?? [];

      if (savedAddresses.some((addr) => addr.address === address))
        return setStatus(res, { code: 400, message: 'MAC address already exists' });
      const position = getPosition(req);

      if (savedAddresses.some((addr) => addr.position[0] === position[0] && addr.position[1] === position[1])) {
        return setStatus(res, { code: 400, message: 'Device in this position is already added' });
      }

      config.set({
        addresses: [
          ...savedAddresses,
          {
            address,
            lockAfter: Date.now(),
            position,
            name: req.body.name,
            shortName: req.body.shortName,
          },
        ],
      });

      setStatus(res, { code: 201, message: 'Added MAC address' });
    });
  return router;
};
