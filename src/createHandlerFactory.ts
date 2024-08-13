export function createHandlerFactory() {
  const callbacks: { [id: string]: HandlerCallback } = {};

  return {
    handle: (...args: any) => {
      Object.keys(callbacks).forEach((id: string) => {
        callbacks[id](...args);
      });
    },
    onHandle: (id: number, callback: HandlerCallback) => {
      callbacks[id] = callback;
    },
    del: (id: number) => {
      delete callbacks[id];
    },
    destroy() {
      // 清除回调
      Object.keys(callbacks).forEach((id: string) => {
        delete callbacks[id];
      });
    }
  }
}

export type HandlerCallback = (...args: any) => void;
