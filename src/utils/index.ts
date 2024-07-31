import { Request } from 'express';

import { getStatus } from './server';

export function standarizeAddresses(
  addresses: string[],
  filterCallback?: (value: string, index: number, array: string[]) => boolean
): string[] {
  return addresses
    .map((addr) => addr.replace(/\W/g, '').toUpperCase())
    .filter((value, index, array) => (filterCallback ? filterCallback(value, index, array) : true));
}
export function getAddresses(req: Request) {
  const address = req.headers['mac_address'];
  const errorStatus = getStatus(400, 'MAC address is required');

  if (!address) throw errorStatus;
  const macRegEx = new RegExp(/[0-9A-FX]{12}/i);
  const macFilter = (addr: string) => !!addr.match(macRegEx);

  const addresses = (Array.isArray(address) ? address : [...address.replace(/ /g, '').split(',')]).map((addr) =>
    addr.replace(/\W/g, '').toUpperCase()
  );

  if (addresses.length === 0) throw errorStatus;
  if (!addresses.find(macFilter)) throw getStatus(400, 'No valid MAC address');
  return addresses.filter(macFilter);
}
