import express from 'express';
import { AppConfig } from 'types/index';

import { checkAddressesValidity, standarizeAddresses } from 'utils/index';
import { setStatus } from 'utils/server';
import { checkTokenValidity } from 'middleware';

export default (config: AppConfig) => {
  const router = express.Router();
  router.get('/:address', (req, res) => {
    // Addresses from param
    const address = standarizeAddresses([req.params.address])[0];

    if (!checkAddressesValidity(address)[0]) return setStatus(res, { code: 400, message: 'Invalid MAC address' });
    const currentTime = Date.now();

    // Addresses saved in file
    const savedAddresses = config.get().addresses ?? [];
    // Same addresses from param and file
    const filteredAddresses = savedAddresses.filter((savedAddress) => savedAddress.address === address);

    if (filteredAddresses.length === 0) return setStatus(res, { code: 404, message: 'MAC address not found' });

    // Lock times from all addresses
    const lockTimes = filteredAddresses.map((addr) => addr.lockAfter).filter((time) => time && time > 0) as number[];

    // Longest lock time
    const lockTime = Math.max(...lockTimes);
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
      timeInfo: (!isLocked && remindAfter && !endRemind) || showTimeInfo,
    });
  });
  router
    .use(checkTokenValidity.bind(config))
    .post('/', (req, res) => {
      const currentTime = Date.now();
      config.set({ showTimeInfoTill: currentTime + (config.get().showTimeInfoDuration ?? 1) * 1000 });
      setStatus(res, { code: 200, message: 'Time info set' });
    })
    .post('/:address', (req, res) => {
      const currentTime = Date.now();

      const { hours, minutes, seconds, time: t } = req.body as Record<string, number | undefined>;
      const address = standarizeAddresses([req.params.address ?? ''])[0] as string | undefined;

      if (!address) return setStatus(res, { code: 400, message: 'Target not specified' });

      // Admin addresses from file
      const adminAddresses = config.get().adminAddresses ?? [];

      // Checks if user wants to add time to admin address
      if (adminAddresses.includes(address)) return setStatus(res, 400);

      // Gets time from hours, minutes and seconds combined unless `time` variable is present
      const time = t ?? (hours ?? 0) * 60 * 60 * 1000 + (minutes ?? 0) * 60 * 1000 + (seconds ?? 0) * 1000;

      // Checks if time is correct number
      if (typeof Number(time) !== 'number' || isNaN(Number(time))) {
        return setStatus(res, { code: 400, message: 'Bad time' });
      }

      // Addresses saved on server
      const savedAddresses = config.get().addresses ?? [];
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

      const currentlockAfter =
        savedAddresses.find((savedAddress) => address === savedAddress.address)?.lockAfter ?? currentTime;

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
        addresses: [
          // Filters out addresses present in header
          ...savedAddresses.filter((savedAddress) => address !== savedAddress.address),
          { address, lockAfter },
        ],
      });

      setStatus(res, { code: 201, message: `${changeTime < 0 ? 'Removed' : addTime ? 'Added' : 'Changed'} time` });
    });

  return router;
};
