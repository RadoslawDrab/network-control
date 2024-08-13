import { onMounted, ref } from 'vue';

import { promise } from 'utils/server';
import useToken from './useToken';

type PromiseFunc<T> = typeof promise<T>;
type PromiseFuncParameters<T> = Parameters<PromiseFunc<T>>;
const usePromiseAuth = <T>(options: {
  onInit?: (value: T) => Promise<void> | void;
  onPromise?: (value: T) => Promise<void | T> | void | T;
  params: PromiseFuncParameters<T>;
  initCondition?: boolean;
}) => {
  const token = useToken();
  const value = ref<T>(null);

  const func: PromiseFunc<T> = async (path, query, init, baseUrl) => {
    if (!(await token.check(true))) {
      throw { code: 400, message: 'Token is invalid' };
    }

    if (!token.currentToken) {
      throw { code: 400, message: 'Token not provided' };
    }
    const value = await promise<T>(
      path,
      query,
      { ...init, headers: { ...init?.headers, token: token.currentToken } },
      baseUrl
    );

    if (options && options.onPromise) {
      const newValue = await options.onPromise(value);
      if (newValue) return newValue;
    }
    return value;
  };
  onMounted(async () => {
    if (options && options.onInit) {
      if (options.initCondition === false) return;
      const v = await func(...options.params);
      await options.onInit(v);
      value.value = v;
    }
  });
  return { promise: func, value };
};
export default usePromiseAuth;
