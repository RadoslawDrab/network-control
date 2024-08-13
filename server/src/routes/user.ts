import express from 'express';

import { checkBody, checkTokenValidity } from 'middleware';
import { getPosition, standarizeAddresses } from 'utils';
import { setStatus } from 'utils/server';

import { AppConfig } from 'types';

export default (config: AppConfig) => {
  const router = express.Router();

  router.use(checkTokenValidity.bind(config)).get('/', (req, res) => {
    const addresses = config.get().addresses ?? [];

    res.status(200).json(addresses);
  });
  router
    .use(checkTokenValidity.bind(config))
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
  router
    .use(checkTokenValidity.bind(config))
    .route('/:address')
    .delete((req, res) => {
      const address = standarizeAddresses([req.params.address])[0];

      const savedAddress = config.get().addresses ?? [];

      if (!savedAddress.find((addr) => addr.address === address))
        return setStatus(res, { code: 400, message: "MAC address doesn't exist" });

      const filteredAddresses = savedAddress.filter((admin) => admin.address !== address);

      config.set({ addresses: filteredAddresses });

      setStatus(res, { code: 200, message: 'MAC address deleted' });
    });
  return router;
};
