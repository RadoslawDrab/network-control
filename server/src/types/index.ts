import { Config } from 'utils/class';

export type ConfigType = { [key: string]: string | boolean | number | object | null; appName: string };
export const settings: SettingsKey[] = ['addresses'] as const;
export type SettingsKey = keyof Settings;

export interface Settings extends ConfigType {
  addresses: { address: string; lockAfter?: number }[];
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
