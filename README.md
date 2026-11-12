# Universal Cloak Middleware

一个无第三方依赖的 JavaScript 请求中间件，通过在指定文本中插入零宽空格（`U+200B`），打散系统指令和工具描述中的连续英文字母。无需维护关键词列表。

仓库提供单个 ES 模块，导出 `onRequest(body, ctx)`，在 Magpie 路由请求前调用。`package.json` 通过 `magpie.middleware` 声明入口，可直接从 GitHub 仓库、文件夹或单文件安装。

## 安装与更新

在 Magpie 的「插件 → 添加插件」中输入：

```text
github:zuoban/magpie-middleware-universal-cloak
```

也可以使用命令行安装：

```sh
magpie plugin add github:zuoban/magpie-middleware-universal-cloak
```

开发时，在仓库根目录选择以下一种方式安装，避免重复启用：

```sh
magpie plugin add .
```

或直接安装单文件：

```sh
magpie plugin add ./universal-cloak.middleware.js
```

在插件页更新已安装的 GitHub 插件，即可获取修复；命令行 `magpie plugin update` 会更新已安装的插件。更新后可运行 `magpie plugin --json`，检查 `middleware` 中是否出现本插件及 `onRequest` 钩子，并确认没有加载错误。

本插件不提供供应商或模型，不需要单独登录。它作用于经过 Magpie 网关的请求。安装规范见 [Magpie 插件开发文档](https://usemagpie.ai/docs/zh/plugins)。

## 工作原理

中间件使用以下规则处理文本：

```js
text.replace(/([A-Za-z]{3})([A-Za-z]{2,})/g, "$1\u200b$2");
```

每段长度至少为 5 的连续 ASCII 英文字母，会在第 3 个字母后插入一个零宽空格。例如：

```text
原始：You are a helpful assistant.
结果：You are a hel\u200bpful ass\u200bistant.
```

这里用 `\u200b` 展示插入位置；实际输出包含不可见字符。数字、标点、汉字以及不足 5 个字母的连续片段不受此规则影响。

## 处理范围

以下是代码识别的请求结构；实际是否执行转换取决于对应字段是否存在且类型匹配。

| 请求结构 | 处理字段 |
| --- | --- |
| Chat 风格消息 | `messages` 中角色为 `system` 或 `developer` 的 `content` |
| 顶层系统指令 | `system` |
| Responses 风格指令 | 字符串类型的 `instructions` |
| Gemini 风格系统指令 | `systemInstruction.parts[].text`、`system_instruction.parts[].text` |
| 嵌套函数工具描述 | `tools[].function.description` |
| 顶层工具描述 | `tools[].description` |
| 函数声明描述 | `tools[].functionDeclarations[].description` |

`content` 和 `system` 支持字符串，以及由字符串或带有字符串 `text` 字段的对象组成的数组。其他内容块会保留。

用户消息、助手消息、工具名称、参数定义和其他未列出的字段保留原值。转换前会通过 `structuredClone` 克隆请求对象，因此不会修改传入对象。

## 接入方式

Magpie 网关中间件运行在内置的 moejs 引擎中，而非 Bun 或 Node.js。本插件不依赖 Node API、网络请求或第三方包，也无需安装依赖或执行构建。`package.json` 仅声明 ES 模块、检查命令和中间件入口，不设置供应商插件的 `main` 或 `exports`。

模块需要 ES 模块支持和全局 `structuredClone`。已在本机 Magpie `0.1.3952` 中验证加载和请求转换。

在其他支持 ES 模块的环境中，也可以直接调用：

```js
import { onRequest } from "./universal-cloak.middleware.js";

const body = {
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain this example." },
  ],
};

const transformed = onRequest(body, {});

console.log(JSON.stringify(transformed).replace(/\u200b/g, "\\u200b"));
```

将 `transformed` 作为后续请求体传给宿主应用的发送逻辑。第二个参数 `ctx` 当前未使用。

## 本地验证

在仓库根目录运行语法检查：

```sh
npm run check
```

以下命令直接加载本地模块，验证转换结果与输入不变性：

```sh
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { onRequest } from "./universal-cloak.middleware.js";
const input = { instructions: "Hello world", messages: [{ role: "user", content: "Hello" }] };
const output = onRequest(input, {});

assert.equal(output.instructions, "Hel\u200blo wor\u200bld");
assert.equal(input.instructions, "Hello world");
assert.deepEqual(output.messages, input.messages);
assert.notEqual(output, input);
console.log("验证通过");
NODE
```

当前未配置自动化测试框架或覆盖率阈值。修改转换逻辑时，应覆盖上表中的字段、内容数组、空值以及非字符串内容。

## 使用限制

- 插入零宽字符会改变文本的实际字符序列，可能影响分词、精确匹配和模型对指令的理解；效果需要在具体宿主和模型中验证。
- 该实现只执行字符转换，不提供加密、脱敏或身份隐藏，也不保证规避任何检测。
- 转换不是幂等操作：多次执行可能继续向较长的剩余字母片段插入字符，建议每个请求只执行一次。
- 请求对象需要能够被 `structuredClone` 克隆；包含函数等不可克隆值时会抛出异常。

## 仓库文件

- `universal-cloak.middleware.js`：中间件实现。
- `package.json`：Magpie 中间件声明与 ES 模块配置。
- `AGENTS.md`：贡献指南与代码约定。
- `README.md`：使用说明。
