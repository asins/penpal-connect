import createDebug from 'zlog-web';
import { insertHtml } from "./utils";

const moduleName = 'PenpalConnectDemo:Global';
createDebug.enable('*');
const zLog = createDebug(moduleName);

export function initUiGlobal($body: HTMLElement) {
  zLog('开始初始化全局UI');
  insertHtml($body, `
  <style>
    :where(html) {
      --red-8-hsl: 0 74% 54%;
      --green-8-hsl: 131 54% 40%;
      --yellow-8-hsl: 35 100% 47%;
    }
    hr{margin:var(--size-4) 0;}
    button{border: none;}
    h1{margin-bottom:var(--size-4);}
    h5{margin-bottom:var(--size-2);}
    fieldset:not(:last-child){margin-bottom:var(--size-4);}
    legend{font-size:var(--size-6);}
    fieldset p{margin-bottom:var(--size-2);display: flex; align-items: center;max-inline-size:none;}
    fieldset label{width:100px;flex-shrink:0;text-align: right;}
    fieldset textarea,fieldset input{flex: 1 1 auto;}
    .btns button:not(:last-child){margin-right:var(--size-2);}
    #resultChannelMsg{max-height:400px;background-color:rgba(0,0,0,.1);padding:var(--size-2);margin-bottom:var(--size-2);box-sizing:content-box;overflow:auto;}
    #resultChannelMsg div{word-wrap:break-word;word-break:break-all;}
    .login-wrap{padding:var(--size-2);background:rgba(0,0,0,0.2);}
    .game-iframe{width:100%;height:400px;border-bottom:1px solid #ccc;}
    p>button:not(:last-child){margin-right:var(--size-2);}
  </style>
  `);
}
