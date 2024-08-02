declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production';
      _HOSTNAME: string;
      _PORT: number;
      _ENC_KEY?: string;
    }
  }
}

export {};
