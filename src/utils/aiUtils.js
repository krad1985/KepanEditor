/* Gemini 原生 API 呼叫 */
const callGeminiChat = async (messages, systemInstruction, settings, envFallbackKey) => {
  const keys = (settings.apiKeys || '').split(',').map(k => k.trim()).filter(Boolean);
  const key = keys[0] || envFallbackKey;
  if (!key) return null;
  const model = settings.apiModel === 'custom' ? settings.customModel : settings.apiModel;
  const payload = {
    contents: messages,
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      throw new Error('回傳為空');
    } catch (e) {
      if (attempt < 1) await new Promise(r => setTimeout(r, 1500));
      else throw e;
    }
  }
  return null;
};

/* OpenRouter API 呼叫 (相容 OpenAI Chat Completions 格式) */
const callOpenRouterChat = async (messages, systemInstruction, settings, envFallbackKey) => {
  const keys = (settings.apiKeys || '').split(',').map(k => k.trim()).filter(Boolean);
  const key = keys[0] || envFallbackKey;
  if (!key) return null;
  const model = settings.apiModel === 'custom' ? settings.customModel : settings.apiModel;
  /* 將 Gemini 格式 messages 轉成 OpenAI 格式 */
  const oaiMessages = [];
  if (systemInstruction) oaiMessages.push({ role: 'system', content: systemInstruction });
  for (const msg of messages) {
    if (msg.role === 'user') {
      oaiMessages.push({ role: 'user', content: msg.parts.map(p => p.text).join('\n') });
    } else if (msg.role === 'model') {
      oaiMessages.push({ role: 'assistant', content: msg.parts.map(p => p.text).join('\n') });
    }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'KepanEditor',
        },
        body: JSON.stringify({ model, messages: oaiMessages }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
      throw new Error('回傳為空');
    } catch (e) {
      if (attempt < 1) await new Promise(r => setTimeout(r, 1500));
      else throw e;
    }
  }
  return null;
};

/* OpenCode Zen API 呼叫 (OpenAI-compatible) */
const callZenChat = async (messages, systemInstruction, settings, envFallbackKey) => {
  const keys = (settings.apiKeys || '').split(',').map(k => k.trim()).filter(Boolean);
  const key = keys[0] || envFallbackKey;
  if (!key) return null;
  const model = settings.apiModel === 'custom' ? settings.customModel : settings.apiModel;
  const oaiMessages = [];
  if (systemInstruction) oaiMessages.push({ role: 'system', content: systemInstruction });
  for (const msg of messages) {
    if (msg.role === 'user') {
      oaiMessages.push({ role: 'user', content: msg.parts.map(p => p.text).join('\n') });
    } else if (msg.role === 'model') {
      oaiMessages.push({ role: 'assistant', content: msg.parts.map(p => p.text).join('\n') });
    }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('https://opencode.ai/zen/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({ model, messages: oaiMessages }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
      throw new Error('回傳為空');
    } catch (e) {
      if (attempt < 1) await new Promise(r => setTimeout(r, 1500));
      else throw e;
    }
  }
  return null;
};

/* 統一的 AI 呼叫入口 */
export const callAIChat = async (messages, systemInstruction, settings, envFallbackKey = '') => {
  if (!settings.apiProvider || settings.apiProvider === 'gemini') {
    return callGeminiChat(messages, systemInstruction, settings, envFallbackKey);
  } else if (settings.apiProvider === 'zen') {
    return callZenChat(messages, systemInstruction, settings, envFallbackKey);
  } else if (settings.apiProvider === 'openrouter') {
    return callOpenRouterChat(messages, systemInstruction, settings, envFallbackKey);
  }
  return null;
};

export const callImagenAPI = async (visualPrompt, settings, envFallbackKey = '') => {
  const keys = (settings.apiKeys || '').split(',').map(k => k.trim()).filter(Boolean);
  const key = keys[0] || envFallbackKey;
  if (!key) return null;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: { prompt: visualPrompt }, parameters: { sampleCount: 1 } }),
  });
  if (!res.ok) throw new Error((await res.text()).substring(0, 100));
  const data = await res.json();
  if (data.predictions?.[0]) return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
  throw new Error('模型未回傳圖片資料');
};
