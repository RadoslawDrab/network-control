import express from 'express';

import { checkAddress, checkAdmin } from 'middleware';
import { standarizeAddresses } from 'utils';
import { setStatus } from 'utils/server';

import { AppConfig } from 'types';

export default (config: AppConfig) => {
  const router = express.Router();

  router
    .use(checkAddress)
    .use(checkAdmin.bind(config))
    .route('/')
    .get((req, res) => {
      const addresses = config.get().addresses ?? [];

      res.status(200).json(addresses);
    })
    .post((req, res) => {
      const address = standarizeAddresses([req.body.address ?? ''])[0];

      const savedAddresses = config.get().addresses ?? [];

      if (savedAddresses.find((addr) => addr.address === address))
        return setStatus(res, { code: 400, message: 'MAC address already exists' });

      config.set({ addresses: [...savedAddresses, { address, lockAfter: Date.now() }] });

      setStatus(res, { code: 201, message: 'Added MAC address' });
    });
  router
    .use(checkAddress)
    .use(checkAdmin.bind(config))
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
