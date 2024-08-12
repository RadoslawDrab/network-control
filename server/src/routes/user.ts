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
        values: ['address', 'x', 'y'],
        all: true,
        errorMessage: "Body has to include 'address', 'x' and 'y' properties ",
      })
    )
    .post('/', (req, res) => {
      const address = standarizeAddresses([req.body.address ?? ''])[0];
      const position = getPosition(req);

      const savedAddresses = config.get().addresses ?? [];

      if (savedAddresses.find((addr) => addr.address === address))
        return setStatus(res, { code: 400, message: 'MAC address already exists' });

      config.set({ addresses: [...savedAddresses, { address, lockAfter: Date.now(), position }] });

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
