import {
  WarnColor,
  NormalColor,
  SuccessColor,
  ErrorColor,
  // type PageParams,
} from "@demo/config";
import { initUiGlobal } from "@demo/ui-global";
import createDebug from 'zlog-web';
import {
  insertHtml,
  // getPageParams,
  $,
  logToNewline,
  updateButtonDisable,
  getOriginFromUrl,
  createIframe,
} from '@demo/utils';
import { connectToChild } from "@/index";
import to from "await-to-js";
import { PenpalMessage } from "@/types";

const moduleName = 'PenpalConnectDemo:Parent';
const zLog = createDebug(moduleName);

// window 外部暴露方法
const $body = document.body;
// const pageParams = getPageParams<PageParams>();

(function main() {
  initUiGlobal($body);
  insertHtml($body, `<h1>通道协议 PostMessage</h1>`);
  initUiParent($body);
})();

/**
 * 父页面 UI
 */
function initUiParent(
  $root: HTMLElement,
) {
  zLog('开始初始化父页面UI');
  const url = location.href.split('?')[0];
  const iframeUrl = url.slice(0, url.lastIndexOf('/')) + '/page-child.html';

  insertHtml($root, `
    <fieldset id="formClientUI">
      <legend>父页面</legend>
      <p>
        <label for="iptIframeUrl">子页面Url：</label>
        <input id="iptIframeUrl" type="text" value="${iframeUrl}" placeholder="子页面的URL地址">
      </p>
      <p>
        <button id="btnIframeConnect">创建子页面</button>
      </p>
      <p>
        <button id="btnParentSayHello">ParentSayHello</button>
        <button id="btnParentSayBye">ParentSayBye</button>
      </p>
      <div id="resultChannelMsg"></div>
    </fieldset>
  `);

  const $formClientUI = $<HTMLInputElement>('#formClientUI', $root);
  const $iptIframeUrl = $<HTMLInputElement>('#iptIframeUrl', $formClientUI);
  const $btnIframeConnect = $<HTMLButtonElement>('#btnIframeConnect', $formClientUI);
  const $btnParentSayHello = $<HTMLButtonElement>('#btnParentSayHello', $formClientUI);
  const $btnParentSayBye = $<HTMLButtonElement>('#btnParentSayBye', $formClientUI);
  const $resultChannelMsg = $<HTMLSpanElement>('#resultChannelMsg', $formClientUI);
  logToNewline($resultChannelMsg, `开始初始化父页面UI`, NormalColor);

  updateButtonDisable($btnParentSayHello, true, NormalColor);
  updateButtonDisable($btnParentSayBye, true, NormalColor);
  let hasConnectChilded = false; // 用于模拟未允许iframe连接
  $btnIframeConnect.addEventListener('click', () => {
    const iframeUrl = $iptIframeUrl.value.trim();
    logToNewline($resultChannelMsg, `打开子页面: ${iframeUrl}`, WarnColor);
    const frame = createIframe(iframeUrl, 'game-iframe');

    if (!hasConnectChilded) {
      hasConnectChilded = true;
      logToNewline($resultChannelMsg, `开始监听子页面的握手消息`, NormalColor);
      connectChild($formClientUI, frame);
      zLog('创建子页面，url=', frame.src);
    }
  });
}

async function connectChild($root: HTMLDivElement, iframe: HTMLIFrameElement) {
  const $resultChannelMsg = $<HTMLSpanElement>('#resultChannelMsg', $root);
  const $btnParentSayHello = $<HTMLButtonElement>('#btnParentSayHello', $root);
  const $btnParentSayBye = $<HTMLButtonElement>('#btnParentSayBye', $root);

  const origin = getOriginFromUrl(iframe.src);
  zLog('parent page use iframe origin=', origin);

  const connection = connectToChild<ChildMethods>({
    target: {
      postMessage: (message: PenpalMessage, origin: string) => {
        const cWin = iframe.contentWindow;
        if (cWin) {
          cWin.postMessage(message, origin);
        }
      },
      onMessage: (handle: any) => {
        console.log('parent onMessage fn');
        window.addEventListener('message', (e) => {
          console.log('parent window.onMessage=', e);
          handle(e);
        });
      },
    },
    log: zLog,
    timeout: 20 * 1000,
    origin: origin || '*',
    methods: {
      parentSayHello: (name: string, time: number) => {
        return Promise.resolve(`[Parent] Hello ${name}! time diff:${Date.now() - time}`);
      },
      parentSayBye: () => {
        return Promise.resolve('[Parent] Bye');
      }
    }
  });

  const [err, child] = await to(connection.promise);
  if (err) {
    logToNewline($resultChannelMsg, `[父-->子] 连接失败: ${err.message}`, ErrorColor);
    return;
  }

  logToNewline($resultChannelMsg, `[父-->子] 连接成功`, SuccessColor);

  updateButtonDisable($btnParentSayHello, false, SuccessColor);
  updateButtonDisable($btnParentSayBye, false, SuccessColor);
  $btnParentSayHello.addEventListener('click', async () => {
    logToNewline($resultChannelMsg, `[父-->子] 调用childSayHello`, NormalColor);
    const result = await child.childSayHello('World', Date.now());
    logToNewline($resultChannelMsg, `[父-->子] 调用childSayHello 结果：${result}`, SuccessColor);
  });
  $btnParentSayBye.addEventListener('click', async () => {
    logToNewline($resultChannelMsg, `[父-->子] 调用childSayBye`, NormalColor);
    const result = await child.childSayBye();
    logToNewline($resultChannelMsg, `[父-->子] 调用childSayBye 结果：${result}`, SuccessColor);
  });
}


type ChildMethods = {
  childSayHello: (name: string) => Promise<string>;
  childSayBye: () => Promise<string>;
};