import React from 'react';
import { X, Sparkles, Quote, Tags, FileText, Loader2, AlertCircle } from 'lucide-react';

const AIAnalysisModal = ({ visible, onClose, result, isLoading, error, themeConfig, isDark }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-lg rounded-xl p-0 shadow-2xl ${themeConfig.panelBg} ${themeConfig.text} ${themeConfig.panelBorder} border max-h-[80vh] overflow-hidden flex flex-col`}
        onClick={e => e.stopPropagation()}>

        {/* 標題列 */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${themeConfig.border}`}>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" />
            AI 整文分析
          </h2>
          <button onClick={onClose} className={`p-1 rounded-full ${themeConfig.btnHover}`}><X size={18} /></button>
        </div>

        {/* 內容 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={32} className="animate-spin text-purple-500" />
              <p className="text-sm opacity-60">正在分析全文…</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-500">分析失敗</p>
                <p className="text-xs opacity-70 mt-1">{error}</p>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <>
              {/* 摘要 */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2 opacity-60">
                  <FileText size={14} /> 全文摘要
                </h3>
                <p className={`text-sm leading-relaxed p-3 rounded-lg ${isDark ? 'bg-stone-800/50' : 'bg-stone-100'}`}>
                  {result.summary}
                </p>
              </section>

              {/* 金句 */}
              {result.goldenSentences?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2 opacity-60">
                    <Quote size={14} /> 金句摘錄
                  </h3>
                  <div className="space-y-2">
                    {result.goldenSentences.map((s, i) => (
                      <blockquote key={i} className={`p-3 rounded-lg border-l-4 text-sm leading-relaxed ${isDark ? 'bg-stone-800/50 border-amber-600' : 'bg-amber-50 border-amber-400'}`}>
                        <p className="italic">「{s.text}」</p>
                        {s.source && <cite className={`text-xs mt-1 block opacity-60 not-italic`}>— {s.source}</cite>}
                      </blockquote>
                    ))}
                  </div>
                </section>
              )}

              {/* 標籤 */}
              {result.tags?.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2 opacity-60">
                    <Tags size={14} /> 建議標籤
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.tags.map((tag, i) => (
                      <span key={i}
                        className={`px-2.5 py-1 text-xs rounded-full font-medium ${isDark ? 'bg-teal-900/50 text-teal-300 border border-teal-700/50' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {result && !isLoading && (
          <div className={`px-5 py-3 border-t flex justify-end ${themeConfig.border}`}>
            <button onClick={onClose}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${isDark ? 'bg-stone-700 hover:bg-stone-600' : 'bg-stone-200 hover:bg-stone-300'}`}>
              關閉
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisModal;
