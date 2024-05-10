import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import serve from 'rollup-plugin-serve';
import html from '@rollup/plugin-html';
// import alias from '@rollup/plugin-alias';
import { swc, defineRollupSwcOption } from 'rollup-plugin-swc3';
import glob from 'tiny-glob/sync.js';
import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';
import replace from '@rollup/plugin-replace';
import { isFunction } from '@theroyalwhee0/istype';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json' assert { type: 'json' };

const curFilePath = fileURLToPath(import.meta.url);
const projectDirPath = path.join(path.dirname(curFilePath), './');
/* eslint-disable no-undef */
const buildEnv = process.env.BUILD_ENV || 'prod';
const buildMini = process.env.BUILD_MINI || 'true';
const buildService = process.env.BUILD_SERVICE || 'false';
const EXTENSION = /(\.(umd|cjs|es|m))?\.([cm]?[tj]sx?)$/;
const swcConfig = JSON.parse(readFileSync(`${projectDirPath}/.swcrc`, 'utf-8'))
const buildTypes = process.env.BUILD_TYPES || 'true'; // 是否构建dts文件
const buildIife = process.env.BUILD_IIFE || 'false';
const buildDemo = process.env.BUILD_DEMO || 'true';

/** 入口文件路径 */
const entries = [
  'src/index.ts',
  'src/connectToChild.ts',
  'src/connectToParent.ts',
];

console.log(`
  构建目录: ${projectDirPath}
  入口列表: ${entries.join(', ')}
  构建环境：${buildEnv}
  代码压缩：${buildMini}
`);

