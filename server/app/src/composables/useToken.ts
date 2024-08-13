import { nextTick, onMounted, ref } from 'vue';

import { checkToken, getToken } from 'utils/login';
import useStorage from './useStorage';
import { defineStore } from 'pinia';

const useToken = defineStore('token', () => {
  const storage = useStorage<{ token: string | null }>({ token: null }, 'token');
  const token = ref<string | null>(storage.get()?.token ?? null);
  const password = ref<string | null>(null);
  const isLoggedIn = ref<boolean>(false);

  onMounted(async () => await check());

  function exists() {
    return token.value !== null;
  }
  async function get(): Promise<void> {
    try {
      if (!password.value) throw { code: 400, message: 'No password set' };
      const newToken = await getToken(password.value);
      token.value = newToken;
      storage.set({ token: newToken });
    } catch (error) {
      throw error;
    }
  }
  async function check(getFirst: boolean = false): Promise<boolean> {
    try {
      if (getFirst && !token.value) {
        await get();
        await nextTick();
      }
    } catch (error) {
      throw error;
    }

    try {
      if (token.value) {
        const check = await checkToken(token.value);
        isLoggedIn.value = check;
        return check;
      } else {
        isLoggedIn.value = false;
        return false;
      }
    } catch (error) {
      token.value = null;
      isLoggedIn.value = false;
      return false;
    }
  }
  function setPassword(value: string | null) {
    password.value = value;
    if (!value) {
      isLoggedIn.value = false;
      storage.set({ token: null });
    }
  }
  function logout() {
    setPassword(null);
  }
  return { get, check, setPassword, exists, isLoggedIn, logout, currentToken: token };
});
export default useToken;
