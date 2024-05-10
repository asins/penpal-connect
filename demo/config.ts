
export const ErrorColor = '--red-8';
export const SuccessColor = '--green-8';
export const WarnColor = '--yellow-8';
export const NormalColor = 'inherit';

export type PageParams = {
  /** 服务端环境 pre为预发环境 */
  apiEnv?: string;
};

declare global {
  interface Window {
    CGGameChannelSDK: any;
  }
}