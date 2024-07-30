declare global {
  namespace NodeJS {
    interface ProcessEnv {
      _PORT: number;
      _ENC_KEY?: string;
    }
  }
}

export {};
