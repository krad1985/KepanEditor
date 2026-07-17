export const DEFAULT_SETTINGS = {
  themeKey: 'default',
  apiProvider: 'gemini',
  apiKeys: '',
  apiModel: 'gemini-2.5-flash',
  customModel: '',
  fontFamily: 'font-sans',
  aiPrompt: `請分析以下佛教經典/開示原文，將其意群切分為合適的子科判骨架。\n必須嚴格回傳 JSON 格式，架構如下 (只需回傳子層陣列):\n[ { "title": "科判標題", "content": "該標題對應的拆分後內文", "note": "" } ]\n\n注意：請務必只回傳合法的 JSON 陣列，不要有任何多餘的解釋文字。`,
};

export const AI_PROVIDERS = [
  { label: 'Google Gemini', value: 'gemini', keyLabel: 'Gemini API Key', keyPlaceholder: '輸入您的 Gemini API 金鑰。可多組逗號分隔以輪替避開限制。' },
  { label: 'OpenRouter (多模型聚合)', value: 'openrouter', keyLabel: 'OpenRouter API Key', keyPlaceholder: '輸入 OpenRouter API 金鑰 (免費註冊，可存取多種模型)' },
];

export const GEMINI_MODELS = [
  { label: 'Gemini 2.5 Flash (預設推薦・快速便宜)', value: 'gemini-2.5-flash' },
  { label: 'Gemini 1.5 Flash (免費配額充裕)', value: 'gemini-1.5-flash' },
  { label: 'Gemini 1.5 Pro (深度推理)', value: 'gemini-1.5-pro' },
  { label: 'Gemini 2.0 Flash Exp (實驗性・免費)', value: 'gemini-2.0-flash-exp' },
  { label: '⚙️ 自訂模型 (手動輸入)', value: 'custom' },
];

export const OPENROUTER_MODELS = [
  { label: 'Google Gemini 2.0 Flash Exp (OpenRouter 免費)', value: 'google/gemini-2.0-flash-exp:free' },
  { label: 'Mistral 7B Instruct (OpenRouter 免費)', value: 'mistralai/mistral-7b-instruct:free' },
  { label: 'Llama 3.2 3B Instruct (OpenRouter 免費)', value: 'meta-llama/llama-3.2-3b-instruct:free' },
  { label: 'Google Gemini 2.5 Flash', value: 'google/gemini-2.5-flash' },
  { label: 'DeepSeek V3', value: 'deepseek/deepseek-chat' },
  { label: 'Qwen 2.5 72B Instruct', value: 'qwen/qwen-2.5-72b-instruct' },
  { label: '⚙️ 自訂模型 (手動輸入)', value: 'custom' },
];

export const FONT_OPTIONS = [
  { label: '現代無襯線 (系統預設)', value: 'font-sans' },
  { label: '溫潤圓體 (Rounded)', value: 'font-round' },
  { label: '自然手寫 (Handwriting)', value: 'font-hand' },
  { label: '傳統明體 (Serif)', value: 'font-serif' },
  { label: '典雅楷體 (Kai)', value: 'font-kai' },
  { label: '等寬辨析 (Monospace)', value: 'font-mono' },
  { label: '思源黑體 (Noto Sans)', value: 'font-noto' },
  { label: '霞鶩文楷 (LXGW)', value: 'font-lxgw' },
];

export const FONT_STYLES = {
  'font-sans': 'ui-sans-serif, system-ui, sans-serif',
  'font-round': '"Varela Round", "Nunito", "Arial Rounded MT Bold", "PingFang TC", "Hiragino Sans GB", "Microsoft JhengHei", sans-serif',
  'font-hand': '"Klee One", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", "Hannotate TC", cursive',
  'font-serif': '"Noto Serif TC", "PMingLiU", "MingLiU", serif',
  'font-kai': '"DFKai-SB", "BiauKai", "Kaiti TC", "KaiTi", serif',
  'font-mono': '"JetBrains Mono", "Cascadia Code", "Fira Code", "Consolas", "Courier New", monospace',
  'font-noto': '"Noto Sans TC", "Source Han Sans TC", "Noto Sans SC", "Microsoft YaHei", "PingFang TC", "Hiragino Sans GB", sans-serif',
  'font-lxgw': '"LXGW WenKai TC", "LXGW WenKai", "KaiTi", "DFKai-SB", serif',
};

export const STORAGE_KEYS = {
  AUTOSAVE: 'outline_editor_autosave_v3',
  SETTINGS: 'outline_editor_settings',
};
