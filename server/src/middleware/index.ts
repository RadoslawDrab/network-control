import express from 'express';
import crypto from 'crypto-js';

import { getAddresses } from 'utils/index';
import { setStatus } from 'utils/server';
import { origin, PRODUCTION } from 'index';

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
  values: string[] | ((req: express.Request) => string[]);
  any?: boolean | ((req: express.Request) => boolean);
  all?: boolean | ((req: express.Request) => boolean);
  errorMessage?: string;
  func?: (keys: Record<string, any>, values: string[]) => boolean;
};

function check<This extends BaseCheckThis>(
  this: This & { obj: keyof express.Request },
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (typeof req[this.obj] !== 'object') return next();

  const obj = req[this.obj];
  const keys = Object.keys(obj);
  const any = this.any ? (typeof this.any === 'boolean' ? this.any : this.any(req)) : undefined;
  const all = this.all ? (typeof this.all === 'boolean' ? this.all : this.all(req)) : undefined;
  const values = typeof this.values === 'object' ? this.values : this.values(req);

  if (
    this.func
      ? this.func(keys, values)
      : (any && !all) ?? true
      ? values.some((k) => (keys.includes(k) && obj[k] !== undefined) ?? false)
      : values.every((k) => (keys.includes(k) && obj[k] !== undefined) ?? false)
  ) {
    next();
  } else {
    if (this.errorMessage) setStatus(res, { code: 400, message: this.errorMessage });
    else
      setStatus(res, {
        code: 400,
        message: `'${this.obj.toString()}' has to include ${this.all && !this.any ? 'all' : 'any'} of this props: ${
          this.values
        }`,
      });
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
  const token = req.headers['token'] as string | undefined;
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
export function checkOrigin(this: boolean, req: express.Request, res: express.Response, next: express.NextFunction) {
  const requestOrigin = PRODUCTION ? req.headers.host : req.headers.origin;
  const isOrigin = origin.some((o) => requestOrigin && o.includes(requestOrigin));

  if (this === true) return isOrigin;

  if (isOrigin) {
    next();
  } else {
    return setStatus(res, { code: 401, message: 'Invalid origin' });
  }
}
