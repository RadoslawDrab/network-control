import { onMounted, onUnmounted, ref } from 'vue';

import { promise } from 'utils/server';

import { Address } from 'types/index';

const useDeviceStatus = (
  address?: string | null,
  options: {
    statusInterval?: number;
    startOnMounted?: boolean;
    onMounted?: () => Promise<Address[]> | Address[];
    filter?: (address: string, isLocked: boolean) => boolean | void;
  } = { statusInterval: 3000, startOnMounted: true }
) => {
  const interval = ref<NodeJS.Timeout>();
  const addresses = ref<Address[]>([]);

  async function get() {
    try {
      const { locks } = await promise<{ locks: { address: string; isLocked: boolean }[] }>('/status');

      if (addresses.value.length > 0) {
        const value = addresses.value
          .filter((cell) => (address ? cell.address === address : true))
          .filter((cell) => {
            if (options?.filter) {
              const lock = locks.find((l) => l.address === cell.address);
              const ret = options.filter(cell.address, lock.isLocked ?? true);
              return typeof ret === 'boolean' ? ret : true;
            }
          });
        addresses.value = value;
      }
      return locks;
    } catch (error) {
      throw error;
    }
  }
  function startInterval(time: number = options.statusInterval) {
    if (time === 0) return;
    clearInterval(interval.value);

    interval.value = setInterval(async () => {
      try {
        await get();
      } catch (error) {
        console.log(error);
      }
    }, time);
  }
  function stopInterval() {
    clearInterval(interval.value);
  }

  onMounted(async () => {
    addresses.value = await options.onMounted();

    if (options.startOnMounted) {
      startInterval();
    }
  });
  onUnmounted(stopInterval);

  return { addresses, get, startInterval, stopInterval };
};
export default useDeviceStatus;
