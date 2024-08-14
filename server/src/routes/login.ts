import express from 'express';
import crypto from 'crypto-js';

import { checkBody, checkHeaders, checkOrigin } from 'middleware';
import { setStatus } from 'utils/server';

import { AppConfig } from 'types';
import { Status } from 'types/server';

export default (config: AppConfig) => {
  const router = express.Router();
  router
    .use(checkOrigin)
    .use(checkHeaders.bind({ values: ['password'], errorMessage: 'No password provided' }))
    .get('/token', (req, res) => {
      const password = req.headers['password'] as string;
      const { adminPassword, adminPasswordCacheTime } = config.get();
      let adminPasswd = adminPassword;
      if (!adminPassword) {
        config.set({ adminPassword: password });
        adminPasswd = password;
      }
      if (adminPasswd === password) {
        const time = Date.now() + (adminPasswordCacheTime ?? 60) * 60 * 1000;
        const token = crypto.AES.encrypt(time.toString(), adminPasswd).toString();
        return res.status(200).json({ token });
      }
      return setStatus(res, { code: 401, message: 'Incorrect password' });
    });
  router
    .use(checkHeaders.bind({ values: ['token'], errorMessage: 'No token provided' }))
    .get('/', (req, res) => {
      const token = req.headers['token'] as string;
      const [isValid] = getTokenValidity(token);

      return res.status(200).json({ isValid });
    })
    .use(checkBody.bind({ values: ['password'], errorMessage: 'No password provided' }))
    .put('/', (req, res) => {
      const password = req.body['password'] as string;

      try {
        const adminPassword = config.get().adminPassword;

        if (password === adminPassword) {
          return setStatus(res, { code: 400, message: "New password can't be the same as old one" });
        }
        if (!password) return setStatus(res, { code: 400, message: 'No password provided' });

        config.set({ adminPassword: password });
        setStatus(res, { code: 200, message: 'Password set' });
      } catch (error) {
        setStatus(res, error as Status);
      }
    });

  return router;
  function getTokenValidity(token: string): [boolean, string] {
    try {
      const [time, adminPassword] = decryptToken(token);
      return [Date.now() <= time, adminPassword];
    } catch (error) {
      throw error;
    }
  }
  function decryptToken(token: string): [number, string] {
    const adminPassword = config.get().adminPassword;
    if (!adminPassword) throw { code: 400, message: 'No admin password set' };
    const decryptedToken = crypto.AES.decrypt(token, adminPassword).toString(crypto.enc.Utf8);
    return [Number(decryptedToken), adminPassword];
  }
};
