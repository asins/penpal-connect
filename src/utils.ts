import { ErrorCode, PenpalError, createPenpalError } from '@/modules/PenpalError';

/**
 * Starts a timeout and calls the callback with an error
 * if the timeout completes before the stop function is called.
 */
export function startTimeout(timeout: number | undefined, callback: ConnectTimeout): StopConnectTimeout {
  let timeoutId: number;

  if (timeout !== undefined) {
    timeoutId = window.setTimeout(() => {
      const error: PenpalError = createPenpalError(
        ErrorCode.ConnectionTimeout,
        `Connection timed out after ${timeout}ms`,
      );
      callback(error);
    }, timeout);
  }

  return () => {
    clearTimeout(timeoutId);
  };
}

export type StopConnectTimeout = () => void;
export type ConnectTimeout = (err: PenpalError) => void;

/**
 * 检测远程消息来源是否与本地相同
 */
export function checkMessageOrigin(remoteOrigin: string, localOrigin: string): boolean {
  return localOrigin === '*' || remoteOrigin === localOrigin;
}