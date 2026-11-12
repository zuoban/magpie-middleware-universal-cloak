# Universal Cloak Middleware

一个无第三方依赖的 JavaScript 请求中间件，通过在指定文本中插入零宽空格（`U+200B`），打散系统指令和工具描述中的连续英文字母。无需维护关键词列表。

仓库提供单个 ES 模块，导出 `onRequest(body, ctx)`，由宿主应用在发送请求前调用。

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

运行环境需支持 ES 模块与全局 `structuredClone`。本仓库没有 `package.json`、安装依赖或构建步骤；请让宿主应用按 ES 模块加载 `.js` 文件。

在请求发送前调用：

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

将 `transformed` 作为后续请求体传给宿主应用的发送逻辑。第二个参数 `ctx` 当前未使用。若宿主支持加载带有 `onRequest` 导出的中间件文件，可按该宿主的配置方式注册本文件。

## 本地验证

在仓库根目录运行语法检查：

```sh
node --input-type=module --check < universal-cloak.middleware.js
```

以下命令通过数据 URL 加载本地模块，可在不增加 `package.json` 的情况下验证转换结果与输入不变性：

```sh
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("./universal-cloak.middleware.js", "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { onRequest } = await import(moduleUrl);
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
- `AGENTS.md`：贡献指南与代码约定。
- `README.md`：使用说明。
