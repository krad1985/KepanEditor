/* 帶逾時的 fetch 包裝 */
const fetchWithTimeout = async (url, opts, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

/* Gemini 原生 API 呼叫 */
const callGeminiChat = async (messages, systemInstruction, settings, envFallbackKey) => {
  const rawKey = settings.apiKeys?.gemini || '';
  const keys = rawKey.split(',').map(k => k.trim()).filter(Boolean);
  const key = keys[0] || envFallbackKey;
  if (!key) throw new Error('未設定 Gemini API 金鑰，請至設定頁面輸入。');
  const model = settings.apiModel === 'custom' ? settings.customModel : settings.apiModel;
  const payload = {
    contents: messages,
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetchWithTimeout(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      }, 30000);
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini HTTP ${res.status}：${errBody.substring(0, 300)}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(`Gemini：${data.error.message || JSON.stringify(data.error)}`);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      throw new Error('Gemini 回傳為空（可能觸發安全過濾）。原始回覆：' + JSON.stringify(data).substring(0, 200));
    } catch (e) {
      console.error('[Gemini]', e);
      if (attempt < 1) await new Promise(r => setTimeout(r, 1500));
      else throw e;
    }
  }
  return null;
};

/* OpenRouter API 呼叫 (相容 OpenAI Chat Completions 格式) */
const callOpenRouterChat = async (messages, systemInstruction, settings, envFallbackKey) => {
  const rawKey = settings.apiKeys?.openrouter || '';
  const keys = rawKey.split(',').map(k => k.trim()).filter(Boolean);
  const key = keys[0] || envFallbackKey;
  if (!key) throw new Error('未設定 OpenRouter API 金鑰，請至設定頁面輸入。');
  const model = settings.apiModel === 'custom' ? settings.customModel : settings.apiModel;
  const oaiMessages = [];
  if (systemInstruction) oaiMessages.push({ role: 'system', content: systemInstruction });
  for (const msg of messages) {
    if (msg.role === 'user') oaiMessages.push({ role: 'user', content: msg.parts.map(p => p.text).join('\n') });
    else if (msg.role === 'model') oaiMessages.push({ role: 'assistant', content: msg.parts.map(p => p.text).join('\n') });
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'KepanEditor',
        },
        body: JSON.stringify({ model, messages: oaiMessages }),
      }, 60000);
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`OpenRouter HTTP ${res.status}：${errBody.substring(0, 300)}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(`OpenRouter：${data.error.message || JSON.stringify(data.error)}`);
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
      throw new Error('OpenRouter 回傳為空');
    } catch (e) {
      console.error('[OpenRouter]', e);
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
  } else if (settings.apiProvider === 'openrouter') {
    return callOpenRouterChat(messages, systemInstruction, settings, envFallbackKey);
  }
  throw new Error(`不支援的 AI 提供者：${settings.apiProvider}`);
};

export const callImagenAPI = async (visualPrompt, settings, envFallbackKey = '') => {
  const rawKey = settings.apiKeys?.gemini || '';
  const keys = rawKey.split(',').map(k => k.trim()).filter(Boolean);
  const key = keys[0] || envFallbackKey;
  if (!key) throw new Error('未設定 Gemini API 金鑰，無法生成圖片。');

  const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: { prompt: visualPrompt }, parameters: { sampleCount: 1 } }),
  }, 30000);
  if (!res.ok) throw new Error((await res.text()).substring(0, 100));
  const data = await res.json();
  if (data.predictions?.[0]) return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
  throw new Error('模型未回傳圖片資料');
};
