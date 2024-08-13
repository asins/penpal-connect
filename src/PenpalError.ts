export const enum ErrorCode {
  ConnectionDestroyed = 'ConnectionDestroyed',
  ConnectionTimeout = 'ConnectionTimeout',
}

/**
 * specific error.
 */
export type PenpalError = Error & { code: ErrorCode };

export function createPenpalError(code: ErrorCode, msg: string): PenpalError {
  const error = new Error(msg) as PenpalError;
  error.code = code;
  return error;
}

type SerializedError = {
  name: string;
  message: string;
  stack: string | undefined;
};

/**
 * Converts an error object into a plain object.
 */
export const serializeError = ({ name, message, stack }: Error): SerializedError => ({
  name,
  message,
  stack,
});

/**
 * Converts a plain object into an error object.
 */
export const deserializeError = (obj: SerializedError): Error => {
  const deserializedError = new Error();
  Object.keys(obj)
    .forEach((key) => {
      // @ts-expect-error 不检测
      deserializedError[key] = obj[key];
    });
  return deserializedError;
};