const Template_Meta = [
  { charset: 'utf-8' },
  { name: 'format-detection', content: 'telephone=no' },
  { name: 'viewport', content: 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover' },
];

const buildEnvReplace = {
  'process.env.BUILD_ENV': JSON.stringify(buildEnv),
  'process.env.SDK_VERSION': JSON.stringify(pkg.version),
  // 'process.env.NODE_ENV': JSON.stringify('production'),
};


class RollupConfig {
  static _configs = [];

  static createConfig(entry) {
    const outputPath = entry.replace(/src\//, 'dist/');
    const { _configs } = RollupConfig;

    // esm
    _configs.push(defineConfig({
      input: entry,
      output: [
        { file: replaceName(outputPath, 'x.esm.js'), format: 'es', sourcemap: buildEnv !== 'prod' },
        { file: replaceName(outputPath, 'x.cjs.js'), format: 'cjs', sourcemap: buildEnv !== 'prod' },
      ],
      plugins: [
        // resolve({ browser: true }),
        commonjs(),
        swc(createSwcConfig()),
        replace({ values: buildEnvReplace, preventAssignment: true }),
      ],
    }));

    // umd / iife
    if (buildIife) {
      const iifeSwcConfig = createSwcConfig();
      iifeSwcConfig.jsc.minify = false; // swc压缩后window.xxx名会丢失，先改用terser完成压缩
      const isBuildMini = !(buildEnv !== 'prod' || buildMini === 'false');
      _configs.push(defineConfig({
        input: entry,
        output: [
          { file: replaceName(outputPath, 'x.js'), format: 'iife', name: 'PenpalConnect', sourcemap: buildEnv !== 'prod' },
        ],
        plugins: [
          resolve({ browser: true }),
          commonjs(),
          swc(iifeSwcConfig),
          // swc(createSwcConfig()),
          isBuildMini && terser({
            output: { comments: false },
            keep_fnames: false,
            compress: true,
          }),
          replace({ values: buildEnvReplace, preventAssignment: true }),
        ],
      }));
    }

    // create dts config
    if (buildTypes === 'true') {
      const dtsConfig = defineConfig({
        input: entry,
        output: [
          { file: replaceName(outputPath, 'x.d.ts'), format: 'umd' },
        ],
        plugins: [
          resolve(),
          commonjs(),
          dts({
            // respectExternal: true,
            tsconfig: path.resolve(projectDirPath, 'tsconfig.json'),
          }),
        ],
      });
      _configs.push(dtsConfig);
    }
  }

  /**
   * 加入配置
   * @param {RollupOptions | RollupOptions[]} config 
   */
  static pushConfig(config) {
    RollupConfig._configs = RollupConfig._configs.concat(config);
  }

  static getConfig() {
    return RollupConfig._configs;
  }
}

export function createSwcConfig() {
  const curSwfConfig = { ...swcConfig, jsc: { ...swcConfig.jsc } };
  // 非线上环境，关闭压缩
  if (buildEnv !== 'prod' || buildMini === 'false') {
    curSwfConfig.jsc.minify = false;
  }

  // baseUrl必须是绝对地址，无法在`.swcrc`中指定
  curSwfConfig.jsc.baseUrl = projectDirPath;
  // curSwfConfig.include = /\.[mc]?[jt]sx?$/; // .mjs .mjsx .cjs .cjsx .js .jsx .ts .tsx
  curSwfConfig.exclude = /exclude_nothing_npms/;
  curSwfConfig.tsconfig = false;
  curSwfConfig.swcrc = false; // 直接给出所有配置，无需再读取`.swcrc`文件

  // console.log('createSwcConfig--->', curSwfConfig);
  return defineRollupSwcOption(curSwfConfig);
}

entries.reduce((res, file) => res.concat(glob(file)), [])
  .forEach(file => {
    console.log('入口文件 ->', file);
    RollupConfig.createConfig(file);
  });


// 启动一次本地WebServer
const createServe = (() => {
  // WebServer是否已开启
  let isServeOpen = false;

  return (opt) => {
    // 当前是远程构建或WebServer已开启了，则跳过
    if (isServeOpen) return null;

    isServeOpen = true;
    return serve({
      // https: {
      //   key: fs.readFileSync('cert/localhost.key'),
      //   cert: fs.readFileSync('cert/localhost.crt'),
      // },
      open: false,
      openPage: opt?.openPage || '/dist/config.html',
      contentBase: ['./'],
      host: '0.0.0.0',
      // port: 3333,
      port: 3003,
      headers: { 'Access-Control-Allow-Origin': '*' },
      onListening(server) {
        const address = server.address()
        const host = address.address === '::' ? 'localhost' : address.address
        // 通过使用绑定函数，我们可以通过`this`来访问选项
        const protocol = this.https ? 'https' : 'http'
        console.log(`Server listening at ${protocol}://${host}:${address.port}${this.openPage}`)
      }
    });
  };
})();


// 测试
(() => {
  if (buildDemo === 'false') return;

  /** Module文件构建 */
  const entriesTest = [
    'demo/page-parent.ts',
    'demo/page-child.ts',
  ];
  const entryFileList = entriesTest.reduce((res, file) => res.concat(glob(file)), []);
  entryFileList.forEach(file => {
    const distPath = path.join('dist', file.replace(/\.ts$/, '.js'));
    console.log('Test 文件:', file, ' --> ', distPath);
    const htmlDistPath = path.join('/dist', file.replace(/\.ts$/, '.html'));
    const htmlFileName = path.basename(htmlDistPath);
    RollupConfig.pushConfig(defineConfig({
      input: file,
      output: [
        { file: distPath, format: 'cjs', sourcemap: true },
      ],
      plugins: [
        resolve({ browser: true }),
        commonjs(),
        swc(createSwcConfig()),
        replace({ values: buildEnvReplace, preventAssignment: true }),
        html({
          title: '测试',
          publicPath: './',
          fileName: htmlFileName,
          attributes: { html: { lang: 'zh-cn' } },
          meta: Template_Meta,
          template: htmlTemplate([
            { type: 'css', attrs: { rel: 'stylesheet' }, src: '//g.alicdn.com/cgsdk/poc-demo/open-props@1.6.21/open-props.min.css', pos: 'before' },
            { type: 'css', attrs: { rel: 'stylesheet' }, src: '//g.alicdn.com/cgsdk/poc-demo/open-props@1.6.21/normalize.min.css', pos: 'before' },
            { type: 'css', attrs: { rel: 'stylesheet' }, src: '//g.alicdn.com/cgsdk/poc-demo/open-props@1.6.21/buttons.min.css', pos: 'before' },
          ]),
        }),
        buildService === 'true' && createServe({ openPage: htmlDistPath }),
      ].filter(_ => _),
    }));
  });
})();

export default RollupConfig.getConfig();

/**
 * 处理plugin-html的模板
 * @param {IExternal[]} externals 待在html模板中加载的资源
 *   IExternal = {
 *     type: string; // 资源类型，支持值css、js，默认值为js
 *     file: string; // 资源文件地址
 *     pos: string;  // 资源加载顺序，支持值 before:在同类资源前加入  after:在同类资源后加入，默认值为after
 *     rel: string;  // 插入的标签中的rel属性，只在type=css时有效
 *     code: string; // 资源内容
 *     inlineCode: boolean; // 生成的资源使用方式，true:内嵌在HTML代码中 false:通过加载文件载入
 *     publicPath: string; // 在线资源域名前缀
 *   }
 * @param {Object} options 模板生成时的配置参数
 *    filesHandler: Function;  // 对用于生成的内容进行加工
 */
export function htmlTemplate(externals, options = {}) {
  return (output) => {
    const { attributes, files, meta, publicPath, title } = output;
    if (isFunction(options.filesHandler)) {
      options.filesHandler(files);
    }

    let scripts = [...(files.js || [])];
    let links = [...(files.css || [])];

    // externals = [{ type: 'js', file: '//xxxx1.js', pos: 'before' }, { type: 'css', file: '//xxxx1.css' }]
    if (Array.isArray(externals)) {
      const beforeLinks = [];
      const beforeScripts = [];
      externals.forEach((node) => {
        let fileList;
        const isCssFile = node.type === 'css';
        if (node.pos === 'before') {
          fileList = isCssFile ? beforeLinks : beforeScripts;
        } else {
          fileList = isCssFile ? links : scripts;
        }
        fileList.push({ src: node.src, fileName: node.file, code: node.code, attrs: node.attrs, rel: node.rel });
      });
      scripts = beforeScripts.concat(scripts);
      links = beforeLinks.concat(links);
    }

    scripts = scripts.map(({ src, fileName, code, attrs, inlineCode }) => {
      attrs = makeHtmlAttributes(Object.assign({}, attributes.script, attrs));
      // console.log('scripts attrs ->', attrs, attributes.script);
      if (src) {
        return `<script src="${src}"${attrs}></script>`;
      } if (fileName && !inlineCode) {
        return `<script src="${publicPath}${fileName}"${attrs}></script>`;
      } else if (code) {
        return `<script${attrs}>${code}</script>`;
      } else {
        return '';
      }
    });

    links = links.map(({ src, fileName, code, attrs, rel, inlineCode }) => {
      attrs = makeHtmlAttributes(Object.assign({}, attributes.link, attrs));
      if (src) {
        return `<link href="${src}"${attrs}></link>`;
      } else if (fileName && !inlineCode) {
        return `<link href="${publicPath}${fileName}" rel="${rel || 'stylesheet'}"${attrs} />`;
      } else if (code) {
        return `<style rel="stylesheet"${attrs}>${code}</style>`;
      } else {
        return '';
      }
    });

    // console.log('template--->', JSON.stringify(scripts), JSON.stringify(links));

    const metas = meta.map((input) => {
      const attrs = makeHtmlAttributes(input);
      return `<meta${attrs}>`;
    });

    return `<!doctype html>
<html${makeHtmlAttributes(attributes.html)}>
  <head>
    ${metas.join('\n')}
    <title>${title}</title>
    ${links.join('\n')}
  </head>
  <body>
    ${scripts.join('\n')}
  </body>
</html>`.replace(/[\s\n]*([><])[\s\n]*/ig, '$1');
  };
}

function makeHtmlAttributes(attributes) {
  if (!attributes) {
    return '';
  }

  const keys = Object.keys(attributes);
  // eslint-disable-next-line no-return-assign
  return keys.reduce((result, key) => (result += ` ${key}="${attributes[key]}"`), '');
}

function replaceName(entry, name) {
  const exist = name.replace(/^[^.]+/, '');
  const filename = path.basename(entry).replace(EXTENSION, '');
  return path.resolve(
    path.dirname(entry),
    filename + exist,
  );
}
