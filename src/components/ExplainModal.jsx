import React from 'react';
import { X, Sparkles, Send } from 'lucide-react';
import { formatRichText } from '../utils/formatUtils';

const ExplainModal = ({ explainData, onClose, chatInput, onChatInputChange, onSendChat, isDark, themeConfig }) => {
  if (!explainData) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`w-full max-w-4xl rounded-xl shadow-2xl ${themeConfig.panelBg} ${themeConfig.text} ${themeConfig.panelBorder} border flex flex-col h-[85vh]`}>
        <div className={`flex justify-between items-center p-4 border-b ${themeConfig.panelBorder}`}>
          <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles size={18} className="text-purple-500" /> AI 智慧消文法師</h2>
          <button onClick={onClose} className={`p-1 rounded-full ${themeConfig.btnHover}`}><X size={20}/></button>
        </div>
        <div className={`p-4 border-b ${themeConfig.panelBorder} bg-purple-500/5`}>
          <div className="text-xs font-bold opacity-60 mb-2 tracking-wider">📜 探討段落：</div>
          <div className={`p-3 rounded-lg text-sm border-l-4 border-purple-500/40 ${isDark ? 'bg-black/30' : 'bg-white shadow-sm'}`}>{explainData.contextText}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {explainData.messages.slice(1).map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`text-xs opacity-50 mb-1 px-1 ${msg.role === 'user' ? 'text-right' : ''}`}>{msg.role === 'user' ? '您' : 'AI 法師'}</div>
              <div className={`max-w-[85%] p-4 rounded-2xl text-base leading-relaxed ${msg.role === 'user' ? `${isDark ? 'bg-teal-900/60' : 'bg-teal-50'} border ${themeConfig.border} rounded-tr-sm` : `${isDark ? 'bg-stone-800' : 'bg-stone-100'} rounded-tl-sm shadow-sm`}`}>
                {msg.role === 'user' ? msg.parts[0].text : <div dangerouslySetInnerHTML={{ __html: formatRichText(msg.parts[0].text, themeConfig) }} />}
              </div>
            </div>
          ))}
          {explainData.loading && (
            <div className="flex flex-col items-start">
              <div className="text-xs opacity-50 mb-1 px-1">AI 法師</div>
              <div className={`max-w-[85%] p-4 rounded-2xl rounded-tl-sm ${isDark ? 'bg-stone-800' : 'bg-stone-100'}`}>
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={`p-4 border-t ${themeConfig.panelBorder}`}>
          <div className="relative flex items-center">
            <input type="text" value={chatInput} onChange={e => onChatInputChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSendChat(); }}
              placeholder="向 AI 法師追問這段話的細節或生活應用..." disabled={explainData.loading}
              className={`w-full py-3 pl-4 pr-12 rounded-full border outline-none transition-shadow focus:ring-2 focus:ring-purple-400 ${isDark ? 'bg-stone-800 border-stone-700 text-white placeholder-stone-500' : 'bg-stone-50 border-stone-200 text-stone-800'}`} />
            <button onClick={onSendChat} disabled={explainData.loading || !chatInput.trim()}
              className={`absolute right-2 p-2 rounded-full transition-colors ${!chatInput.trim() || explainData.loading ? 'opacity-30 cursor-not-allowed' : 'text-white bg-purple-500 hover:bg-purple-600 shadow-md'}`}><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplainModal;
