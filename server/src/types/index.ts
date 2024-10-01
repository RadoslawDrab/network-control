import { Config } from 'utils/class';

export type ConfigType = { [key: string]: string | boolean | number | object | null; appName: string };
export const settings: SettingsKey[] = ['devices'] as const;
export type SettingsKey = keyof Settings;

export type AdminSettings = {
  /** Time in seconds to show reminder */
  reminderTime: number;
  /** Duration in seconds for which password will be kept */
  adminPasswordCacheTime: number;
  deviceTimeout: number;
};

export interface Settings extends ConfigType, AdminSettings {
  devices: Device[];
  adminPassword: string;
  /** Time in miliseconds after which info will be closed */
  showTimeInfoTill: number;
  /** Time in seconds to keep info after reminder */
  showTimeInfoDuration: number;
}

export type AppConfig = Config<Settings>;
export type Device = {
  address: string;
  lockAfter: number;
  position: [number, number];
  name: string;
  shortName?: string;
  lastOnline: number;
  showTime: number;
  restartTime: number;
  shutdownTime: number;
};

// export type AdminSettings = Exclude<Settings, 'devices' | 'adminPassword'>;
