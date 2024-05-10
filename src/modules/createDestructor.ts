import { PenpalError } from './PenpalError';
import { ConnectType, Logger } from '../options';

export type DestroyConnection = (error?: PenpalError) => void;
export type Destructor = {
  /**
   * 调用所有onDestroy回调。
   */
  destroy: DestroyConnection;
  /**
   * 注册要在调用destroy时的回调方法
   */
  onDestroy: (callback: DestroyConnection) => void;
};

export function createDestructor(connectType: ConnectType, log: Logger): Destructor {
  const callbacks: DestroyConnection[] = [];
  let destroyed = false;

  return {
    destroy(error) {
      if (!destroyed) {
        destroyed = true;
        log(`${connectType}: 开始销毁连接`);
        callbacks.forEach((callback) => {
          callback(error);
        });
      }
    },
    onDestroy(callback) {
      destroyed ? callback() : callbacks.push(callback);
    },
  };
}
