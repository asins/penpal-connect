import { ErrorCode, createPenpalError, deserializeError } from './PenpalError';
import generateId from './generateId';
import {
  ConnectType,
  CallSender,
  Logger,
  MessageType,
  TargetWindow,
  NativeEventType,
  ReplyMessage,
  CallMessage,
  Resolution,
  TargetMessageEvent,
} from '../options';
import { checkMessageOrigin } from '@/utils';

/**
 * 使用与远程定义的方法匹配的方法扩充对象。
 * 调用这些方法时，会向远端发送一条 CallMessage 消息，执行远端对应的方法，并通过消息返回该方法的返回值。
 */
export function connectCallSender(
  connectType: ConnectType,
  local: TargetWindow,
  remote: TargetWindow,
  originForSending: string,
  originForReceiving: string,
  callSender: CallSender,
  methodKeyPaths: string[],
  log: Logger,
) {
  let destroyed = false;

  log(`${connectType}: 开始连接 CallSender`);

  const createMethodProxy = (methodName: string) => {
    return (...args: any) => {
      log(`${connectType}: 开始发送 ${methodName}() 的调用消息`);

      if (destroyed) {
        const error = createPenpalError(ErrorCode.ConnectionDestroyed, `连接已中断，无法发送 ${methodName}() 调用`);
        throw error;
      }

      return new Promise((resolve, reject) => {
        const id = generateId();
        const handleMessageEvent = (event: TargetMessageEvent) => {
          const { data, origin: remoteOrigin } = event || {};
          if (data.penpal !== MessageType.Reply || data.id !== id) {
            return;
          }

          if (!checkMessageOrigin(remoteOrigin, originForReceiving)) {
            log(`${connectType} 从源 ${remoteOrigin} 收到与预期源 ${originForReceiving} 不匹配的消息`);
            return;
          }

          const replyMessage: ReplyMessage = data;

          log(`${connectType}: 收到 ${methodName}() 的回复消息: ${JSON.stringify(replyMessage)}`);
          local.removeEventListener(NativeEventType.Message, handleMessageEvent);

          let { returnValue } = replyMessage;

          if (replyMessage.returnValueIsError) {
            returnValue = deserializeError(returnValue);
          }

          (replyMessage.resolution === Resolution.Fulfilled ? resolve : reject)(
            returnValue,
          );
        };

        local.addEventListener(NativeEventType.Message, handleMessageEvent);
        const callMessage: CallMessage = {
          penpal: MessageType.Call,
          id,
          methodName,
          args,
        };
        remote.postMessage(callMessage, originForSending);
      });
    };
  };

  const flattenedMethods = methodKeyPaths.reduce<Record<string, () => Promise<unknown>>>((api, name) => {
    // eslint-disable-next-line no-param-reassign
    api[name] = createMethodProxy(name);
    return api;
  }, {});

  Object.assign(callSender, flattenedMethods);

  return () => {
    destroyed = true;
  };
}
