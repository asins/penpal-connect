import {
  ErrorCode,
  PenpalError,
  createPenpalError,
} from '@/PenpalError';

export const emptyFn = () => { };

/**
 * 在握手过程中，如果在握手完成之前超时，则启动超时并返回错误
 */
export function connectionTimeout(timeout: number | undefined, callback: ConnectTimeout): StopConnectTimeout {
  let timeoutId: number;

  if (timeout !== undefined) {
    timeoutId = window.setTimeout(() => {
      const error: PenpalError = createPenpalError(
        ErrorCode.ConnectionTimeout,
        `握手连接超时(${timeout}ms)`,
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


export function getOriginFromUrl(urlString: string) {
  const regex = /^((https?:)?\/\/[^/]+)(\/|$)/i;
  const match = regex.exec(urlString);
  if (match && match[1]) {
    return match[1]; // 返回协议、域名和端口
  }
  return null;
}

/** 创建一个Promise对象 */
export function defer<R, E = Error>() {
  const deferred = {} as Deferred<R, E>;
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

export type Deferred<R, E = Error> = {
  promise: Promise<R>;
  resolve: (value: R) => void;
  reject: (err: E) => void;
  // timer: Timer | undefined;
}

export enum MessageType {
  /** 握手过程：子页面建立连接请求 */
  Syn = 'syn',
  SynAck = 'syn-ack',
  Ack = 'ack',

  /** 发起请求来调用远程方法 */
  Call = 'call',
  /** 回复远程调用 */
  Reply = 'reply',
}

export const enum Resolution {
  Fulfilled = 1,
  Rejected,
}