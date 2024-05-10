import {
  DestroyCallReceiver,
  connectCallReceiver,
} from './connectCallReceiver';
import { connectCallSender } from './connectCallSender';
import { Destructor } from './createDestructor';
import {
  CallSender,
  ConnectType,
  HandshakeMessage,
  Logger,
  MessageType,
  TargetMessageEvent,
  TargetWindow,
} from '../options';
import { checkMessageOrigin } from '@/utils';

/**
 * 消息握手过程：
 *   父                子
 *    <----- SYN ---- 发起
 *   响应 -- SYN-ACK -->
 *    <----- ACK ---- 发送
 */


/**
 * 创建处理SYN握手消息的工厂方法
 */
export function createSynMessageFactory(
  connectType: ConnectType,
  target: TargetWindow,
  methods: CallSender,
  log: Logger,
  origin: string,
  originForSending: string,
) {
  return (event: TargetMessageEvent) => {
    const { origin: remoteOrigin } = event || {};
    if (!checkMessageOrigin(remoteOrigin, origin)) {
      log(`${connectType}: 握手 - 收到来自源 ${remoteOrigin} 的SYN消息，与预期来源 ${origin} 不匹配`);
      return;
    }

    const synAckMessage: HandshakeMessage = {
      penpal: MessageType.SynAck,
      methodNames: Object.keys(methods),
    };

    const remote = event.source || target;

    log(`${connectType}: 握手 - 收到SYN消息, 用SYN-ACK消息回应: ${JSON.stringify(synAckMessage)}`);
    remote.postMessage(synAckMessage, originForSending);
  };
}

/**
 * 创建处理Syn-Ack握手消息的工厂方法
 */
export function createSynAckMessageFactory(
  connectType: ConnectType,
  target: TargetWindow,
  methods: CallSender,
  log: Logger,
  origin: string,
  destructor: Destructor,
) {
  const { onDestroy } = destructor;

  return (event: TargetMessageEvent): CallSender | undefined => {
    const { data, origin: remoteOrigin } = event || {};
    if (!checkMessageOrigin(remoteOrigin, origin)) {
      log(`${connectType}: 握手 - 从源 ${remoteOrigin} 接收与预期源 ${origin} 不匹配的SYN-ACK消息`);
      return;
    }

    const ackMessage: HandshakeMessage = {
      penpal: MessageType.Ack,
      methodNames: Object.keys(methods),
    };

    const remote = target.parent || target;

    log(`${connectType}: 握手 - 收到SYN-ACK消息, 用ACK消息回应: ${JSON.stringify(ackMessage)}`);
    remote.postMessage(ackMessage, origin);

    const destroyCallReceiver = connectCallReceiver(
      connectType,
      target,
      remote,
      remoteOrigin,
      remoteOrigin,
      methods,
      log,
    );
    onDestroy(destroyCallReceiver);

    const receiverMethodNames = (data as HandshakeMessage).methodNames || [];
    log(`${connectType}: 握手 - SYN-ACK 消息时绑定远程的方法列表：${receiverMethodNames.join(', ')}`)

    const callSender: CallSender = {};
    const destroyCallSender = connectCallSender(
      connectType,
      target,
      remote,
      remoteOrigin,
      remoteOrigin,
      callSender,
      receiverMethodNames,
      log,
    );
    onDestroy(destroyCallSender);

    return callSender;
  };
}

/**
 * 创建处理Ack握手消息的工厂方法
 */
export function createAckMessageFactory(
  connectType: ConnectType,
  target: TargetWindow,
  methods: CallSender,
  log: Logger,
  origin: string,
  originForSending: string,
  destructor: Destructor,
) {
  const { onDestroy } = destructor;
  let destroyCallReceiver: DestroyCallReceiver;
  let receiverMethodNames: string[];
  const callSender: CallSender = {};

  return (event: TargetMessageEvent): CallSender | undefined => {
    const { data, origin: remoteOrigin } = event || {};
    if (!checkMessageOrigin(remoteOrigin, origin)) {
      log(`${connectType}: 握手 - 收到来自源 ${remoteOrigin} 的ACK消息，与预期源 ${origin} 不匹配`);
      return;
    }

    log(`${connectType}: 握手 - 收到ACK消息，${connectType}端完成握手`);

    // 如果子窗口重新连接，需要在设置新的CallReceiver之前销毁之前的
    if (destroyCallReceiver) {
      destroyCallReceiver();
    }

    const remote = event.source || target;

    destroyCallReceiver = connectCallReceiver(
      connectType,
      target,
      remote,
      originForSending,
      origin,
      methods,
      log,
    );
    onDestroy(destroyCallReceiver);

    // 如果子窗口重新连接，需要从CallSender中删除上一个的CallReceiver方法。
    if (receiverMethodNames) {
      receiverMethodNames.forEach((receiverMethodName) => {
        delete callSender[receiverMethodName];
      });
    }

    receiverMethodNames = (data as HandshakeMessage).methodNames || [];
    log(`${connectType}: 握手 - ACK 消息时绑定远程的方法列表：${receiverMethodNames.join(', ')}`)

    const destroyCallSender = connectCallSender(
      connectType,
      target,
      remote,
      origin,
      origin,
      callSender,
      receiverMethodNames,
      log,
    );

    onDestroy(destroyCallSender);

    return callSender;
  };
}
