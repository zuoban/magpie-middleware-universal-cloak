// universal-cloak.middleware.js
// 全自动通杀版：无需维护指纹词库，自动打散系统提示词与工具描述特征

function cloakText(text) {
  if (typeof text !== "string" || !text) return text;
  // 在长度 >= 5 的英文单词中间插入零宽空格 (\u200b)
  return text.replace(/([A-Za-z]{3})([A-Za-z]{2,})/g, "$1\u200b$2");
}

function cloakContent(content) {
  if (typeof content === "string") return cloakText(content);
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") return cloakText(part);
      if (part && typeof part === "object" && typeof part.text === "string") {
        return { ...part, text: cloakText(part.text) };
      }
      return part;
    });
  }
  return content;
}

export function onRequest(body, ctx) {
  if (!body || typeof body !== "object") return body;
  const out = structuredClone(body);

  // 1. OpenAI Chat 格式 (system / developer)
  if (Array.isArray(out.messages)) {
    out.messages = out.messages.map((msg) => {
      if (msg && (msg.role === "system" || msg.role === "developer")) {
        return { ...msg, content: cloakContent(msg.content) };
      }
      return msg;
    });
  }

  // 2. Anthropic Claude 格式 (system)
  if (out.system) {
    out.system = cloakContent(out.system);
  }

  // 3. OpenAI Responses 格式 (instructions)
  if (typeof out.instructions === "string") {
    out.instructions = cloakText(out.instructions);
  }

  // 4. Gemini / Antigravity 原生格式 (systemInstruction)
  for (const key of ["systemInstruction", "system_instruction"]) {
    if (out[key] && Array.isArray(out[key].parts)) {
      out[key].parts = out[key].parts.map((p) =>
        p && typeof p.text === "string" ? { ...p, text: cloakText(p.text) } : p
      );
    }
  }

  // 5. 打散工具描述 description（保留工具 name 不变，防止函数调用报错）
  if (Array.isArray(out.tools)) {
    out.tools = out.tools.map((tool) => {
      if (!tool || typeof tool !== "object") return tool;
      const t = { ...tool };
      if (t.function && typeof t.function.description === "string") {
        t.function = { ...t.function, description: cloakText(t.function.description) };
      }
      if (typeof t.description === "string") {
        t.description = cloakText(t.description);
      }
      if (Array.isArray(t.functionDeclarations)) {
        t.functionDeclarations = t.functionDeclarations.map((fd) =>
          fd && typeof fd.description === "string"
            ? { ...fd, description: cloakText(fd.description) }
            : fd
        );
      }
      return t;
    });
  }

  return out;
}


