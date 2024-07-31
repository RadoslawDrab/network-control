import { Request } from 'express';

import { getStatus } from './server';
import { AppConfig } from 'types';

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

  const addresses = standarizeAddresses(Array.isArray(address) ? address : [...address.replace(/ /g, '').split(',')]);

  if (addresses.length === 0) throw errorStatus;

  const [isValid, macFilter] = checkAddressesValidity(addresses);

  if (!isValid) throw getStatus(400, 'No valid MAC address');
  return addresses.filter(macFilter);
}
export function checkAdmin(req: Request, config: AppConfig) {
  const addresses = getAddresses(req);
  const { adminAddresses } = config.get();

  if (!adminAddresses || adminAddresses.length === 0) throw getStatus(401);

  return addresses.filter((addr) => adminAddresses.includes(addr)).length > 0;
}
export function checkAddressesValidity(addresses: string | string[]): [boolean, (address: string) => boolean] {
  const macRegEx = new RegExp(/[0-9A-FX]{12}/i);
  const macFilter = (addr: string) => !!addr.match(macRegEx);
  const addr = Array.isArray(addresses) ? addresses : [addresses];

  return [!!addr.find(macFilter), macFilter];
}
