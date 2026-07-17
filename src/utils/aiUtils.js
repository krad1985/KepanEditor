export const callGeminiChatAPI = async (messages, systemInstruction, settings, envFallbackKey = '', retries = 2) => {
  const keys = (settings.apiKeys || '').split(',').map(k => k.trim()).filter(Boolean);
  const key = keys[0] || envFallbackKey;
  if (!key) return null;

  const model = settings.apiModel === 'custom' ? settings.customModel : settings.apiModel;
  const payload = {
    contents: messages,
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
  };

  let lastErr = '';
  for (let attempt = 0; attempt < retries; attempt++) {
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
      lastErr = e.message;
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, 1500));
    }
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
