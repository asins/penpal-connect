import {
  MessageType,
  Resolution,
  connectionTimeout,
  defer,
  emptyFn,
} from "./option";
import {
  ErrorCode,
  PenpalError,
  createPenpalError,
  deserializeError
} from "./PenpalError";
import { createHandlerFactory } from "./createHandlerFactory";
import generateId from "./generateId";
import {
  CallMessage,
  CallSender,
  ConnectOptions,
  HandshakeMessage,
  PenpalMessage,
  ReplyMessage,
} from "./types";
import { isFunction } from "@theroyalwhee0/istype";

/**
 * 消息握手过程：
 *   父                子
 *    <----- SYN ---- 发起
 *   响应 -- SYN-ACK -->
 *    <----- ACK ---- 发送
 */

export function connectToChild<TCallSender extends CallSender>(
  option: ConnectOptions
) {
  const { target, methods = {}, log: zLog = emptyFn, origin = '*', timeout } = option
  let destroyed = false; // 是否已销毁

  const startTime = Date.now();
  const callSender = {} as TCallSender;
  const deferredChild = defer<CallSender>();
  const callSenderFactory = createHandlerFactory();

  // 发送数据
  const sendData = (data: PenpalMessage) => {
    if (destroyed) {
      zLog(`由于连接断开，无法发送数据: ${JSON.stringify(data)}`);
      return;
    }

    target.postMessage(data, origin);
  };

  // 销毁
  const destroy = () => {
    destroyed = true;
    if (isFunction(target.onDestroy)) {
      target.onDestroy();
    }
  };

  const stopConnectionTimeout = connectionTimeout(timeout, (err) => {
    destroyed = true;
    deferredChild.reject(err);
  });

  const handleSynMessage = () => {
    const synAckMessage: HandshakeMessage = {
      penpal: MessageType.SynAck,
      methodNames: Object.keys(methods),
    };
    zLog(`握手 - 收到SYN消息, 回应SYN-ACK消息: ${JSON.stringify(synAckMessage)}`);
    sendData(synAckMessage);
  }

  // 处理握手 Ack 消息
  const handleAckMessage = (data: HandshakeMessage) => {
    zLog(`握手 - 收到ACK消息: ${JSON.stringify(data)}`);
    const { methodNames } = data;
    destroyed = false;

    // 如果子窗口重新连接，需要从CallSender中删除上一个的CallReceiver方法。
    const receiverMethodNames = Object.keys(callSender);
    if (receiverMethodNames.length) {
      receiverMethodNames.forEach((receiverMethodName: string) => {
        delete callSender[receiverMethodName];
      });
    }
    callSenderFactory.destroy();

    const flattenedMethods = (methodNames || [])
      .reduce<Record<string, () => Promise<unknown>>>((api, name) => {
        api[name] = createMethodProxy(name);
        return api;
      }, {});
    Object.assign(callSender, flattenedMethods);

    const connectTimer = Date.now() - startTime;
    zLog(`握手 - 连接用时:${connectTimer}`);
    stopConnectionTimeout();
    deferredChild.resolve(callSender);
  };

  // 创建供远程调用的方法代理
  const createMethodProxy = (methodName: string) => {
    return (...args: any) => {
      if (destroyed) {
        const errMsg = `连接已中断，无法发送 ${methodName}() 调用消息`;
        throw createPenpalError(ErrorCode.ConnectionDestroyed, errMsg);
      }
      zLog(`开始发送 ${methodName}() 的调用消息`);

      const deferred = defer<any>();
      const callSenderId = generateId();
      callSenderFactory.onHandle(callSenderId, (data: ReplyMessage) => {
        const { penpal, id, resolution, returnValueIsError } = data;
        let returnVal = data.returnValue;
        if (penpal !== MessageType.Reply || id !== callSenderId) {
          return;
        }

        // 当前调用-回调已完成，删除回调
        callSenderFactory.del(callSenderId);

        if (returnValueIsError) {
          returnVal = deserializeError(returnVal);
        }

        (resolution === Resolution.Fulfilled ? deferred.resolve : deferred.reject)(
          returnVal,
        );
      });

      const CallMessage: CallMessage = {
        penpal: MessageType.Call,
        id: callSenderId,
        methodName,
        args,
      };
      sendData(CallMessage);

      return deferred.promise;
    };
  };

  // 处理远程调用本地的方法
  const handleCallMessage = (data: CallMessage) => {
    const { methodName, args, id } = data;
    if (destroyed) {
      zLog(`由于连接断开，无法发送 ${methodName}() 回复`);
      return;
    }

    zLog(`收到 ${methodName}() 请求消息: ${JSON.stringify(data)}`);

    const method = methods[methodName];
    if (typeof method !== 'function') {
      zLog(`未提供方法 ${methodName}`);
      return;
    }

    const createPromiseHandler = (resolution: Resolution) => {
      return (returnValue: any) => {
        const message: ReplyMessage = {
          penpal: MessageType.Reply,
          id,
          resolution,
          returnValue,
        };

        if (
          resolution === Resolution.Rejected
          && returnValue instanceof Error
        ) {
          message.returnValue = {
            code: (returnValue as PenpalError).code,
            name: returnValue.name,
            message: returnValue.message,
          };
        }

        zLog(`开始发送 ${methodName}() 回复消息: ${JSON.stringify(message)}`);
        sendData(message);
      };
    };

    new Promise((resolve) => resolve(method(...args)))
      .then(
        createPromiseHandler(Resolution.Fulfilled),
        createPromiseHandler(Resolution.Rejected),
      );
  }

  const handleReplyMessage = (data: ReplyMessage) => {
    callSenderFactory.handle(data);
  }

  // 处理 window.onMessage 消息
  const handleMessageEvent = ({ origin: remoteOrigin, data }: MessageEvent) => {
    if (origin !== remoteOrigin) {
      zLog(`收到来自源 ${remoteOrigin} 的消息，与预期源 ${origin} 不匹配`);
      return;
    }

    const { penpal } = data;
    if (penpal === MessageType.Syn) { // 子页面建立连接
      handleSynMessage();
    } else if (penpal === MessageType.Ack) {
      handleAckMessage(data);
    } else if (penpal === MessageType.Call) {
      handleCallMessage(data);
    } else if (penpal === MessageType.Reply) {
      handleReplyMessage(data);
    }
  };

  zLog(`开始等待握手连接`);
  target.onMessage(handleMessageEvent);

  return {
    promise: deferredChild.promise,
    destroy,
  };
}

export type {
  PenpalMessage,
}
