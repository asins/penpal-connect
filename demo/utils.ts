import { NormalColor } from "./config";
import * as queryString from 'querystringify-ts';

export function insertHtml(el: HTMLElement, html: string): void {
  const $fragEl = document.createRange().createContextualFragment(html);
  Array.from($fragEl.children).forEach(($child) => {
    el.appendChild($child);
  });
}

export function $<T = HTMLElement>(selector: string, doc: HTMLElement | Document = document): T {
  return doc.querySelector(selector) as T;
}


export function updateResultInfo($el: HTMLElement, result: string, color?: string) {
  $el.innerHTML = result;
  $el.style.color = getColor(color || NormalColor);
}

/**
 * 字符的true/FALSE 转为boolean类型，其它字符原样返回
 * @param str {string} 待转为boolean的字符串
 * @param faceBool {boolean} 如果str非有效boolean的字符串时是否强制返回bool结果。不指定则强制返回boolean的值
 * @example
 *   stringToBool('true', false); // output: true
 *   stringToBool('true', false); // output: true
 *   stringToBool('abc', false); // output: 'abc'
 *   stringToBool('abc'); stringToBool('abc', true); // output: false
 */
function stringToBool(str: string, faceBool?: boolean): string | boolean {
  const val = str.toLowerCase();
  if ((val === 'true' || val === 'false')) {
    return val === 'true';
  }
  return faceBool === false ? val : false;
}

/**
 * 从Url中获取参数
 */
export function getPageParams<T>() {
  const urlParams = queryString.parse(window.location.search) as any;

  // 字符的true/FALSE 转为boolean类型
  const pageParams: T = Object.keys(urlParams).reduce((res, key) => {
    // @ts-expect-error 这里不用管
    res[key] = stringToBool(urlParams[key], false);
    return res;
  }, {} as T);

  return pageParams;
}

/** 将日志逐行写入指定Dom中 */
export function logToNewline($el: HTMLElement, msg: string, color: string) {
  insertHtml($el, `<div style="color:${getColor(color)}">${decodeURIComponent(msg)}</div>`);
}

function getColor(color: string) {
  return color === NormalColor ? color : `var(${color})`;
}

/** 将日志写入单行的Dom中 */
export function logToInline($el: HTMLElement, result: string, color?: string) {
  $el.innerHTML = result;
  $el.style.color = getColor(color || NormalColor);
}

/** 更新按钮禁用状态 */
export function updateButtonDisable($el: HTMLButtonElement, isDisabled: boolean, color?: string) {
  $el.disabled = isDisabled;
  if (color) {
    $el.style.color = getColor(color || NormalColor);
    const bg = color === NormalColor ?  '' : `hsl(var(${color}-hsl) / 30%)`;
    $el.style.backgroundColor = bg;
  }
}

export function getOriginFromUrl(urlString: string) {
  const regex = /^((https?:)?\/\/[^/]+)(\/|$)/i;
  const match = regex.exec(urlString);
  if (match && match[1]) {
    return match[1]; // 返回协议、域名和端口
  }
  return null;
}

export function createIframe(url: string, cls?: string): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.src = url;
  if (cls) {
    frame.classList.add(cls);
  }
  document.body.appendChild(frame);

  return frame;
}