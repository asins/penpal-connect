import {
  serializeError,
} from './PenpalError';
import {
  CallMessage,
  CallSender,
  ConnectType,
  Logger,
  MessageType,
  NativeEventType,
  ReplyMessage,
  Resolution,
  TargetMessageEvent,
  TargetWindow,
} from '../options';
import { checkMessageOrigin } from '@/utils';

export function connectCallReceiver(
  connectType: ConnectType,
  local: TargetWindow,
  remote: TargetWindow,
  originForSending: string,
  originForReceiving: string,
  methods: CallSender,
  log: Logger,
): DestroyCallReceiver {
  let destroyed = false;

  const handleMessageEvent = ({ data, origin: remoteOrigin }: TargetMessageEvent) => {
    if (!data || data.penpal !== MessageType.Call) {
      return;
    }

    if (!checkMessageOrigin(remoteOrigin, originForReceiving)) {
      log(`${connectType} 收到来自源:${remoteOrigin} 的消息，该消息与预期源:${originForReceiving} 不匹配`);
      return;
    }

    const { methodName, args, id } = data as CallMessage;

    log(`${connectType}: 收到 ${methodName}() 的调用消息，参数: ${JSON.stringify(args)}`);

    const createPromiseHandler = (resolution: Resolution) => {
      return (returnValue: any) => {
        if (destroyed) {
          log(`${connectType}: 由于连接断开，无法发送 ${methodName}() 回复`);
          return;
        }

        const message: ReplyMessage = {
          penpal: MessageType.Reply,
          id,
          resolution,
          returnValue,
        };

        if (
          resolution === Resolution.Rejected &&
          returnValue instanceof Error
        ) {
          message.returnValue = serializeError(returnValue);
          message.returnValueIsError = true;
        }

        try {
          log(`${connectType}: 开始发送 ${methodName}() 回复消息: ${JSON.stringify(message)}`);
          remote.postMessage(message, originForSending);
        } catch (err) {
          const errorReplyMessage: ReplyMessage = {
            penpal: MessageType.Reply,
            id,
            resolution: Resolution.Rejected,
            returnValue: serializeError(err as Error),
            returnValueIsError: true,
          };
          log(`${connectType}: 开始发送 ${methodName}() Error 消息: ${JSON.stringify(errorReplyMessage)}`);
          remote.postMessage(errorReplyMessage, originForSending);

          throw err;
        }
      };
    };

    new Promise((resolve) => resolve(methods[methodName](...args)))
      .then(
        createPromiseHandler(Resolution.Fulfilled),
        createPromiseHandler(Resolution.Rejected),
      );
  };

  local.addEventListener(NativeEventType.Message, handleMessageEvent);

  return () => {
    destroyed = true;
    log(`${connectType} CallReceiver destroy`);
    local.removeEventListener(NativeEventType.Message, handleMessageEvent);
  };
}

export type DestroyCallReceiver = () => void;
