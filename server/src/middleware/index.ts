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

type BaseCheckThis<T extends string> = {
  values: T[] | ((req: express.Request) => T[]);
  any?: boolean | ((req: express.Request) => boolean);
  all?: boolean | ((req: express.Request) => boolean);
  errorMessage?: string;
  disableErrorMessage?: boolean;
  func?: (keys: Record<string, any>, values: string[]) => boolean;
};
interface This<T extends string> extends BaseCheckThis<T> {
  obj: keyof express.Request;
}

function check<T extends string, Value = any>(
  this: This<T>,
  req: express.Request,
  res: express.Response,
  next?: express.NextFunction
): [boolean, Partial<Record<T, Value>> | null] {
  if (typeof req[this.obj] !== 'object') {
    next && next();
    return [true, null];
  }

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
    if (next) next();
    return [true, obj];
  } else {
    if (!this.disableErrorMessage) {
      if (this.errorMessage) setStatus(res, { code: 400, message: this.errorMessage });
      else
        setStatus(res, {
          code: 400,
          message: `'${this.obj.toString()}' has to include ${this.all && !this.any ? 'all' : 'any'} of this props: ${
            this.values
          }`,
        });
    }
    return [false, null];
  }
}

type CheckFuncParams<T extends string, Value = any> = Parameters<typeof check<T, Value>>;
export type CheckCall<T extends string, Value = any> = [
  BaseCheckThis<T>,
  CheckFuncParams<T, Value>,
  [boolean, Partial<Record<T, Value>> | null]
];
export function checkHeaders<T extends string, Value = any>(
  this: BaseCheckThis<T>,
  req: express.Request,
  res: express.Response,
  next?: express.NextFunction
) {
  type Call = CheckCall<T, Value>;
  return check.call<This<T>, Call[1], Call[2]>({ obj: 'headers', ...this }, req, res, next);
}
export function checkBody<T extends string, Value = any>(
  this: BaseCheckThis<T>,
  req: express.Request,
  res: express.Response,
  next?: express.NextFunction
) {
  type Call = CheckCall<T, Value>;
  return check.call<This<T>, Call[1], Call[2]>({ obj: 'body', ...this }, req, res, next);
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
  const requestOrigin = PRODUCTION ? req.ip : req.headers.origin;
  const isOrigin = origin.some((o) => requestOrigin && o.includes(requestOrigin));

  if (this) return isOrigin;

  if (isOrigin) {
    next();
  } else {
    return setStatus(res, { code: 401, message: 'Invalid origin' });
  }
}
