import {
  createDestructor,
} from '@/modules/createDestructor';
import {
  CallSender,
  AsyncMethodReturns,
  ConnectType,
  Connection,
  ConnectOptions,
  emptyFn,
  MessageType,
  HandshakeMessage,
  TargetMessageEvent,
  NativeEventType,
} from '@/options';
import {
  createSynAckMessageFactory,
} from './modules/handshakeMessageFactory';
import { checkMessageOrigin, startTimeout } from './utils';
import { PenpalError } from './modules/PenpalError';


/**
 * 尝试与父窗口建立通信
 */
export function connectToParent<TCallSender extends object = CallSender>(
  option: ConnectOptions = {} as ConnectOptions,
): Connection<TCallSender> {
  const { log = emptyFn, origin = '*', timeout, target, methods = {} } = option;
  const connectType = ConnectType.CHILD;
  const destrructor = createDestructor(connectType, log);
  const { destroy, onDestroy } = destrructor;

  log(`${connectType} origin=${origin}`)

  const handleSynAckMessage = createSynAckMessageFactory(
    connectType,
    target,
    methods,
    log,
    origin,
    destrructor,
  );

  const sendSynMessage = () => {
    const remote = target.parent || target;
    const synMessage: HandshakeMessage = { penpal: MessageType.Syn };
    log(`${connectType}: 握手 - 开始发送 SYN 消息: ${JSON.stringify(synMessage)}`);
    remote.postMessage(synMessage, origin);
  };

  const promise: Promise<AsyncMethodReturns<TCallSender>> = new Promise(
    (resolve, reject) => {
      const stopConnectionTimeout = startTimeout(timeout, destroy);
      const handleMessage = (event: TargetMessageEvent) => {
        const { data, origin: remoteOrigin } = event || {};
        if (!data || !checkMessageOrigin(remoteOrigin, origin)) {
          log(`${connectType}: 收到来自源 ${remoteOrigin} 的SYN消息，与预期来源 ${origin} 不匹配`);
          return;
        }

        if (data.penpal === MessageType.SynAck) {
          const callSender = handleSynAckMessage(event) as AsyncMethodReturns<
            TCallSender
          >;
          if (callSender) {
            log(`${connectType} SynAck callSender`);
            target.removeEventListener(NativeEventType.Message, handleMessage);
            stopConnectionTimeout();
            resolve(callSender);
          }
        }
      };

      target.addEventListener(NativeEventType.Message, handleMessage);

      sendSynMessage();

      onDestroy((error?: PenpalError) => {
        log(`${connectType} onDestroy`);
        target.removeEventListener(NativeEventType.Message, handleMessage);

        if (error) {
          reject(error);
        }
      });
    },
  );

  return {
    promise,
    destroy() {
      // Don't allow consumer to pass an error into destroy.
      destroy();
    },
  };
}

export type {
  ConnectOptions,
  Connection,
  CallSender,
  TargetMessageEvent,
  AsyncMethodReturns,
}

export {
  ConnectType,
  NativeEventType,
}