import { DestroyConnection } from '@/modules/createDestructor';

export enum MessageType {
  Call = 'call',
  Reply = 'reply',
  Syn = 'syn',
  SynAck = 'synAck',
  Ack = 'ack',
  Ping = 'ping',
  Pong = 'pong',
}

export enum Resolution {
  Fulfilled = 1,
  Rejected,
}

export enum NativeEventType {
  Message = 'message',
}

export enum ConnectType {
  PARENT = 'Parent',
  CHILD = 'Child',
}

export const PingPongTimer = 30 * 1000;

export const emptyFn = () => { };

/**
 * 供对方调用的方法
 */
export type CallSender = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [index: string]: Function;
};

/**
 * 调用方法的消息结构体
 */
export type CallMessage = {
  penpal: MessageType.Call;
  id: number;
  methodName: string;
  args: any[];
};

/**
 * 方法被调用后的响应消息结构体
 */
export type ReplyMessage = {
  penpal: MessageType.Reply;
  id: number;
  resolution: Resolution;
  returnValue: any;
  returnValueIsError?: boolean;
};

/**
 * 握手消息
 */
export type HandshakeMessage = {
  penpal: MessageType.Pong |
    MessageType.Ping |
    MessageType.Syn |
    MessageType.SynAck |
    MessageType.Ack;
  methodNames?: string[];
};

export type PenpalMessage = CallMessage | ReplyMessage | HandshakeMessage;

export type TargetMessageEvent = {
  data: PenpalMessage;
  origin: string;
  source?: TargetWindow;
  [key: string]: any;
};
export type MessageHandler = (event: TargetMessageEvent) => void;

export interface TargetWindow {
  postMessage: (data: PenpalMessage, originForSending: string) => void;
  addEventListener: (event: NativeEventType.Message, handler: MessageHandler) => void;
  removeEventListener: (event: NativeEventType.Message, handler: MessageHandler) => void;
  parent?: TargetWindow;
}
export type Logger = (...message: any[]) => void;


export type WindowsInfo = {
  /** 本地 target  */
  local: TargetWindow;
  /** 远程 target  */
  remote: TargetWindow;
  /** 应用于向远程窗口发送消息的Origin信息 */
  originForSending: string;
  /** 应用于向远程窗口发送消息的Origin信息 */
  originForReceiving: string;
};


/**
 * Extract keys of T whose values are assignable to U.
 */
type ExtractKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];

/**
 * A mapped type to recursively convert non async methods into async methods and exclude
 * any non function properties from T.
 */
export type AsyncMethodReturns<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in ExtractKeys<T, Function | object>]: T[K] extends (
    ...args: any
  ) => PromiseLike<any>
  ? T[K]
  : T[K] extends (...args: infer A) => infer R
  ? (...args: A) => Promise<R>
  : AsyncMethodReturns<T[K]>;
};


export type ConnectOptions = {
  /**
   * 应与之建立连接的目标
   */
  target: TargetWindow;
  /**
   * 供对方调用的方法
   */
  methods?: CallSender;
  /**
   * 等待父级响应的超时时间（以毫秒为单位），如果未指定，则一直等待。
   */
  timeout?: number;
  /**
   * 连接的两端的校验token
   */
  origin?: string;
  /**
   * 调试日志输出方法
   */
  log?: Logger;
};


export type Connection<TCallSender extends object = CallSender> = {
  /**
   * 与远程端建立连接的Promise
   */
  promise: Promise<AsyncMethodReturns<TCallSender>>;
  /**
   * 调用时将断开任何消息传递通道的方法。
   * 甚至可以在建立连接之前调用此连接。
   */
  destroy: DestroyConnection;
};