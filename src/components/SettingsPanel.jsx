import React, { useEffect } from 'react';
import { X, Settings, Key, FileText, Type, ExternalLink, Trash2 } from 'lucide-react';
import { AI_PROVIDERS, GEMINI_MODELS, OPENROUTER_MODELS, FONT_OPTIONS, STORAGE_KEYS } from '../constants/settings';
import { AI_PROMPT_PRESETS } from '../constants/prompts';

const SettingsPanel = ({ visible, onClose, settings, onSettingsChange, onSave, themeConfig, isDark }) => {
  if (!visible) return null;

  const provider = AI_PROVIDERS.find(p => p.value === settings.apiProvider) || AI_PROVIDERS[0];
  const modelList = settings.apiProvider === 'openrouter' ? OPENROUTER_MODELS : GEMINI_MODELS;

  // 向下相容：舊版 apiKeys 是字串，自動遷移至 gemini
  useEffect(() => {
    if (typeof settings.apiKeys === 'string') {
      const migrated = { gemini: settings.apiKeys, openrouter: '' };
      onSettingsChange({ apiKeys: migrated });
    }
  }, []); // eslint-disable-line

  const currentKey = typeof settings.apiKeys === 'object' ? (settings.apiKeys[settings.apiProvider] || '') : '';
  const updateKey = (val) => {
    const newKeys = { ...(typeof settings.apiKeys === 'object' ? settings.apiKeys : { gemini: settings.apiKeys || '', zen: '', openrouter: '' }) };
    newKeys[settings.apiProvider] = val;
    onSettingsChange({ apiKeys: newKeys });
  };

  const placeholders = { gemini: '輸入 Gemini API 金鑰（可多組逗號分隔）', openrouter: '輸入 OpenRouter API 金鑰' };
  const customPlaceholders = { openrouter: '如: anthropic/claude-sonnet-4-6', gemini: '如: gemini-4-flash' };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-xl p-6 shadow-2xl ${themeConfig.panelBg} ${themeConfig.text} ${themeConfig.panelBorder} border max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} className="opacity-60" /> 偏好與 AI 設定</h2>
          <button onClick={onClose} className={`p-1 rounded-full ${themeConfig.btnHover}`}><X size={20}/></button>
        </div>

        {/* 字型 */}
        <div className="mb-6">
          <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}><Type size={16} className="inline mr-1" /> 偏好字型</label>
          <select className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-stone-800 border-stone-700 text-stone-200' : 'focus:ring-teal-400 bg-white border-stone-200 text-stone-800'} text-sm`}
            onChange={e => onSettingsChange({ fontFamily: e.target.value })} value={settings.fontFamily}>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value} className={isDark ? 'bg-stone-800 text-stone-200' : 'bg-white text-stone-800'}>{f.label}</option>)}
          </select>
        </div>

        {/* Provider 切換 */}
        <div className="mb-4">
          <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}>AI 提供者</label>
          <div className="flex gap-2">
            {AI_PROVIDERS.map(p => (
              <button key={p.value} onClick={() => onSettingsChange({ apiProvider: p.value, apiModel: p.value === 'openrouter' ? OPENROUTER_MODELS[0].value : GEMINI_MODELS[0].value })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${settings.apiProvider === p.value ? (isDark ? 'bg-teal-700/30 border-teal-500 text-teal-300' : 'bg-teal-50 border-teal-400 text-teal-700') : `${themeConfig.btnHover} ${themeConfig.panelBorder}`}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 取得金鑰連結 */}
        <div className="mb-4">
          <a href={provider.url} target="_blank" rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}>
            <ExternalLink size={12} /> 取得 {provider.label} API 金鑰
          </a>
        </div>

        {/* API Key + 模型選擇 */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}><Key size={16} className="inline mr-1" /> API Key</label>
            <textarea value={currentKey} onChange={e => updateKey(e.target.value)}
              placeholder={placeholders[settings.apiProvider] || ''} rows={2}
              className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm font-mono`} />
          </div>
          <div className="w-1/3">
            <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}>指定模型</label>
            <select className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-stone-800 border-stone-700 text-stone-200' : 'focus:ring-teal-400 bg-white border-stone-200 text-stone-800'} text-sm`}
              onChange={e => onSettingsChange({ apiModel: e.target.value })} value={settings.apiModel}>
              {modelList.map(m => <option key={m.value} value={m.value} className={isDark ? 'bg-stone-800 text-stone-200' : 'bg-white text-stone-800'}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* 自訂模型 */}
        {settings.apiModel === 'custom' && (
          <div className="mb-6 animate-in fade-in">
            <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}>自訂模型名稱</label>
            <input type="text" value={settings.customModel} onChange={e => onSettingsChange({ customModel: e.target.value })}
              placeholder={customPlaceholders[settings.apiProvider] || '模型名稱'}
              className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700 text-white' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm`} />
          </div>
        )}

        {/* 提示詞 */}
        <div className="mb-6">
          <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}><FileText size={16} className="inline mr-1" /> 自訂 AI 拆分提示詞</label>
          <select className={`w-full mb-2 p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-stone-800 border-stone-700 text-stone-200' : 'focus:ring-teal-400 bg-white border-stone-200 text-stone-800'} text-sm`}
            onChange={e => onSettingsChange({ aiPrompt: e.target.value })}
            value={AI_PROMPT_PRESETS.find(p => p.value === settings.aiPrompt) ? settings.aiPrompt : 'custom'}>
            {AI_PROMPT_PRESETS.map((p, i) => <option key={i} value={p.value} className={isDark ? 'bg-stone-800 text-stone-200' : 'bg-white text-stone-800'}>{p.label}</option>)}
            <option value="custom" className={isDark ? 'bg-stone-800 text-stone-200' : 'bg-white text-stone-800'}>✍️ 自訂提示詞...</option>
          </select>
          <textarea value={settings.aiPrompt} onChange={e => onSettingsChange({ aiPrompt: e.target.value })} rows={6}
            className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm font-mono`} />
        </div>

        <div className="flex justify-between items-center">
          <button onClick={() => { if (confirm('確定要清除所有儲存的資料嗎？這會移除所有科判內容、設定與 API 金鑰。')) { localStorage.removeItem(STORAGE_KEYS.AUTOSAVE); localStorage.removeItem(STORAGE_KEYS.SETTINGS); localStorage.removeItem('kepan-ai-bg'); location.reload(); } }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded border transition-colors ${isDark ? 'border-red-800 text-red-400 hover:bg-red-900/30' : 'border-red-300 text-red-600 hover:bg-red-50'}`}>
            <Trash2 size={14} /> 清除所有資料
          </button>
          <button onClick={onSave} className={`px-6 py-2 text-white rounded font-medium transition-colors ${isDark ? 'bg-teal-700 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700'}`}>確認並儲存</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
