import express from 'express';
import crypto from 'crypto-js';

import { checkAddress, checkAdmin } from 'middleware';
import { standarizeAddresses } from 'utils';
import { setStatus } from 'utils/server';

import { AppConfig } from 'types';

export default (config: AppConfig) => {
  const router = express.Router();
  router.route('/login').get((req, res) => {
    const password = req.headers['password'] as string | undefined;
    const token = req.headers['token'] as string | undefined;

    const { adminPassword, adminPasswordCacheTime } = config.get();
    if (password) {
      let adminPasswd = adminPassword;
      if (!adminPassword) {
        config.set({ adminPassword: password });
        adminPasswd = password;
      }
      if (adminPasswd === password) {
        const time = Date.now() + (adminPasswordCacheTime ?? 60) * 60 * 1000;
        const token = crypto.AES.encrypt(time.toString(), adminPasswd).toString();
        return res.status(200).json({ token, isValid: true });
      }
      return res.status(200).json({ isValid: false });
    } else if (token) {
      if (!adminPassword) throw setStatus(res, { code: 400, message: 'No admin password set' });
      const decryptedToken = crypto.AES.decrypt(token, adminPassword).toString(crypto.enc.Utf8);

      return res.status(200).json({ isValid: Date.now() <= Number(decryptedToken) });
    } else {
      return setStatus(res, { code: 400, message: 'No password or token provided' });
    }
  });

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
