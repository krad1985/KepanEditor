import React, { useState, useRef, useEffect } from 'react';
import { ListTree, BookText, Columns, Map, Undo2, Redo2, Palette, Settings, FilePlus, FolderOpen, DownloadCloud, Copy, Save, Search, ChevronsUpDown, ChevronsDownUp, Eye, EyeOff, Keyboard, X } from 'lucide-react';

const MODES = [
  { key: 'text', label: '原文模式', icon: BookText },
  { key: 'outline', label: '科判模式', icon: ListTree },
  { key: 'split', label: '對讀模式', icon: Columns },
  { key: 'map', label: '鳥瞰模式', icon: Map },
];

const Header = ({ mode, onModeChange, canUndo, canRedo, onUndo, onRedo, onOpenSettings, onNewFile, onImportFile, onCopyMarkdown, onExportJSON, onExportMarkdown, isDark, themeConfig, isThemeMenuOpen, onToggleThemeMenu, onSelectTheme, THEMES, activeThemeKey, onExpandAll, onCollapseAll, readingMode, onToggleReadingMode, onOpenShortcuts, searchQuery, onSearchChange, searchResults, onSearchSelect }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (searchOpen && searchRef.current) { searchRef.current.focus(); }
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target) && searchRef.current && !searchRef.current.contains(e.target)) {
        // 不關閉，讓使用者繼續打字
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (<>
    <header className={`shadow-sm px-4 md:px-6 py-2 md:py-3 flex flex-wrap justify-between items-center sticky top-0 z-20 gap-2 border-b ${themeConfig.headerBg} ${themeConfig.border}`}>
      {/* 左側：標題 + 模式切換 */}
      <div className="flex items-center gap-2 md:gap-4">
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 shrink-0">
          <ListTree className={themeConfig.bold.split(' ')[0]} />
          <span className="hidden sm:inline">聞思科判編輯器</span>
        </h1>
        <div className={`flex rounded-lg p-0.5 md:p-1 border gap-0.5 md:gap-1 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
          {MODES.map(opt => { const Icon = opt.icon; const active = mode === opt.key; return (
            <button key={opt.key} onClick={() => onModeChange(opt.key)}
              className={`flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors ${active ? (isDark ? 'bg-stone-700 text-teal-300 shadow' : 'bg-white shadow text-teal-700') : `opacity-60 ${themeConfig.btnHover}`}`}
              title={opt.label}><Icon size={14} /><span className="hidden sm:inline">{opt.label}</span></button>
          );})}
        </div>
      </div>

      {/* 右側工具列 */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* 搜尋 */}
        <div className="relative">
          {searchOpen ? (
            <div className="flex items-center">
              <input ref={searchRef} type="text" value={searchQuery} onChange={e => onSearchChange(e.target.value)}
                placeholder="搜尋標題、內文或筆記..."
                className={`w-40 md:w-56 px-2 py-1.5 text-sm rounded border outline-none transition-all ${isDark ? 'bg-stone-800 border-stone-700 text-stone-200 placeholder-stone-500' : 'bg-white border-stone-300 text-stone-800 placeholder-stone-400'}`} />
              <button onClick={() => { setSearchOpen(false); onSearchChange(''); }} className={`-ml-7 p-1 rounded-full opacity-50 hover:opacity-100 ${themeConfig.btnHover}`}><X size={14} /></button>
              {searchQuery && searchResults && (
                <div ref={resultsRef} className={`absolute top-full left-0 mt-1 w-56 md:w-64 max-h-64 overflow-y-auto rounded-lg shadow-xl border z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                  {searchResults.length === 0 ? (
                    <div className={`px-4 py-3 text-sm opacity-50`}>無符合結果</div>
                  ) : (
                    searchResults.slice(0, 20).map((r, i) => (
                      <button key={`${r.node.id}-${i}`} onMouseDown={() => { onSearchSelect(r.node.id); setSearchOpen(false); onSearchChange(''); }}
                        className={`w-full text-left px-4 py-2.5 text-sm border-b last:border-0 transition-colors ${themeConfig.btnHover} ${themeConfig.border}`}>
                        <div className="font-medium truncate">{r.node.title || '(無標題)'}</div>
                        <div className="text-xs opacity-50 truncate mt-0.5">
                          {r.node.content?.substring(0, 60) || r.node.note?.substring(0, 60) || ''}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className={`p-1.5 rounded-md opacity-70 hover:opacity-100 ${themeConfig.btnHover} transition-colors`} title="搜尋節點 (點擊展開)">
              <Search size={16} />
            </button>
          )}
        </div>

        {/* 閱讀模式 */}
        <button onClick={onToggleReadingMode} className={`p-1.5 rounded-md transition-colors ${readingMode ? 'text-teal-500 bg-teal-500/10' : 'opacity-70 hover:opacity-100'} ${themeConfig.btnHover}`}
          title={readingMode ? '離開閱讀專注模式' : '閱讀專注模式'}>{readingMode ? <EyeOff size={16} /> : <Eye size={16} />}</button>

        {/* 全部展開/收合 */}
        <button onClick={onExpandAll} className={`p-1.5 rounded-md opacity-70 hover:opacity-100 ${themeConfig.btnHover} transition-colors`} title="全部展開"><ChevronsDownUp size={16} /></button>
        <button onClick={onCollapseAll} className={`p-1.5 rounded-md opacity-70 hover:opacity-100 ${themeConfig.btnHover} transition-colors`} title="全部收合"><ChevronsUpDown size={16} /></button>

        {/* 快捷鍵 */}
        <button onClick={onOpenShortcuts} className={`p-1.5 rounded-md opacity-70 hover:opacity-100 ${themeConfig.btnHover} transition-colors`} title="快捷鍵一覽"><Keyboard size={16} /></button>

        {!readingMode && (<>
          <div className={`w-px h-4 mx-0.5 ${themeConfig.border}`} />

          {/* 復原/重做 */}
          <div className="flex items-center gap-0.5">
            <button onClick={onUndo} disabled={!canUndo} className={`p-1.5 rounded-md transition-colors ${!canUndo ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover} ${themeConfig.bold}`}`} title="復原 (Ctrl+Z)"><Undo2 size={16}/></button>
            <button onClick={onRedo} disabled={!canRedo} className={`p-1.5 rounded-md transition-colors ${!canRedo ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover} ${themeConfig.bold}`}`} title="重做 (Ctrl+Y)"><Redo2 size={16}/></button>
          </div>

          <div className={`w-px h-4 mx-0.5 ${themeConfig.border}`} />

          {/* 主題 */}
          <div className="relative">
            <button onClick={onToggleThemeMenu} className={`p-1.5 rounded-md flex items-center gap-1 opacity-80 ${themeConfig.btnHover} transition-colors`} title="切換沉浸主題"><Palette size={16}/></button>
            {isThemeMenuOpen && (
              <div className={`absolute top-full right-0 mt-2 w-32 rounded-md shadow-xl border z-50 overflow-hidden ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                {Object.entries(THEMES).map(([k, t]) => (
                  <button key={k} onClick={() => { onSelectTheme(k); onToggleThemeMenu(); }} className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeThemeKey === k ? t.bold : t.text} ${t.btnHover}`}>{t.name}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={onOpenSettings} className={`p-1.5 rounded-md opacity-80 ${themeConfig.btnHover} transition-colors`} title="設定"><Settings size={16}/></button>

          <div className={`w-px h-4 mx-0.5 ${themeConfig.border}`} />

          {/* 檔案操作 */}
          <button onClick={onNewFile} className={`flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${themeConfig.panelBg} ${themeConfig.panelBorder} ${themeConfig.btnHover}`} title="建立新檔案"><FilePlus size={14} /><span className="hidden sm:inline">開新檔</span></button>
          <label className={`flex items-center gap-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${themeConfig.panelBg} ${themeConfig.panelBorder} ${themeConfig.btnHover}`} title="匯入 JSON 或 Markdown"><FolderOpen size={14} /><span className="hidden sm:inline">開啟</span><input type="file" accept=".json,.md,.markdown" onChange={onImportFile} className="hidden" /></label>
          <div className="relative group/export">
            <button className={`flex items-center gap-1 px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium text-white rounded shadow-sm transition-colors ${isDark ? 'bg-teal-700 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700'}`}><DownloadCloud size={14} /><span className="hidden sm:inline">匯出</span></button>
            <div className={`absolute top-full right-0 mt-1 w-52 rounded shadow-xl border opacity-0 group-hover/export:opacity-100 pointer-events-none group-hover/export:pointer-events-auto transition-opacity z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder} overflow-hidden`}>
              <button onClick={onCopyMarkdown} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 ${themeConfig.btnHover}`}><Copy size={14} /> 複製 Markdown（Notion 用）</button>
              <div className={`h-px w-full ${themeConfig.border}`} />
              <button onClick={onExportJSON} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={14} /> 備份 JSON 檔</button>
              <div className={`h-px w-full ${themeConfig.border}`} />
              <button onClick={onExportMarkdown} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={14} /> 匯出 Markdown（Obsidian 用）</button>
            </div>
          </div>
        </>)}
      </div>
    </header>

    {/* 搜尋結果下拉（當 searchOpen 關閉但有 query 時清空） */}
    {searchOpen && searchQuery && searchResults && searchResults.length > 0 && (
      <div className={`relative z-10 ${themeConfig.panelBg}`}>
        <div className={`absolute right-4 top-0 text-xs opacity-50 px-2 py-1`}>
          找到 {searchResults.length} 個結果（顯示前 20 筆）
        </div>
      </div>
    )}
  </>);
};

export default Header;
