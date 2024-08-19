import { Config } from 'utils/class';

export type ConfigType = { [key: string]: string | boolean | number | object | null; appName: string };
export const settings: SettingsKey[] = ['devices'] as const;
export type SettingsKey = keyof Settings;

export interface Settings extends ConfigType {
  devices: Device[];
  /** Time in miliseconds after which info will be closed */
  showTimeInfoTill: number;
  /** Time in seconds to keep info after reminder */
  showTimeInfoDuration: number;
  /** Time in seconds to show reminder */
  reminderTime: number;
  adminPassword: string;
  /** Duration for which password will be kept */
  adminPasswordCacheTime: number;
}
export type AppConfig = Config<Settings>;
export type Device = {
  address: string;
  lockAfter?: number;
  position: [number, number];
  name: string;
  shortName?: string;
};
