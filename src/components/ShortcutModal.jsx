import React from 'react';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { category: '樹狀操作', keys: [
    { combo: 'Enter', desc: '新增同層節點（在標題輸入框）' },
    { combo: 'Tab', desc: '縮排（向右移一層）' },
    { combo: 'Shift+Tab', desc: '凸排（向左移一層）' },
    { combo: 'Ctrl+↑ / Ctrl+↓', desc: '上移 / 下移節點' },
    { combo: '拖曳節點左側把手', desc: '拖曳排序，可拖至上方/下方/內層' },
  ]},
  { category: '內文編輯', keys: [
    { combo: 'Ctrl+Enter', desc: '在游標處拆分，新增同層節點' },
    { combo: 'Ctrl+Shift+Enter', desc: '在游標處拆分，新增子層節點' },
    { combo: 'Ctrl+Shift+N', desc: '從選取文字建立子節點' },
    { combo: '/', desc: '在行首或空格後觸發快速插入模板' },
  ]},
  { category: '格式標記', keys: [
    { combo: '選取文字 + 按「重點」', desc: '以螢光標記 ==重點==' },
    { combo: '選取文字 + 按「粗體」', desc: '以粗體標記 **粗體**' },
  ]},
  { category: '系統操作', keys: [
    { combo: 'Ctrl+Z / Ctrl+Y', desc: '復原 / 重做' },
    { combo: 'ESC', desc: '退出聚焦模式 / 關閉選單' },
    { combo: '?', desc: '開啟此快捷鍵一覽' },
  ]},
];

const ShortcutModal = ({ visible, onClose, themeConfig, isDark }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${themeConfig.border}`}>
          <h2 className="text-lg font-bold flex items-center gap-2"><Keyboard size={20} /> 快捷鍵一覽</h2>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${themeConfig.btnHover}`}><X size={20} /></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {SHORTCUTS.map(group => (
            <div key={group.category}>
              <h3 className={`text-sm font-bold mb-2 uppercase tracking-wider opacity-60 ${themeConfig.bold}`}>{group.category}</h3>
              <div className="space-y-2">
                {group.keys.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-sm opacity-80">{item.desc}</span>
                    <kbd className={`shrink-0 px-2.5 py-1 text-xs font-mono rounded border shadow-sm ${isDark ? 'bg-stone-800 border-stone-700 text-stone-300' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>{item.combo}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={`px-6 py-3 border-t text-xs opacity-50 text-center ${themeConfig.border}`}>
          按下 <kbd className={`px-1.5 py-0.5 rounded border ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-stone-100 border-stone-200'}`}>?</kbd> 隨時開啟此面板
        </div>
      </div>
    </div>
  );
};

export default ShortcutModal;