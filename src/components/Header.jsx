import React, { useState, useRef, useEffect } from 'react';
import { ListTree, BookText, Columns, Map, Undo2, Redo2, Palette, Settings, FilePlus, FolderOpen, DownloadCloud, Copy, Save, Search, Keyboard, X, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

const MODES = [
  { key: 'text', label: '原文', icon: BookText },
  { key: 'outline', label: '科判', icon: ListTree },
  { key: 'split', label: '對讀', icon: Columns },
  { key: 'map', label: '鳥瞰', icon: Map },
];

const Header = ({ mode, onModeChange, canUndo, canRedo, onUndo, onRedo, onOpenSettings, onNewFile, onImportFile, onCopyMarkdown, onExportJSON, onExportMarkdown, isDark, themeConfig, isThemeMenuOpen, onToggleThemeMenu, onSelectTheme, THEMES, activeThemeKey, onExpandAll, onCollapseAll, onOpenShortcuts, searchQuery, onSearchChange, searchResults, onSearchSelect }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  return (
    <header className={`shadow-sm px-2 py-1.5 flex items-center sticky top-0 z-20 gap-0.5 border-b overflow-x-auto flex-nowrap ${themeConfig.headerBg} ${themeConfig.border}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overflowY: 'visible' }}>
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
      <div className="relative shrink-0 group/export">
        <button className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="匯出"><DownloadCloud size={14} /></button>
        <div className={`absolute top-full right-0 mt-1 w-40 rounded shadow-xl border opacity-0 group-hover/export:opacity-100 pointer-events-none group-hover/export:pointer-events-auto transition-opacity z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder} overflow-hidden`}>
          <button onClick={onCopyMarkdown} className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Copy size={11} /> 複製 Markdown (Notion)</button>
          <div className={`h-px w-full ${themeConfig.border}`} />
          <button onClick={onExportJSON} className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={11} /> 備份 JSON</button>
          <div className={`h-px w-full ${themeConfig.border}`} />
          <button onClick={onExportMarkdown} className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={11} /> 匯出 Markdown (Obsidian)</button>
        </div>
      </div>

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

      {/* 主題 */}
      <div className="relative shrink-0">
        <button onClick={onToggleThemeMenu} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="切換主題"><Palette size={14}/></button>
        {isThemeMenuOpen && (
          <div className={`absolute top-full right-0 mt-1 w-28 rounded-md shadow-xl border z-50 overflow-hidden ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
            {Object.entries(THEMES).map(([k, t]) => (
              <button key={k} onClick={() => { onSelectTheme(k); onToggleThemeMenu(); }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${activeThemeKey === k ? t.bold : t.text} ${t.btnHover}`}>{t.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* 設定 */}
      <button onClick={onOpenSettings} className={`p-1 rounded shrink-0 opacity-60 hover:opacity-100 ${themeConfig.btnHover}`} title="設定"><Settings size={14}/></button>
    </header>
  );
};

export default Header;