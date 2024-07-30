import express from 'express';
import { AppConfig } from 'types/index';

import { getAddresses } from 'utils/index';
import { setStatus } from 'utils/server';

export default (config: AppConfig) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const addresses = getAddresses(req);
    const currentTime = Date.now();

    const savedAddresses = config.get().addresses ?? [];

    const lockTimes = savedAddresses
      .filter((savedAddress) => addresses.find((addr) => addr === savedAddress.address))
      .map((addr) => addr.lockAfter)
      .filter((time) => time && time > 0) as number[];

    const lockTime = Math.max(...lockTimes);

    res.status(200).json({
      lockAfter: lockTime,
      isLocked: currentTime >= lockTime,
      requestTime: currentTime,
      remainingSeconds: Math.round((lockTime - currentTime) / 1000),
    });
  });
  router.post('/', (req, res) => {
    const addresses = getAddresses(req);
    const currentTime = Date.now();

    const { hours, minutes, seconds, time: t } = req.body as Record<string, number | undefined>;
    const time = t ?? (hours ?? 0) * 60 * 60 * 1000 + (minutes ?? 0) * 60 * 1000 + (seconds ?? 0) * 1000;

    // const time: number | undefined = req.body.time;

    if (!time) return setStatus(res, { code: 400, message: 'Time not set' });
    if (typeof Number(time) !== 'number' || isNaN(Number(time))) {
      return setStatus(res, { code: 400, message: 'Bad time' });
    }

    const savedAddresses = config.get().addresses ?? [];
    const changeTime = Number(time);
    const plusRegEx = new RegExp(/^\+\d*/);
    const addTime =
      !!hours?.toString().match(plusRegEx) ||
      !!minutes?.toString().match(plusRegEx) ||
      !!seconds?.toString().match(plusRegEx) ||
      !!time.toString().match(plusRegEx);

    const newAddresses = addresses.map((addr) => {
      const lockAfter = savedAddresses.find((savedAddress) => addr === savedAddress.address)?.lockAfter ?? currentTime;
      if (changeTime === 0) return { address: addr, lockAfter: currentTime };
      return {
        address: addr,
        lockAfter:
          changeTime > 0
            ? addTime
              ? Math.max(lockAfter, currentTime) + changeTime
              : currentTime + changeTime
            : lockAfter + changeTime,
      };
    });
    config.set({
      addresses: [
        ...savedAddresses.filter((savedAddress) => !addresses.find((addr) => addr === savedAddress.address)),
        ...newAddresses,
      ],
    });

    setStatus(res, { code: 200, message: `${changeTime < 0 ? 'Removed' : addTime ? 'Added' : 'Changed'} time` });
  });

  return router;
};
