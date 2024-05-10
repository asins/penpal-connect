import { PenpalError } from '@/modules/PenpalError';
import { createDestructor } from '@/modules/createDestructor';
import {
  createAckMessageFactory,
  createSynMessageFactory,
} from '@/modules/handshakeMessageFactory';
import {
  AsyncMethodReturns,
  CallSender,
  ConnectOptions,
  ConnectType,
  Connection,
  MessageHandler,
  MessageType,
  NativeEventType,
  TargetMessageEvent,
  emptyFn,
} from '@/options';
import {
  startTimeout,
} from '@/utils';

/**
 * 尝试与子窗口建立通信
 */
export function connectToChild<TCallSender extends object = CallSender>(
  option: ConnectOptions = {} as ConnectOptions,
): Connection<TCallSender> {
  const { log = emptyFn, origin = '*', timeout, target, methods = {} } = option;
  const connectType = ConnectType.PARENT;
  const destructor = createDestructor(connectType, log);
  const { destroy, onDestroy } = destructor;

  log(`${connectType} origin=${origin}`)

  const handleSynMessage = createSynMessageFactory(
    connectType,
    target,
    methods,
    log,
    origin,
    origin,
  );
  const handleAckMessage = createAckMessageFactory(
    connectType,
    target,
    methods,
    log,
    origin,
    origin,
    destructor,
  );

  const promise: Promise<AsyncMethodReturns<TCallSender>> = new Promise((resolve, reject) => {
    const stopConnectionTimeout = startTimeout(timeout, destroy);
    const handleMessage: MessageHandler = (event: TargetMessageEvent) => {
      const { data } = event || {};
      if (!data) {
        return;
      }

      if (data.penpal === MessageType.Syn) {
        handleSynMessage(event);
        return;
      }

      if (data.penpal === MessageType.Ack) {
        const callSender = handleAckMessage(event) as AsyncMethodReturns<TCallSender>;

        if (callSender) {
          stopConnectionTimeout();
          resolve(callSender);
        }
        return;
      }

      // if (data.penpal === MessageType.Ping) { }
    };

    target.addEventListener(NativeEventType.Message, handleMessage);

    log(`${connectType}: 等待握手`);

    onDestroy((error?: PenpalError) => {
      log(`${connectType} onDestroy`);
      target.removeEventListener(NativeEventType.Message, handleMessage);

      if (error) {
        reject(error);
      }
    });
  });

  return {
    promise,
    destroy() {
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