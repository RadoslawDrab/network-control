import express from 'express';

import { checkBody, checkOrigin, checkTokenValidity } from 'middleware';
import { setStatus } from 'utils/server';

import { AppConfig } from 'types';

export default (config: AppConfig, app: express.Express) => {
  const router = express.Router();

  router
    .use(checkOrigin)
    .get('/', (req, res) => {
      const { adminPasswordCacheTime, reminderTime } = config.get();

      res.status(200).json({ adminPasswordCacheTime, reminderTime });
    })
    .use(checkTokenValidity.bind(config))
    .use(checkBody.bind({ values: ['adminPasswordCacheTime', 'reminderTime'], any: true }))
    .put('/', (req, res) => {
      const { adminPasswordCacheTime, reminderTime } = config.get();
      config.set({
        adminPasswordCacheTime: req.body.adminPasswordCacheTime ?? adminPasswordCacheTime,
        reminderTime: req.body.reminderTime ?? reminderTime,
      });
      setStatus(res, { code: 200, message: 'Updated settings' });
    });

  return router;
};
