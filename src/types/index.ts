import { Config } from 'utils/class';

export type ConfigType = { [key: string]: string | boolean | number | object | null; appName: string };
export const settings: SettingsKey[] = ['addresses'] as const;
export type SettingsKey = keyof Settings;

export interface Settings extends ConfigType {
  addresses: { address: string; lockAfter?: number }[];
  adminAddresses: string[];
}
export type AppConfig = Config<Settings>;
