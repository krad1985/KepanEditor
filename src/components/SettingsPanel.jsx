import React from 'react';
import { X, Settings, Key, FileText, Type } from 'lucide-react';
import { AI_PROVIDERS, GEMINI_MODELS, ZEN_MODELS, OPENROUTER_MODELS, FONT_OPTIONS } from '../constants/settings';
import { AI_PROMPT_PRESETS } from '../constants/prompts';

const SettingsPanel = ({ visible, onClose, settings, onSettingsChange, onSave, themeConfig, isDark }) => {
  if (!visible) return null;

  const provider = AI_PROVIDERS.find(p => p.value === settings.apiProvider) || AI_PROVIDERS[0];
  const modelList = settings.apiProvider === 'zen' ? ZEN_MODELS : settings.apiProvider === 'openrouter' ? OPENROUTER_MODELS : GEMINI_MODELS;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-xl p-6 shadow-2xl ${themeConfig.panelBg} ${themeConfig.text} ${themeConfig.panelBorder} border max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} className="opacity-60" /> 偏好與 AI 設定</h2>
          <button onClick={onClose} className={`p-1 rounded-full ${themeConfig.btnHover}`}><X size={20}/></button>
        </div>

        <div className="mb-6">
          <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}><Type size={16} className="inline mr-1" /> 偏好字型 (全域)</label>
          <select className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-stone-800 border-stone-700 text-stone-200' : 'focus:ring-teal-400 bg-white border-stone-200 text-stone-800'} text-sm`}
            onChange={e => onSettingsChange({ fontFamily: e.target.value })} value={settings.fontFamily}>
            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value} className={isDark ? 'bg-stone-800 text-stone-200' : 'bg-white text-stone-800'}>{f.label}</option>)}
          </select>
        </div>

        <div className="mb-6">
          {/* 提供者選擇 */}
          <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}>AI 提供者</label>
          <div className="flex gap-2 mb-3">
            {AI_PROVIDERS.map(p => (
              <button key={p.value} onClick={() => onSettingsChange({ apiProvider: p.value, apiModel: p.value === 'zen' ? ZEN_MODELS[0].value : p.value === 'openrouter' ? OPENROUTER_MODELS[0].value : GEMINI_MODELS[0].value })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${settings.apiProvider === p.value ? (isDark ? 'bg-teal-700/30 border-teal-500 text-teal-300' : 'bg-teal-50 border-teal-400 text-teal-700') : `${themeConfig.btnHover} ${themeConfig.panelBorder}`}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}><Key size={16} className="inline mr-1" /> {provider.keyLabel}</label>
            <textarea value={settings.apiKeys} onChange={e => onSettingsChange({ apiKeys: e.target.value })}
              placeholder={provider.keyPlaceholder} rows={2}
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

        {settings.apiModel === 'custom' && (
          <div className="mb-6 animate-in fade-in">
            <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}>自訂模型名稱</label>
            <input type="text" value={settings.customModel} onChange={e => onSettingsChange({ customModel: e.target.value })}
              placeholder={settings.apiProvider === 'zen' ? '如: deepseek-v4-flash-free' : settings.apiProvider === 'openrouter' ? '如: anthropic/claude-sonnet-4-6' : '如: gemini-4-flash'}
              className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700 text-white' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm`} />
          </div>
        )}

        <div className="mb-6">
          <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}><FileText size={16} className="inline mr-1" /> 自訂 AI 拆分提示詞 (System Prompt)</label>
          <select className={`w-full mb-2 p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-stone-800 border-stone-700 text-stone-200' : 'focus:ring-teal-400 bg-white border-stone-200 text-stone-800'} text-sm`}
            onChange={e => onSettingsChange({ aiPrompt: e.target.value })}
            value={AI_PROMPT_PRESETS.find(p => p.value === settings.aiPrompt) ? settings.aiPrompt : 'custom'}>
            {AI_PROMPT_PRESETS.map((p, i) => <option key={i} value={p.value} className={isDark ? 'bg-stone-800 text-stone-200' : 'bg-white text-stone-800'}>{p.label}</option>)}
            <option value="custom" className={isDark ? 'bg-stone-800 text-stone-200' : 'bg-white text-stone-800'}>✍️ 自訂提示詞...</option>
          </select>
          <textarea value={settings.aiPrompt} onChange={e => onSettingsChange({ aiPrompt: e.target.value })} rows={6}
            className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm font-mono`} />
        </div>

        <div className="flex justify-end">
          <button onClick={onSave} className={`px-6 py-2 text-white rounded font-medium transition-colors ${isDark ? 'bg-teal-700 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700'}`}>確認並儲存</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
