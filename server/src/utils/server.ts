import { Response } from 'express';
import { GenericStatus, Status } from 'types/server';

export function setStatus(res: Response, status: number): void;
export function setStatus(res: Response, status: Status): void;
export function setStatus(res: Response, status: Status | number): void {
  const customStatus: GenericStatus = typeof status === 'number' ? { code: status } : status;
  const st = getStatus(customStatus.code, customStatus.message);
  res.status(st.code).json(st);
}

export function getStatus(code: number, message?: string): Status {
  if (!message) {
    let msg;
    switch (code) {
      case 200:
        msg = 'Ok';
        break;
      case 201:
        msg = 'Created';
        break;
      case 202:
        msg = 'Accepted';
        break;
      case 204:
        msg = 'No Content';
        break;
      case 300:
        msg = 'Multiple Choices';
        break;
      case 301:
        msg = 'Moved Permanently';
        break;
      case 302:
        msg = 'Found';
        break;
      case 304:
        msg = 'Not Modified';
        break;
      case 400:
        msg = 'Bad Request';
        break;
      case 401:
        msg = 'Unauthorized';
        break;
      case 402:
        msg = 'Payment Required';
        break;
      case 403:
        msg = 'Forbidden';
        break;
      case 404:
        msg = 'Not Found';
        break;
      case 405:
        msg = 'Method Not Allowed';
        break;
      case 406:
        msg = 'Not Acceptable';
        break;
      case 408:
        msg = 'Request Timeout';
        break;
      case 500:
        msg = 'Internal Server Error';
        break;
      case 501:
        msg = 'Not Implemented';
        break;
      case 502:
        msg = 'Bad Gateway';
        break;
      case 503:
        msg = 'Service Unavailable';
        break;
      case 504:
        msg = 'Gateway Timeout';
        break;

      default:
        msg = 'Error';
        break;
    }
    return { code, message: msg };
  } else return { code, message };
}
