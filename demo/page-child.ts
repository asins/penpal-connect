import {
  WarnColor,
  NormalColor,
  SuccessColor,
  ErrorColor,
  // type PageParams,
} from "@demo/config";
import {
  insertHtml,
  $,
  logToNewline,
  updateButtonDisable,
} from "@demo/utils";
import {
  // type PageParams,
} from "@demo/config";
import { initUiGlobal } from "@demo/ui-global";
import createDebug from 'zlog-web';
import { connectToParent } from "@/index";
import to from "await-to-js";

const moduleName = 'PenpalConnectDemo:Child';
const zLog = createDebug(moduleName);

// window 外部暴露方法
const $body = document.body;
// const pageParams = getPageParams<PageParams>();

(function main() {
  initUiGlobal($body);
  initUiChild($body);
})();


/**
 * 父页面 UI
 */
function initUiChild(
  $root: HTMLElement,
) {
  zLog('开始初始化子页面UI');

  insertHtml($root, `
    <fieldset id="formClientUI">
      <legend>子页面</legend>
      <div id="resultChannelMsg"></div>
      <p>
        <button id="btnChildSayHello">ChildSayHello</button>
        <button id="btnChildSayBye">ChildSayBye</button>
      </p>
    </fieldset>
  `);

  const $formClientUI = $<HTMLInputElement>('#formClientUI', $root);
  const $resultChannelMsg = $<HTMLSpanElement>('#resultChannelMsg', $formClientUI);
  const $btnChildSayHello = $<HTMLButtonElement>('#btnChildSayHello', $formClientUI);
  const $btnChildSayBye = $<HTMLButtonElement>('#btnChildSayBye', $formClientUI);

  logToNewline($resultChannelMsg, `开始初始化子页面UI`, WarnColor);
  updateButtonDisable($btnChildSayHello, true, NormalColor);
  updateButtonDisable($btnChildSayBye, true, NormalColor);  

  logToNewline($resultChannelMsg, `尝试连接父页面`, NormalColor);
  connectParent($formClientUI);
}


async function connectParent($root: HTMLDivElement) {
  const $resultChannelMsg = $<HTMLSpanElement>('#resultChannelMsg', $root);
  const $btnChildSayHello = $<HTMLButtonElement>('#btnChildSayHello', $root);
  const $btnChildSayBye = $<HTMLButtonElement>('#btnChildSayBye', $root);

  // const origin = getOriginFromUrl(childUrl);

  const connection = connectToParent<ParentMethods>({
    target: window,
    log: zLog,
    timeout: 20 * 1000,
    origin: 'http://127.0.0.1:3003',
    methods: {
      childSayHello: (name: string) => {
        return '[Child] Hello ' + name;
      },
      childSayBye: () => {
        return '[Child] Bye!';
      }
    }
  });

  const [err, parent] = await to(connection.promise);
  if (err) {
    logToNewline($resultChannelMsg, `[子-->父] 连接失败: ${err.message}`, ErrorColor);
    return;
  }

  logToNewline($resultChannelMsg, `[子-->父] 连接成功`, SuccessColor);

  updateButtonDisable($btnChildSayHello, false, SuccessColor);
  updateButtonDisable($btnChildSayBye, false, SuccessColor);  
  $btnChildSayHello.addEventListener('click', async () => {
    logToNewline($resultChannelMsg, `[子-->父] 调用parentSayHello`, NormalColor);
    const result = await parent.parentSayHello('world');
    logToNewline($resultChannelMsg, `[子-->父] 调用parentSayHello 结果：${result}`, SuccessColor);
  });
  $btnChildSayBye.addEventListener('click', async () => {
    logToNewline($resultChannelMsg, `[子-->父] 调用parentSayBye`, NormalColor);
    const result = await parent.parentSayBye();
    logToNewline($resultChannelMsg, `[子-->父] 调用parentSayBye 结果：${result}`, SuccessColor);
  });
}

type ParentMethods = {
  parentSayHello: (name: string) => string;
  parentSayBye: () => string;
}