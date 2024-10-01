import { Request } from 'express';

import { getStatus } from './server';

export function standarizeAddresses(
  addresses: string[],
  filterCallback?: (value: string, index: number, array: string[]) => boolean
): string[] {
  return addresses
    .map((addr) => addr.replace(/\W/g, '').replace(/^0x/, '0').toUpperCase())
    .filter((value, index, array) => (filterCallback ? filterCallback(value, index, array) : true));
}
export function getAddresses(req: Request) {
  const address = req.headers['mac_address'];
  const errorStatus = getStatus(400, 'MAC address is required');

  if (!address) throw errorStatus;

  const addresses = standarizeAddresses(Array.isArray(address) ? address : [...address.replace(/ /g, '').split(',')]);

  if (addresses.length === 0) throw errorStatus;

  const [isValid, macFilter] = checkAddressesValidity(addresses);

  if (!isValid) throw getStatus(400, 'No valid MAC address');
  return addresses.filter(macFilter);
}
export function checkAddressesValidity(addresses: string | string[]): [boolean, (address: string) => boolean] {
  const macRegEx = new RegExp(/[0-9A-FX]{12}/i);
  const macFilter = (addr: string) => !!addr.match(macRegEx);
  const addr = Array.isArray(addresses) ? addresses : [addresses];

  return [!!addr.find(macFilter), macFilter];
}
export function getPosition(req: Request): [number, number] {
  const x = Number(req.body?.position?.at(0) ?? 0);
  const y = Number(req.body?.position?.at(1) ?? 0);
  return [x, y];
}
export function filterKeys<Value, Obj extends Record<string, Value>>(
  obj: Obj,
  func: (key: keyof Obj, value: Value, index: number) => void | boolean
): Obj {
  return Object.keys(obj)
    .filter((key, index) => {
      const value = obj[key];
      const ret = func(key, value, index);
      return typeof ret === 'boolean' ? ret : true;
    })
    .reduce((o, key) => ({ ...o, [key]: obj[key] }), {}) as Obj;
}
export function keys<Value, Obj extends Record<string, Value>>(
  obj: Obj,
  func?: (key: keyof Obj, value: Value, index: number) => void | boolean
): { key: keyof Obj; value: Value }[] {
  return Object.keys(obj)
    .filter((key, index) => {
      if (func) {
        const value = obj[key];
        const ret = func(key, value, index);
        return typeof ret === 'boolean' ? ret : true;
      }
      return true;
    })
    .map((key) => ({ key, value: obj[key] }));
}
