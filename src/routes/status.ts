import express from 'express';
import { AppConfig } from 'types/index';

import { getAddresses } from 'utils/index';
import { setStatus } from 'utils/server';

export default (config: AppConfig) => {
  const router = express.Router();
  router
    .route('/status')
    .get((req, res) => {
      const addresses = getAddresses(req);
      const currentTime = Date.now();

      const savedAddresses = config.get().addresses ?? [];
      const filteredAddresses = savedAddresses.filter((savedAddress) =>
        addresses.find((addr) => addr === savedAddress.address)
      );

      if (filteredAddresses.length === 0) return setStatus(res, { code: 404, message: 'MAC address not found' });

      const lockTimes = filteredAddresses.map((addr) => addr.lockAfter).filter((time) => time && time > 0) as number[];

      const lockTime = Math.max(...lockTimes);

      res.status(200).json({
        lockAfter: lockTime,
        isLocked: currentTime >= lockTime,
        requestTime: currentTime,
        remainingSeconds: Math.max(Math.round((lockTime - currentTime) / 1000), 0),
      });
    })
    .post((req, res) => {
      const addresses = getAddresses(req);
      const currentTime = Date.now();

      const { hours, minutes, seconds, time: t } = req.body as Record<string, number | undefined>;
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

      const newAddresses = addresses.map((addr) => {
        const lockAfter =
          savedAddresses.find((savedAddress) => addr === savedAddress.address)?.lockAfter ?? currentTime;
        // Changes lock to current time if `time` is 0
        if (changeTime === 0) return { address: addr, lockAfter: currentTime };
        return {
          address: addr,
          lockAfter:
            changeTime > 0
              ? // Checks if user wants to add time to lock time or change it
                addTime
                ? // Adds to current time
                  Math.max(lockAfter, currentTime) + changeTime
                : // Changes `lockAfter`
                  currentTime + changeTime
              : // Removes time
                lockAfter + changeTime,
        };
      });
      config.set({
        addresses: [
          // Filters out addresses present in header
          ...savedAddresses.filter((savedAddress) => !addresses.find((addr) => addr === savedAddress.address)),
          ...newAddresses,
        ],
      });

      setStatus(res, { code: 200, message: `${changeTime < 0 ? 'Removed' : addTime ? 'Added' : 'Changed'} time` });
    });

  return router;
};
