import React, { useState, useRef, useEffect } from 'react';
import { ListTree, BookText, Columns, Map, Undo2, Redo2, Palette, Settings, FilePlus, FolderOpen, DownloadCloud, Copy, Save, Search, Eye, EyeOff, Keyboard, X, MoreHorizontal } from 'lucide-react';

const MODES = [
  { key: 'text', label: '原文', icon: BookText },
  { key: 'outline', label: '科判', icon: ListTree },
  { key: 'split', label: '對讀', icon: Columns },
  { key: 'map', label: '鳥瞰', icon: Map },
];

const Header = ({ mode, onModeChange, canUndo, canRedo, onUndo, onRedo, onOpenSettings, onNewFile, onImportFile, onCopyMarkdown, onExportJSON, onExportMarkdown, isDark, themeConfig, isThemeMenuOpen, onToggleThemeMenu, onSelectTheme, THEMES, activeThemeKey, onExpandAll, onCollapseAll, readingMode, onToggleReadingMode, onOpenShortcuts, searchQuery, onSearchChange, searchResults, onSearchSelect }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const moreRef = useRef(null);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    const h = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header className={`shadow-sm px-3 py-1.5 flex items-center sticky top-0 z-20 gap-1 border-b ${themeConfig.headerBg} ${themeConfig.border}`}>
      {/* 左：標題 */}
      <h1 className="text-base font-bold flex items-center gap-1.5 shrink-0 mr-2">
        <ListTree size={18} className={themeConfig.bold.split(' ')[0]} />
        <span className="hidden md:inline text-sm">聞思科判</span>
      </h1>

      {/* 模式切換：純圖示 */}
      <div className={`flex rounded-md p-0.5 border gap-0.5 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
        {MODES.map(opt => { const Icon = opt.icon; const active = mode === opt.key; return (
          <button key={opt.key} onClick={() => onModeChange(opt.key)}
            className={`flex items-center justify-center w-7 h-7 rounded text-xs transition-colors ${active ? (isDark ? 'bg-stone-700 text-teal-300 shadow-sm' : 'bg-white shadow-sm text-teal-700') : `opacity-60 ${themeConfig.btnHover}`}`}
            title={opt.label}><Icon size={15} /></button>
        );})}
      </div>

      {/* 分隔 */}
      <div className={`w-px h-5 mx-1 shrink-0 ${themeConfig.border}`} />

      {/* 復原/重做 */}
      <button onClick={onUndo} disabled={!canUndo} className={`p-1 rounded-md transition-colors ${!canUndo ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover}`}`} title="復原 (Ctrl+Z)"><Undo2 size={15}/></button>
      <button onClick={onRedo} disabled={!canRedo} className={`p-1 rounded-md transition-colors ${!canRedo ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover}`}`} title="重做 (Ctrl+Y)"><Redo2 size={15}/></button>

      <div className={`w-px h-5 mx-1 shrink-0 ${themeConfig.border}`} />

      {/* 搜尋 */}
      <div className="relative">
        {searchOpen ? (
          <div className="flex items-center">
            <input ref={searchRef} type="text" value={searchQuery} onChange={e => onSearchChange(e.target.value)}
              placeholder="搜尋標題、內文..."
              className={`w-36 md:w-48 px-2 py-1 text-xs rounded border outline-none ${isDark ? 'bg-stone-800 border-stone-700 text-stone-200 placeholder-stone-500' : 'bg-white border-stone-300 text-stone-800 placeholder-stone-400'}`} />
            <button onClick={() => { setSearchOpen(false); onSearchChange(''); }} className={`-ml-6 p-0.5 rounded-full opacity-50 hover:opacity-100 ${themeConfig.btnHover}`}><X size={12} /></button>
            {searchQuery && searchResults && (
              <div ref={resultsRef} className={`absolute top-full left-0 mt-1 w-56 max-h-56 overflow-y-auto rounded-lg shadow-xl border z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                {searchResults.length === 0 ? (
                  <div className={`px-3 py-2 text-xs opacity-50`}>無符合結果</div>
                ) : (
                  searchResults.slice(0, 20).map((r, i) => (
                    <button key={`${r.node.id}-${i}`} onMouseDown={() => { onSearchSelect(r.node.id); setSearchOpen(false); onSearchChange(''); }}
                      className={`w-full text-left px-3 py-2 text-xs border-b last:border-0 transition-colors ${themeConfig.btnHover} ${themeConfig.border}`}>
                      <div className="font-medium truncate">{r.node.title || '(無標題)'}</div>
                      <div className="opacity-50 truncate mt-0.5">{r.node.content?.substring(0, 50) || r.node.note?.substring(0, 50) || ''}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className={`p-1 rounded-md opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="搜尋節點">
            <Search size={15} />
          </button>
        )}
      </div>

      {/* 分隔 */}
      <div className={`w-px h-5 mx-1 shrink-0 ${themeConfig.border}`} />

      {/* 檔案操作：純圖示 */}
      <button onClick={onNewFile} className={`p-1 rounded-md opacity-70 hover:opacity-100 ${themeConfig.btnHover}`} title="開新檔"><FilePlus size={15} /></button>
      <label className={`p-1 rounded-md opacity-70 hover:opacity-100 cursor-pointer ${themeConfig.btnHover}`} title="開啟檔案">
        <FolderOpen size={15} /><input type="file" accept=".json,.md,.markdown" onChange={onImportFile} className="hidden" />
      </label>
      <div className="relative group/export">
        <button className={`p-1 rounded-md opacity-70 hover:opacity-100 ${themeConfig.btnHover}`} title="匯出"><DownloadCloud size={15} /></button>
        <div className={`absolute top-full right-0 mt-1 w-44 rounded shadow-xl border opacity-0 group-hover/export:opacity-100 pointer-events-none group-hover/export:pointer-events-auto transition-opacity z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder} overflow-hidden`}>
          <button onClick={onCopyMarkdown} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Copy size={12} /> 複製 Markdown（Notion）</button>
          <div className={`h-px w-full ${themeConfig.border}`} />
          <button onClick={onExportJSON} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={12} /> 備份 JSON</button>
          <div className={`h-px w-full ${themeConfig.border}`} />
          <button onClick={onExportMarkdown} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={12} /> 匯出 Markdown（Obsidian）</button>
        </div>
      </div>

      {/* ⋯ 更多選單 */}
      <div className="relative" ref={moreRef}>
        <button onClick={() => setMoreOpen(v => !v)} className={`p-1 rounded-md opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="更多操作">
          <MoreHorizontal size={15} />
        </button>
        {moreOpen && (
          <div className={`absolute top-full right-0 mt-1 w-40 rounded-lg shadow-xl border z-50 overflow-hidden ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
            <button onClick={() => { onToggleReadingMode(); setMoreOpen(false); }} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}>
              {readingMode ? <EyeOff size={13} /> : <Eye size={13} />} 閱讀專注模式
            </button>
            <button onClick={() => { onExpandAll(); setMoreOpen(false); }} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}>
              <ChevronsDownUp size={13} /> 全部展開
            </button>
            <button onClick={() => { onCollapseAll(); setMoreOpen(false); }} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}>
              <ChevronsUpDown size={13} /> 全部收合
            </button>
            <div className={`h-px w-full ${themeConfig.border}`} />
            <button onClick={() => { onOpenShortcuts(); setMoreOpen(false); }} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}>
              <Keyboard size={13} /> 快捷鍵一覽
            </button>
            <button onClick={() => { onToggleThemeMenu(); setMoreOpen(false); }} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}>
              <Palette size={13} /> 切換主題
            </button>
            {isThemeMenuOpen && (
              <div className={`border-t ${themeConfig.border}`}>
                {Object.entries(THEMES).map(([k, t]) => (
                  <button key={k} onClick={() => { onSelectTheme(k); setMoreOpen(false); }} className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${activeThemeKey === k ? t.bold : t.text} ${t.btnHover}`}>{t.name}</button>
                ))}
              </div>
            )}
            <div className={`h-px w-full ${themeConfig.border}`} />
            <button onClick={() => { onOpenSettings(); setMoreOpen(false); }} className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}>
              <Settings size={13} /> 設定
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;