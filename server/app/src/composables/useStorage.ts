import { onMounted } from 'vue';
import crypto from 'crypto-js';

const useStorage = <T extends object>(defaultData: T, storageKey: string = 'storage', encKey?: string) => {
  function get(): T | null {
    const item = localStorage.getItem(storageKey);
    if (item) {
      const decrypted = crypto.AES.decrypt(item, encKey ?? storageKey).toString(crypto.enc.Utf8);
      return JSON.parse(decrypted ?? '{}');
    } else {
      return null;
    }
  }
  function set(data: Partial<T>) {
    const previousData = get();
    const encrypted = crypto.AES.encrypt(JSON.stringify({ ...previousData, ...data }), encKey ?? storageKey).toString();
    localStorage.setItem(storageKey, encrypted);
  }

  onMounted(() => {
    const data = get();
    set(data ?? defaultData);
  });
  return { get, set };
};
export default useStorage;
