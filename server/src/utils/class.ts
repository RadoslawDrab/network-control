import * as fs from 'fs';
import crypto from 'crypto-js';
import * as path from 'path';

import { ConfigType } from 'types/index';

export type MaybePartial<T> = T | Partial<T>;

export class Config<T extends ConfigType> {
  name: string;
  restartRequired: boolean;
  private fileName: string;
  path: string;
  private dir: string;
  private key: string | null;
  private defaultData: MaybePartial<T>;
  constructor(fileName: string, data: MaybePartial<T>, key: string | null = null, configPath: string | null = null) {
    const isProduction = process.env.NODE_ENV === 'production';

    this.name = fileName.replace(/\..*$/, '');
    this.fileName = this.name + '.conf';
    this.dir = configPath || path.resolve(isProduction ? './' : './node_modules/.temp');
    this.path = path.resolve(this.dir, this.fileName);
    this.key = key;
    this.restartRequired = false;

    if (!this.configExists()) {
      this.defaultData = data;
      this.writeFile({ appName: this.name, ...data });
      this.restartRequired = false;
    } else {
      this.defaultData = this.decrypt();
    }
  }
  get(): MaybePartial<T>;
  get(prop: keyof T): string | null;
  get(prop: (keyof T)[]): (string | null)[];
  get(prop?: (keyof T)[] | keyof T): string | null | (string | null)[] | MaybePartial<T> {
    const data = this.decrypt();
    if (prop) {
      if (Array.isArray(prop)) {
        return prop.map((p) => data[p]?.toString() ?? null);
      } else return data[prop]?.toString() ?? null;
    } else return data;
  }
  set(data: MaybePartial<T> | ((data: MaybePartial<T>) => MaybePartial<T>), restartRequired: boolean = false) {
    const currentData = this.decrypt();
    if (currentData) {
      const newData = (() => {
        switch (typeof data) {
          case 'function':
            return data(currentData);
          case 'object':
            return { ...currentData, ...data };
        }
      })();

      this.writeFile(newData, restartRequired);
    }
  }
  reset(): void {
    this.writeFile(this.defaultData);
  }
  configExists(): boolean {
    try {
      fs.readFileSync(this.path).toString();
      return true;
    } catch (error) {
      return false;
    }
  }
  private writeFile(data: MaybePartial<T>, restartRequired: boolean = false) {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
    fs.writeFile(
      this.path,
      this.encrypt(data),
      {
        encoding: 'utf8',
      },
      (error) => {
        if (error) console.log('Error: ', error.message);
        if (restartRequired) this.restartRequired = true;
        this.decrypt();
      }
    );
  }
  private encrypt(data: MaybePartial<T>): string {
    if (!this.key) return JSON.stringify(data);
    return crypto.AES.encrypt(JSON.stringify(data), this.key).toString();
  }
  private decrypt(): MaybePartial<T> {
    if (this.configExists()) {
      try {
        const str = fs.readFileSync(this.path).toString();
        if (!this.key) return str ? JSON.parse(str) : {}

        return str ? (JSON.parse(crypto.AES.decrypt(str, this.key).toString(crypto.enc.Utf8)) as T) : {};
      } catch (error) {
        return this.defaultData;
      }
    } else return this.defaultData;
  }
}
