declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
      _HOSTNAME: string;
      _PORT: number;
      _ENC_KEY: string;
      _ADMIN_PASSWORD: string;
      _SECURE: boolean;
      _LOGS_PATH: string;
    }
  }
}

export {};
