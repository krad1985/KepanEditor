import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ListTree, BookText, Columns, Map, Undo2, Redo2, Palette, Settings, FilePlus, FolderOpen, DownloadCloud, Copy, Save, Search, Keyboard, X, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

const MODES = [
  { key: 'text', label: '原文', icon: BookText },
  { key: 'outline', label: '科判', icon: ListTree },
  { key: 'split', label: '對讀', icon: Columns },
  { key: 'map', label: '鳥瞰', icon: Map },
];

const Header = ({ mode, onModeChange, canUndo, canRedo, onUndo, onRedo, onOpenSettings, onNewFile, onImportFile, onCopyMarkdown, onExportJSON, onExportMarkdown, isDark, themeConfig, isThemeMenuOpen, onToggleThemeMenu, onSelectTheme, THEMES, activeThemeKey, onExpandAll, onCollapseAll, onOpenShortcuts, searchQuery, onSearchChange, searchResults, onSearchSelect }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const searchRef = useRef(null);
  const exportBtnRef = useRef(null);
  const themeBtnRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ export: null, theme: null });

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  /* 開關 export / theme 時同步計算固定定位 */
  const toggleExport = useCallback(() => {
    if (!exportOpen && exportBtnRef.current) {
      const r = exportBtnRef.current.getBoundingClientRect();
      setDropdownPos(p => ({ ...p, export: { top: r.bottom + 4, left: r.right - 160 } }));
    }
    setExportOpen(p => !p);
  }, [exportOpen]);

  const toggleTheme = useCallback(() => {
    if (!isThemeMenuOpen && themeBtnRef.current) {
      const r = themeBtnRef.current.getBoundingClientRect();
      setDropdownPos(p => ({ ...p, theme: { top: r.bottom + 4, left: r.right - 112 } }));
    }
    onToggleThemeMenu();
  }, [isThemeMenuOpen, onToggleThemeMenu]);

  /* 點擊外部關閉 export 與 search */
  useEffect(() => {
    const handler = (e) => {
      if (exportOpen && exportBtnRef.current && !exportBtnRef.current.contains(e.target) && !e.target.closest('[data-export-panel]')) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  return (
    <header className={`shadow-sm px-2 py-1.5 sticky top-0 z-20 border-b ${themeConfig.headerBg} ${themeConfig.border}`}>
      <div className="flex items-center gap-0.5 overflow-x-auto flex-nowrap"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* 標題 */}
        <h1 className="text-sm font-bold flex items-center gap-1 shrink-0 mr-1.5">
          <ListTree size={16} className={themeConfig.bold.split(' ')[0]} />
          <span className="hidden sm:inline">聞思</span>
        </h1>

        {/* 檔案操作 */}
        <button onClick={onNewFile} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="開新檔"><FilePlus size={14} /></button>
        <label className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 cursor-pointer ${themeConfig.btnHover}`} title="開啟檔案">
          <FolderOpen size={14} /><input type="file" accept=".json,.md,.markdown" onChange={onImportFile} className="hidden" />
        </label>
        <button ref={exportBtnRef} onClick={toggleExport} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="匯出"><DownloadCloud size={14} /></button>

        <div className={`w-px h-4 mx-0.5 shrink-0 ${themeConfig.border}`} />

        {/* 模式切換 */}
        <div className={`flex rounded-md p-0.5 border gap-0.5 shrink-0 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
          {MODES.map(opt => { const Icon = opt.icon; const active = mode === opt.key; return (
            <button key={opt.key} onClick={() => onModeChange(opt.key)}
              className={`flex items-center justify-center w-7 h-6 rounded text-xs transition-colors ${active ? (isDark ? 'bg-stone-700 text-teal-300 shadow-sm' : 'bg-white shadow-sm text-teal-700') : `opacity-60 ${themeConfig.btnHover}`}`}
              title={opt.label}><Icon size={14} /></button>
          );})}
        </div>

        <div className={`w-px h-4 mx-0.5 shrink-0 ${themeConfig.border}`} />

        {/* 復原/重做 */}
        <button onClick={onUndo} disabled={!canUndo} className={`p-1 rounded shrink-0 transition-colors ${!canUndo ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover}`}`} title="復原 (Ctrl+Z)"><Undo2 size={14}/></button>
        <button onClick={onRedo} disabled={!canRedo} className={`p-1 rounded shrink-0 transition-colors ${!canRedo ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover}`}`} title="重做 (Ctrl+Y)"><Redo2 size={14}/></button>

        <div className={`w-px h-4 mx-0.5 shrink-0 ${themeConfig.border}`} />

        {/* 搜尋 */}
        <div className="relative shrink-0">
          {searchOpen ? (
            <div className="flex items-center">
              <input ref={searchRef} type="text" value={searchQuery} onChange={e => onSearchChange(e.target.value)}
                placeholder="搜尋..."
                className={`w-28 md:w-40 px-1.5 py-0.5 text-xs rounded border outline-none ${isDark ? 'bg-stone-800 border-stone-700 text-stone-200 placeholder-stone-500' : 'bg-white border-stone-300 text-stone-800 placeholder-stone-400'}`} />
              <button onClick={() => { setSearchOpen(false); onSearchChange(''); }} className={`-ml-5 p-0.5 rounded-full opacity-50 hover:opacity-100 ${themeConfig.btnHover}`}><X size={11} /></button>
              {searchQuery && searchResults && (
                <div className={`absolute top-full left-0 mt-1 w-52 max-h-52 overflow-y-auto rounded-lg shadow-xl border z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                  {searchResults.length === 0 ? (
                    <div className={`px-3 py-2 text-xs opacity-50`}>無符合結果</div>
                  ) : (
                    searchResults.slice(0, 15).map((r, i) => (
                      <button key={`${r.node.id}-${i}`} onMouseDown={() => { onSearchSelect(r.node.id); setSearchOpen(false); onSearchChange(''); }}
                        className={`w-full text-left px-3 py-1.5 text-xs border-b last:border-0 transition-colors ${themeConfig.btnHover} ${themeConfig.border}`}>
                        <div className="font-medium truncate">{r.node.title || '(無標題)'}</div>
                        <div className="opacity-50 truncate mt-0.5 text-[10px]">{r.node.content?.substring(0, 40) || r.node.note?.substring(0, 40) || ''}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="搜尋節點">
              <Search size={14} />
            </button>
          )}
        </div>

        <div className={`w-px h-4 mx-0.5 shrink-0 ${themeConfig.border}`} />

        {/* 全部展開/收合 — 僅科判模式 */}
        {mode === 'outline' && (
          <>
            <button onClick={onExpandAll} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="全部展開"><ChevronsDownUp size={14} /></button>
            <button onClick={onCollapseAll} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="全部收合"><ChevronsUpDown size={14} /></button>
          </>
        )}

        {/* 快捷鍵 */}
        <button onClick={onOpenShortcuts} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="快捷鍵一覽"><Keyboard size={14} /></button>

        {/* 主題 (觸發按鈕) */}
        <span ref={themeBtnRef}>
          <button onClick={toggleTheme} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="切換主題"><Palette size={14}/></button>
        </span>

        {/* 設定 */}
        <button onClick={onOpenSettings} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="設定"><Settings size={14}/></button>
      </div>

      {/* 匯出下拉選單 (在 overflow 容器之外 render) */}
      {exportOpen && dropdownPos.export && (
        <div data-export-panel
          className={`fixed w-40 rounded shadow-xl border overflow-hidden z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}
          style={{ top: dropdownPos.export.top, left: dropdownPos.export.left }}>
          <button onClick={() => { onCopyMarkdown(); setExportOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Copy size={11} /> 複製 Markdown (Notion)</button>
          <div className={`h-px w-full ${themeConfig.border}`} />
          <button onClick={() => { onExportJSON(); setExportOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={11} /> 備份 JSON</button>
          <div className={`h-px w-full ${themeConfig.border}`} />
          <button onClick={() => { onExportMarkdown(); setExportOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={11} /> 匯出 Markdown (Obsidian)</button>
        </div>
      )}

      {/* 主題下拉選單 (在 overflow 容器之外 render) */}
      {isThemeMenuOpen && dropdownPos.theme && (
        <div className={`fixed w-28 rounded-md shadow-xl border overflow-hidden z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}
          style={{ top: dropdownPos.theme.top, left: dropdownPos.theme.left }}>
          {Object.entries(THEMES).map(([k, t]) => (
            <button key={k} onClick={() => { onSelectTheme(k); onToggleThemeMenu(); }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${activeThemeKey === k ? t.bold : t.text} ${t.btnHover}`}>{t.name}</button>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;
