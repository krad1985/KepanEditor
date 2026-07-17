import React from 'react';
import { X, ImageIcon, Leaf, Download, Sparkles, Wand2, ListTree } from 'lucide-react';
import { formatRichText } from '../utils/formatUtils';
import { THEMES } from '../constants/themes';

const QuoteCardModal = ({ quoteCardNode, aiBgImage, isGeneratingBg, onClose, onDownload, onGenerateBg, themeConfig, settingsThemeKey }) => {
  if (!quoteCardNode) return null;
  return (
    <div className="fixed inset-0 bg-stone-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="flex flex-col items-center max-w-lg w-full gap-6">
        <div className="flex w-full justify-between items-center px-2">
          <h3 className="text-white font-bold tracking-widest text-sm flex items-center gap-2"><ImageIcon size={16} /> 法語金句卡</h3>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full"><X size={18}/></button>
        </div>
        <div id="quote-card-element" className={`w-full aspect-square ${THEMES[settingsThemeKey].cardBg} rounded-3xl shadow-2xl p-10 md:p-14 flex flex-col justify-center relative overflow-hidden border border-white/20`}>
          {aiBgImage && <img src={aiBgImage} alt="AI Background" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity z-0" />}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-emerald-500 to-sky-500 z-10"></div>
          <div className={`absolute top-8 right-8 ${themeConfig.bold} opacity-10 z-10`}><Leaf size={64}/></div>
          <h2 className={`text-2xl md:text-3xl font-bold mb-6 z-10 ${themeConfig.bold} tracking-wide leading-tight`}>{String(quoteCardNode.title || '')}</h2>
          {quoteCardNode.content && <p className={`text-lg md:text-xl leading-[1.8] z-10 ${themeConfig.text} font-serif drop-shadow-sm`} dangerouslySetInnerHTML={{ __html: formatRichText(String(quoteCardNode.content), themeConfig) }} />}
          {quoteCardNode.note && (
            <div className={`mt-8 p-5 rounded-2xl border-l-4 z-10 ${themeConfig.noteBg} bg-opacity-80 backdrop-blur-md shadow-sm`}>
              <div className="text-xs font-bold opacity-60 mb-2 tracking-widest uppercase">📝 札記 / Insight</div>
              <div className="text-sm italic leading-relaxed" dangerouslySetInnerHTML={{ __html: formatRichText(String(quoteCardNode.note), themeConfig) }} />
            </div>
          )}
          <div className="absolute bottom-8 left-10 text-[10px] font-bold opacity-40 tracking-[0.2em] uppercase flex items-center gap-1.5 z-10"><ListTree size={12} /> 聞思科判筆記</div>
        </div>
        <div className="flex gap-4">
          <button onClick={onDownload} className="flex items-center gap-2 px-6 py-3 bg-white text-stone-900 rounded-full font-bold shadow-xl hover:scale-105 hover:bg-teal-50 transition-all"><Download size={18} /> 儲存高畫質圖片</button>
          <button onClick={onGenerateBg} disabled={isGeneratingBg} className="flex items-center gap-2 px-6 py-3 bg-purple-600/90 hover:bg-purple-600 text-white rounded-full font-bold shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100">
            {isGeneratingBg ? <Wand2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {isGeneratingBg ? '意境繪製中...' : 'AI 意境背景'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteCardModal;
