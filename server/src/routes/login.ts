import express from 'express';
import crypto from 'crypto-js';

import { checkToken } from 'middleware';
import { setStatus } from 'utils/server';

import { AppConfig } from 'types';

export default (config: AppConfig) => {
  const router = express.Router();
  router
    .use(checkToken)
    .route('/')
    .get((req, res) => {
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

  return router;
};
