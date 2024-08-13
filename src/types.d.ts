import { MessageType, Resolution } from "./option";

export type CallSenderAsyncCallback = (...args: any) => Promise<unknown>;

/**
 * 供对方调用的方法
 */
export type CallSender = {
  [index: string]: CallSenderAsyncCallback;
};


export type Logger = (...message: any[]) => void;

  /** 接收消息的处理器 */
export type MessageHandler = (messageData: MessageEvent) => void;
export type TargetWindow = {
  postMessage: (data: PenpalMessage, origin: string) => void;
  onMessage: (handle: MessageHandler) => void;
  onDestroy?: () => void;
}

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
  penpal: MessageType.Syn | MessageType.SynAck | MessageType.Ack;
  methodNames?: string[];
};

export type PenpalMessage = CallMessage | ReplyMessage | HandshakeMessage;


/**
 * Extract keys of T whose values are assignable to U.
 */
type ExtractKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never;
}[keyof T];

/**
 *一个映射类型，用于递归地将非异步方法转换为异步方法，并从T中排除任何非函数属性。
 */
export type AsyncMethodReturns<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in ExtractKeys<T, Function | object>]: T[K] extends (...args: any) => PromiseLike<any>
    ? T[K]
    : T[K] extends (...args: infer A) => infer R
      ? (...args: A) => Promise<R>
      : AsyncMethodReturns<T[K]>;
};
