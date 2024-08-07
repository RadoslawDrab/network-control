import express from 'express';

import { getAddresses, checkAdmin as admin } from 'utils/index';
import { setStatus } from 'utils/server';

import { Status } from 'types/server';
import { AppConfig } from 'types';

export function checkAddress(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    getAddresses(req);
    next();
  } catch (error) {
    return setStatus(res, { code: 400, message: (error as Status).message });
  }
}
export function checkAdmin(this: AppConfig, req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const containsAdmin = admin(req, this);

    // Checks if request contains admin address
    if (containsAdmin) next();
    else setStatus(res, { code: 401, message: 'Invalid admin MAC address' });
  } catch (error) {
    setStatus(res, error as Status);
  }
}
export function checkToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers['token']) {
    next();
  } else {
    setStatus(res, { code: 400, message: 'No token provided' });
  }
}
