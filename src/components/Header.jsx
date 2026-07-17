import React from 'react';
import { ListTree, BookText, Columns, Map, Undo2, Redo2, Palette, Settings, FilePlus, FolderOpen, DownloadCloud, Copy, Save } from 'lucide-react';

const MODES = [
  { key: 'text', label: '原文模式', icon: BookText },
  { key: 'outline', label: '科判模式', icon: ListTree },
  { key: 'split', label: '對讀模式', icon: Columns },
  { key: 'map', label: '鳥瞰模式', icon: Map },
];

const Header = ({ mode, onModeChange, canUndo, canRedo, onUndo, onRedo, onOpenSettings, onNewFile, onImportFile, onCopyMarkdown, onExportJSON, onExportMarkdown, isDark, themeConfig, isThemeMenuOpen, onToggleThemeMenu, onSelectTheme, THEMES, activeThemeKey }) => (
  <header className={`shadow-sm px-6 py-3 flex flex-wrap justify-between items-center sticky top-0 z-20 gap-4 border-b ${themeConfig.headerBg} ${themeConfig.border}`}>
    <div className="flex items-center gap-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><ListTree className={themeConfig.bold.split(' ')[0]} />聞思科判編輯器</h1>
      <div className={`flex rounded-lg p-1 border gap-1 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
        {MODES.map(opt => { const Icon = opt.icon; const active = mode === opt.key; return (
          <button key={opt.key} onClick={() => onModeChange(opt.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active ? (isDark ? 'bg-stone-700 text-teal-300 shadow' : 'bg-white shadow text-teal-700') : `opacity-60 ${themeConfig.btnHover}`}`}
            title={opt.label}><Icon size={16} /><span className="hidden sm:inline">{opt.label}</span></button>
        );})}
      </div>
    </div>
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1">
        <button onClick={onUndo} disabled={!canUndo} className={`p-1.5 rounded-md transition-colors ${!canUndo ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover} ${themeConfig.bold}`}`} title="復原 (Ctrl+Z)"><Undo2 size={18}/></button>
        <button onClick={onRedo} disabled={!canRedo} className={`p-1.5 rounded-md transition-colors ${!canRedo ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover} ${themeConfig.bold}`}`} title="重做 (Ctrl+Y)"><Redo2 size={18}/></button>
      </div>
      <div className={`w-px h-4 mx-1 ${themeConfig.border}`} />
      <div className="relative">
        <button onClick={onToggleThemeMenu} className={`p-1.5 rounded-md flex items-center gap-1 opacity-80 ${themeConfig.btnHover} transition-colors`} title="切換沉浸主題"><Palette size={18}/></button>
        {isThemeMenuOpen && (
          <div className={`absolute top-full right-0 mt-2 w-36 rounded-md shadow-xl border z-50 overflow-hidden ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
            {Object.entries(THEMES).map(([k, t]) => (
              <button key={k} onClick={() => { onSelectTheme(k); onToggleThemeMenu(); }} className={`w-full text-left px-4 py-2 text-sm transition-colors ${activeThemeKey === k ? t.bold : t.text} ${t.btnHover}`}>{t.name}</button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onOpenSettings} className={`p-1.5 rounded-md opacity-80 ${themeConfig.btnHover} transition-colors`} title="設定"><Settings size={18}/></button>
      <div className={`w-px h-4 mx-1 ${themeConfig.border}`} />
      <button onClick={onNewFile} className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${themeConfig.panelBg} ${themeConfig.panelBorder} ${themeConfig.btnHover}`} title="建立新檔案"><FilePlus size={16} /><span className="hidden sm:inline">開新檔</span></button>
      <label className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${themeConfig.panelBg} ${themeConfig.panelBorder} ${themeConfig.btnHover}`} title="匯入 JSON 或 Markdown"><FolderOpen size={16} /><span className="hidden sm:inline">開啟</span><input type="file" accept=".json,.md,.markdown" onChange={onImportFile} className="hidden" /></label>
      <div className="relative group/export">
        <button className={`flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white rounded shadow-sm transition-colors ${isDark ? 'bg-teal-700 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700'}`}><DownloadCloud size={16} /><span className="hidden sm:inline">匯出</span></button>
        <div className={`absolute top-full right-0 mt-1 w-56 rounded shadow-xl border opacity-0 group-hover/export:opacity-100 pointer-events-none group-hover/export:pointer-events-auto transition-opacity z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder} overflow-hidden`}>
          <button onClick={onCopyMarkdown} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 ${themeConfig.btnHover}`}><Copy size={14} /> 複製 Markdown（Notion 用）</button>
          <div className={`h-px w-full ${themeConfig.border}`} />
          <button onClick={onExportJSON} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={14} /> 備份 JSON 檔</button>
          <div className={`h-px w-full ${themeConfig.border}`} />
          <button onClick={onExportMarkdown} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 ${themeConfig.btnHover}`}><Save size={14} /> 匯出 Markdown（Obsidian 用）</button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
