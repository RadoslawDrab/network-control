import express from 'express';
import crypto from 'crypto-js';

import { getAddresses } from 'utils/index';
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

type BaseCheckThis = {
  values: string[];
  any?: boolean;
  all?: boolean;
  errorMessage?: string;
  func?: (keys: Record<string, any>, values: string[]) => boolean;
};

function check<This extends BaseCheckThis>(
  this: This & { obj: keyof express.Request },
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (typeof this.obj !== 'object') return next();

  const keys = Object.keys(req[this.obj]);
  if (
    this.func
      ? this.func(keys, this.values)
      : this.any && !this.all
      ? keys.some((k) => this.values?.includes(k) ?? false)
      : keys.every((k) => this.values?.includes(k) ?? false)
  ) {
    next();
  } else {
    if (this.errorMessage) setStatus(res, { code: 400, message: this.errorMessage });
    else setStatus(res, 400);
  }
}

export function checkHeaders(
  this: BaseCheckThis,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  return check.call({ obj: 'headers', ...this }, req, res, next);
}
export function checkBody(
  this: BaseCheckThis,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  return check.call({ obj: 'body', ...this }, req, res, next);
}
export function checkTokenValidity(
  this: AppConfig,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = req.headers['token'] as string;
  if (!token) return setStatus(res, { code: 400, message: 'No token provided' });

  const adminPassword = this.get().adminPassword;
  if (!adminPassword) return setStatus(res, { code: 400, message: 'No admin password set' });
  const decryptedToken = crypto.AES.decrypt(token, adminPassword).toString(crypto.enc.Utf8);
  if (Date.now() <= Number(decryptedToken)) {
    return next();
  } else {
    return setStatus(res, { code: 401, message: 'Token is invalid' });
  }
}
