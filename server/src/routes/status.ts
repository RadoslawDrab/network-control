import express from 'express';
import { AppConfig } from 'types/index';

import { checkAddressesValidity, keys, standarizeAddresses } from 'utils/index';
import { setStatus } from 'utils/server';
import { checkBody, CheckCall, checkOrigin } from 'middleware';

export default (config: AppConfig, app: express.Express) => {
  const router = express.Router();
  router.get('/:address', (req, res) => {
    // Addresses from param
    const address = standarizeAddresses([req.params.address])[0];

    if (!checkAddressesValidity(address)[0]) return setStatus(res, { code: 400, message: 'Invalid MAC address' });
    const currentTime = Date.now();

    // Addresses saved in file
    const savedDevices = config.get().devices ?? [];
    // Same addresses from param and file
    const savedDevice = savedDevices.find((savedDevice) => savedDevice.address === address);

    if (!savedDevice) return setStatus(res, { code: 404, message: 'Device not found' });

    // Longest lock time
    const lockTime = savedDevice.lockAfter;
    const remainingSeconds = Math.max(Math.round((lockTime - currentTime) / 1000), 0);
    const isLocked = currentTime >= lockTime;
    const showTimeInfo =
      Math.max(Math.round(config.get().showTimeInfoTill ?? 0) - currentTime, 0) > 0 && remainingSeconds > 0;

    const remindAfter = remainingSeconds < (config.get().reminderTime ?? 5 * 60);
    const endRemind =
      remainingSeconds < (config.get().reminderTime ?? 5 * 60) - (config.get().showTimeInfoDuration ?? 10);

    res.status(200).json({
      lockAfter: lockTime,
      isLocked,
      requestTime: currentTime,
      remainingSeconds,
      timeInfo: (!isLocked && remindAfter && !endRemind) || showTimeInfo || currentTime < savedDevice.showTime,
      restart: currentTime < savedDevice.restartTime,
      shutdown: currentTime < savedDevice.shutdownTime,
    });

    config.set({
      devices: [
        ...savedDevices.filter((device) => device.address !== savedDevice.address),
        { ...savedDevice, lastOnline: currentTime },
      ],
    });
  });
  router
    .use(checkOrigin)
    .get('/', (req, res) => {
      const currentTime = Date.now();
      const devices = config.get()?.devices ?? [];
      const deviceTimeout = config.get()?.deviceTimeout ?? 30;

      const savedDevices = devices?.filter((device) => device.lockAfter && device.lockAfter > 0) ?? [];

      res.status(200).json({
        locks:
          savedDevices.map((device) => ({ address: device.address, isLocked: currentTime >= device.lockAfter })) ?? [],
        online: savedDevices.map((device) => ({
          address: device.address,
          isOnline: (currentTime - device.lastOnline) / 1000 < deviceTimeout,
        })),
      });
    })
    .post('/', (req, res) => {
      const currentTime = Date.now();
      config.set({ showTimeInfoTill: currentTime + (config.get().showTimeInfoDuration ?? 1) * 1000 });
      setStatus(res, { code: 200, message: 'Time info set' });
    })
    .post('/set/:address', (req, res) => {
      const currentTime = Date.now();
      const address = standarizeAddresses([req.params.address])[0];
      type Call = CheckCall<'time' | 'restart' | 'shutdown', boolean>;
      const [bodyValid, body] = checkBody.call<Call[0], Call[1], Call[2]>(
        { values: ['time', 'restart', 'shutdown'], any: true },
        req,
        res
      );
      if (!bodyValid || !body) return;

      const devices = config.get()?.devices ?? [];
      const device = devices.find((device) => device.address === address);

      if (!device) {
        return setStatus(res, { code: 404, message: 'Device not found' });
      }

      const values = keys<boolean, typeof body>(body, (key, value) => typeof value === 'boolean').reduce<
        Partial<Record<'showTime' | 'restartTime' | 'shutdownTime', number>>
      >((obj, { key, value }) => {
        const newTime = value ? currentTime + (config.get().showTimeInfoDuration ?? 1) * 1000 : 0;
        switch (key) {
          case 'restart':
            return { ...obj, restartTime: newTime };
          case 'time':
            return { ...obj, showTime: newTime };
          case 'shutdown':
            return { ...obj, shutdownTime: newTime };
        }
      }, {});

      config.set({ devices: [...devices.filter((d) => d.address !== device.address), { ...device, ...values }] });
      setStatus(res, { code: 200, message: 'Commands for device set' });
    })
    .use(
      checkBody.bind({
        values: ['time', 'hours', 'minutes', 'seconds'],
      })
    )
    .post('/:address', (req, res) => {
      const currentTime = Date.now();

      const { hours, minutes, seconds, time: t } = req.body as Record<string, number | undefined>;
      const address = standarizeAddresses([req.params.address ?? ''])[0] as string | undefined;

      if (!address) return setStatus(res, { code: 400, message: 'Target not specified' });

      // Gets time from hours, minutes and seconds combined unless `time` variable is present
      const time = t ?? (hours ?? 0) * 60 * 60 * 1000 + (minutes ?? 0) * 60 * 1000 + (seconds ?? 0) * 1000;

      // Checks if time is correct number
      if (typeof Number(time) !== 'number' || isNaN(Number(time))) {
        return setStatus(res, { code: 400, message: 'Bad time' });
      }

      // Addresses saved on server
      const savedDevices = config.get().devices ?? [];

      const currentDevice = savedDevices.find((savedDevice) => address === savedDevice.address);
      if (!currentDevice) {
        return setStatus(res, { code: 404, message: 'Device not found' });
      }

      // Time in number type
      const changeTime = Number(time);
      // Regex to check if `+` character is present
      const plusRegEx = new RegExp(/^\+\d*/);
      // Checks if any prop in body has plus
      const addTime =
        !!hours?.toString().match(plusRegEx) ||
        !!minutes?.toString().match(plusRegEx) ||
        !!seconds?.toString().match(plusRegEx) ||
        !!time.toString().match(plusRegEx);

      const currentlockAfter = currentDevice?.lockAfter ?? currentTime;

      const lockAfter = (() => {
        // Changes lock to current time if `time` is 0
        if (changeTime === 0) return currentTime;
        return changeTime > 0
          ? // Checks if user wants to add time to lock time or change it
            addTime
            ? // Adds to current time
              Math.max(currentlockAfter, currentTime) + changeTime
            : // Changes `lockAfter`
              currentTime + changeTime
          : // Removes time
            currentlockAfter + changeTime;
      })();

      config.set({
        devices: [
          // Filters out addresses present in header
          ...savedDevices.filter((savedDevice) => address !== savedDevice.address),
          { ...currentDevice, lockAfter },
        ],
      });

      setStatus(res, { code: 201, message: `${changeTime < 0 ? 'Removed' : addTime ? 'Added' : 'Changed'} time` });
    });

  return router;
};
