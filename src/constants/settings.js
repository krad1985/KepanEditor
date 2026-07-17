export const DEFAULT_SETTINGS = {
  themeKey: 'default',
  apiKeys: '',
  apiModel: 'gemini-2.5-flash',
  customModel: '',
  fontFamily: 'font-sans',
  aiPrompt: `請分析以下佛教經典/開示原文，將其意群切分為合適的子科判骨架。\n必須嚴格回傳 JSON 格式，架構如下 (只需回傳子層陣列):\n[ { "title": "科判標題", "content": "該標題對應的拆分後內文", "note": "" } ]\n\n注意：請務必只回傳合法的 JSON 陣列，不要有任何多餘的解釋文字。`,
};

export const AI_MODELS = [
  { label: 'Gemini 2.5 Flash (預設推薦)', value: 'gemini-2.5-flash' },
  { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
  { label: 'Gemini 3.1 Flash Lite', value: 'gemini-3.1-flash-lite' },
  { label: 'Gemini 3 Flash Preview', value: 'gemini-3-flash-preview' },
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
