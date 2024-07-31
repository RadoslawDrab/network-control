import express from 'express';

import { AppConfig } from 'types';

export default (config: AppConfig) => {
  const router = express.Router();

  router.route('/');

  return router;
};
