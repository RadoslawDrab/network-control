import express from 'express';

import { getAddresses } from 'utils/index';
import { setStatus } from 'utils/server';

import { Status } from 'types/server';

export default function (req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    getAddresses(req);
    next();
  } catch (error) {
    return setStatus(res, { code: 400, message: (error as Status).message });
  }
}
