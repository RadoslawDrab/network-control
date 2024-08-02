import express from 'express';
import { checkAddress, checkAdmin } from 'middleware';

import { AppConfig } from 'types';
import { standarizeAddresses } from 'utils';
import { setStatus } from 'utils/server';

export default (config: AppConfig) => {
  const router = express.Router();

  router
    .use(checkAddress)
    .use(checkAdmin.bind(config))
    .route('/')
    .get((req, res) => {
      const adminAddresses = config.get().adminAddresses ?? [];

      res.status(200).json(adminAddresses);
    })
    .post((req, res) => {
      const address = standarizeAddresses([req.body.address ?? ''])[0];

      const adminAddresses = config.get().adminAddresses ?? [];

      if (adminAddresses.find((admin) => admin === address)) return setStatus(res, 400);

      config.set({ adminAddresses: [...adminAddresses, address] });

      setStatus(res, { code: 201, message: 'Added admin MAC address' });
    });

  router
    .use(checkAddress)
    .use(checkAdmin.bind(config))
    .route('/:address')
    .delete((req, res) => {
      const address = standarizeAddresses([req.params.address])[0];

      const adminAddresses = config.get().adminAddresses ?? [];

      if (!adminAddresses.includes(address))
        return setStatus(res, { code: 400, message: "Admin MAC address doesn't exist" });

      const filteredAddresses = adminAddresses.filter((admin) => admin !== address);
      if (filteredAddresses.length === 0)
        return setStatus(res, { code: 400, message: "Couldn't remove admin MAC address" });

      config.set({ adminAddresses: filteredAddresses });

      setStatus(res, { code: 200, message: 'Admin MAC address deleted' });
    });

  return router;
};
