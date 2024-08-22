import { onMounted, onUnmounted, ref } from 'vue';

import { promise } from 'utils/server';

import { Device } from 'types/index';

const useDeviceStatus = (
  address?: string | null,
  options: {
    statusInterval?: number;
    startOnMounted?: boolean;
    onMounted?: () => Promise<Device[]> | Device[];
    filter?: (address: string, isLocked: boolean, isOnline: boolean) => boolean | void;
  } = { statusInterval: 3000, startOnMounted: true }
) => {
  const interval = ref<NodeJS.Timeout>();
  const devices = ref<Device[]>([]);

  async function get() {
    try {
      const { locks, online } = await promise<{
        locks: { address: string; isLocked: boolean }[];
        online: { address: string; isOnline: boolean }[];
      }>('/status');

      if (devices.value.length > 0) {
        const value = devices.value
          .filter((cell) => (address ? cell.address === address : true))
          .filter((cell) => {
            if (options?.filter) {
              const findHandler = (c: { address: string }) => c.address === cell.address;
              const lock = locks.find(findHandler);
              const onlineDevice = online.find(findHandler);

              const ret = options.filter(cell.address, lock?.isLocked ?? true, onlineDevice?.isOnline ?? true);
              return typeof ret === 'boolean' ? ret : true;
            }
          });
        devices.value = value;
      }
      return { locks, online };
    } catch (error) {
      throw error;
    }
  }
  function startInterval(time: number = options.statusInterval) {
    if (time <= 0) return;
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
    devices.value = await options.onMounted();

    if (options.startOnMounted) {
      startInterval();
    }
  });
  onUnmounted(stopInterval);

  return { devices, get, startInterval, stopInterval };
};
export default useDeviceStatus;
