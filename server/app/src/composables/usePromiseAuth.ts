import { onMounted, ref } from 'vue';

import { promise } from 'utils/server';
import useToken from './useToken';

type PromiseFunc<T> = typeof promise<T>;
type PromiseFuncParameters<T> = Parameters<PromiseFunc<T>>;
type PromiseFuncReturn<T> = ReturnType<PromiseFunc<T>>;
export type Auth<T> = ReturnType<typeof usePromiseAuth<T>>;

const usePromiseAuth = <T = any>(
  options: {
    onInit?: (value: T) => Promise<void> | void;
    onPromise?: (value: T) => Promise<void> | void;
    params?: PromiseFuncParameters<T>;
    initCondition?: boolean;
    checkAuth?: boolean;
  } = { initCondition: true, checkAuth: true }
) => {
  const checkAuth = options?.checkAuth ?? true;
  const token = useToken();
  const value = ref<T>(null);

  const func = async <Type extends T>(...params: PromiseFuncParameters<Type>): Promise<PromiseFuncReturn<Type>> => {
    const [path, query, init, baseUrl] = params;
    if (checkAuth) {
      if (!token.currentToken) {
        throw { code: 400, message: 'Token not provided' };
      }
      if (!(await token.check(true))) {
        token.removeToken();
        throw { code: 400, message: 'Token is invalid' };
      }
    }

    try {
      const value = await promise<Type>(
        path,
        query,
        { ...init, headers: { ...init?.headers, token: checkAuth ? token.currentToken : undefined } },
        baseUrl
      );

      if (options && options.onPromise) {
        await options.onPromise(value);
      }
      return value;
    } catch (error) {
      throw error;
    }
  };
  async function get() {
    if (options && options.params && options.onPromise) {
      return await func(...options.params);
    }
  }
  onMounted(async () => {
    if (options && options.onInit) {
      if (options.initCondition === false) return;
      const v = await func(...options.params);
      await options.onInit(v);
      value.value = v;
    }
  });
  return { promise: func, value, get };
};

export default usePromiseAuth;
