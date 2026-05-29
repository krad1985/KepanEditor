// Version: 2.0.0 - 支援多組 API 金鑰輪替避開 429、自訂 AI 模型名稱、擴充沉浸式護眼主題
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, ListTree, ChevronRight, ChevronDown, 
  Trash2, Save, FolderOpen, Target, Home, 
  SplitSquareHorizontal, GripVertical, AlignLeft,
  Undo2, Redo2, Columns, Map, BookOpen, Wand2, Settings,
  X, Sun, Moon, Leaf, BookText, FilePlus, Highlighter, Bold, Key, Palette
} from 'lucide-react';

// --- 工具函數 ---
const generateUniqueId = () => Math.random().toString(36).substr(2, 9);
const deepCloneKepanTree = (treeNodes) => JSON.parse(JSON.stringify(treeNodes));

const findPathInKepanTree = (treeNodes, targetNodeId, currentPath = []) => {
  for (let kepanNode of treeNodes) {
    const newPath = [...currentPath, { id: kepanNode.id, title: kepanNode.title }];
    if (kepanNode.id === targetNodeId) return newPath;
    if (kepanNode.children) {
      const foundPath = findPathInKepanTree(kepanNode.children, targetNodeId, newPath);
      if (foundPath) return foundPath;
    }
  }
  return null;
};

const findNodeInKepanTree = (treeNodes, targetNodeId) => {
  for (let kepanNode of treeNodes) {
    if (kepanNode.id === targetNodeId) return kepanNode;
    if (kepanNode.children) {
      const foundNode = findNodeInKepanTree(kepanNode.children, targetNodeId);
      if (foundNode) return foundNode;
    }
  }
  return null;
};

// --- 輕量級富文本解析 ---
const formatRichText = (txt, themeConfig) => {
  if (!txt) return '';
  let html = txt
    .replace(/</g, '&lt;').replace(/>/g, '&gt;') // 防 XSS
    .replace(/==(.*?)==/g, `<mark class="${themeConfig.highlight} px-1 mx-0.5 rounded">$1</mark>`)
    .replace(/\*\*(.*?)\*\*/g, `<strong class="font-extrabold ${themeConfig.bold}">$1</strong>`);
  return html.replace(/\n/g, '<br/>');
};

// --- 智慧文字輸入框 (SmartTextarea) ---
const SmartTextarea = ({ value, onChange, onSplit, placeholder, className, themeConfig }) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const applyFormat = (prefix, suffix) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentVal = value || '';

    const before = currentVal.substring(0, start);
    const selected = currentVal.substring(start, end);
    const after = currentVal.substring(end);

    const newVal = before + prefix + selected + suffix + after;
    
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    onChange(newVal);

    setTimeout(() => {
      if (textareaRef.current) {
         textareaRef.current.focus();
         textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  const handleClick = (e) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="relative group/editor w-full">
        <div className={`absolute -top-8 right-0 flex gap-1 p-1 rounded shadow-md border opacity-0 group-hover/editor:opacity-100 transition-opacity z-10 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
          <button
            onMouseDown={(e) => { e.preventDefault(); applyFormat('==', '=='); }}
            className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${themeConfig.btnHover} text-yellow-600 dark:text-yellow-400`}
            title="反白文字後點擊，標記為重點"
          >
            <Highlighter size={12} className="mr-1"/> 重點
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); applyFormat('**', '**'); }}
            className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${themeConfig.btnHover} text-teal-600 dark:text-teal-400`}
            title="反白文字後點擊，標記為粗體"
          >
            <Bold size={12} className="mr-1"/> 粗體
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
            onChange(e.target.value);
          }}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (onSplit) onSplit(textareaRef.current.selectionStart, e.target.value, e.shiftKey);
              setIsEditing(false);
            }
          }}
          className={`${className} resize-none overflow-hidden outline-none block w-full bg-transparent`}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`${className} cursor-text whitespace-pre-wrap block w-full ${value ? 'min-h-[1.5rem]' : 'min-h-[1rem]'}`}
      dangerouslySetInnerHTML={{ __html: value ? formatRichText(value, themeConfig) : `<div class="opacity-0 hover:opacity-50 transition-opacity italic text-sm select-none py-0.5 ${themeConfig.placeholder}">點擊新增內容...</div>` }}
    />
  );
};

// --- 初始空白資料模板 ---
const INITIAL_EMPTY_KEPAN_TREE = [{
  "id": "root-1",
  "title": "新科判",
  "content": "",
  "note": "",
  "children": []
}];

// --- AI 模型設定 ---
const AI_MODELS = [
  { label: 'Gemini 2.5 Flash (預設推薦)', value: 'gemini-2.5-flash' },
  { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
  { label: 'Gemini 3.1 Flash Lite', value: 'gemini-3.1-flash-lite' },
  { label: 'Gemini 3 Flash Preview', value: 'gemini-3-flash-preview' },
  { label: '⚙️ 自訂模型 (手動輸入)', value: 'custom' }
];

const AI_PROMPT_PRESETS = [
  { label: '預設：依意群適度拆分', value: `請分析以下佛教經典/開示原文，將其意群切分為合適的子科判骨架。\n必須嚴格回傳 JSON 格式，架構如下 (只需回傳子層陣列):\n[ { "title": "科判標題", "content": "該標題對應的拆分後內文", "note": "" } ]\n\n注意：請務必只回傳合法的 JSON 陣列，不要有任何多餘的解釋文字。` },
  { label: '細緻：逐句/小段落詳細拆分', value: `請將以下原文進行非常細緻的逐句或小段落拆分，適合深度研討。\n必須嚴格回傳 JSON 格式，架構如下:\n[ { "title": "精煉標題", "content": "詳細內文段落", "note": "" } ]\n\n注意：只回傳 JSON 陣列，無多餘文字。` },
  { label: '簡要：僅提煉核心骨架', value: `請閱讀以下原文，僅提煉出最核心的科判大綱骨架，不需保留完整內文，將重點摘要放入 note 中。\n必須嚴格回傳 JSON 格式，架構如下:\n[ { "title": "核心標題", "content": "", "note": "重點摘要" } ]\n\n注意：只回傳 JSON 陣列。` }
];

// --- 擴充主題系統 ---
const THEMES = {
  default: {
    name: '石灰淨白',
    bg: "bg-stone-50", text: "text-stone-800", headerBg: "bg-white", border: "border-stone-200",
    depthColors: ['text-blue-900 border-blue-900', 'text-teal-800 border-teal-800', 'text-emerald-700 border-emerald-700', 'text-cyan-700 border-cyan-700'],
    highlight: "bg-yellow-200 text-yellow-800", bold: "text-teal-700", panelBg: "bg-white", panelBorder: "border-stone-200", btnHover: "hover:bg-stone-100", placeholder: "text-stone-400",
    textarea: "text-stone-800 hover:bg-stone-100/50 focus:bg-stone-100/50", outlineTextarea: "bg-stone-100/50 border-stone-200", noteBg: "bg-[#fffdf5] text-[#5c4b3a] border-amber-400"
  },
  beige: {
    name: '貝葉經黃',
    bg: "bg-[#fdfbf7]", text: "text-[#5c4b3a]", headerBg: "bg-[#f9f6ef]", border: "border-[#e8e2d2]",
    depthColors: ['text-[#4a3f35] border-[#4a3f35]', 'text-[#6b5b4b] border-[#6b5b4b]', 'text-[#8b7762] border-[#8b7762]', 'text-[#a6927a] border-[#a6927a]'],
    highlight: "bg-[#f0d8a8] text-[#5c4b3a]", bold: "text-[#8b5a2b]", panelBg: "bg-[#f9f6ef]", panelBorder: "border-[#e8e2d2]", btnHover: "hover:bg-[#e8e2d2]", placeholder: "text-[#a6927a]",
    textarea: "text-[#5c4b3a] hover:bg-[#f4efe4] focus:bg-[#f4efe4]", outlineTextarea: "bg-[#f4efe4] border-[#e8e2d2]", noteBg: "bg-[#fcf8ed] text-[#5c4b3a] border-[#d4b886]"
  },
  parchment: {
    name: '羊皮古卷',
    bg: "bg-[#f4ebd8]", text: "text-[#4a3f35]", headerBg: "bg-[#eee2ca]", border: "border-[#d8cbb0]",
    depthColors: ['text-[#3a3129] border-[#3a3129]', 'text-[#5a4d41] border-[#5a4d41]', 'text-[#796858] border-[#796858]', 'text-[#96826f] border-[#96826f]'],
    highlight: "bg-[#e2c792] text-[#3a3129]", bold: "text-[#8a4a23]", panelBg: "bg-[#eee2ca]", panelBorder: "border-[#d8cbb0]", btnHover: "hover:bg-[#d8cbb0]", placeholder: "text-[#96826f]",
    textarea: "text-[#4a3f35] hover:bg-[#e8ddc3] focus:bg-[#e8ddc3]", outlineTextarea: "bg-[#e8ddc3] border-[#d8cbb0]", noteBg: "bg-[#fbf4e6] text-[#4a3f35] border-[#c4a976]"
  },
  dark: {
    name: '檀木沉黑',
    bg: "bg-[#1a1a1a]", text: "text-[#e0e0e0]", headerBg: "bg-[#242424]", border: "border-[#333333]",
    depthColors: ['text-blue-300 border-blue-300', 'text-teal-300 border-teal-300', 'text-emerald-300 border-emerald-300', 'text-cyan-300 border-cyan-300'],
    highlight: "bg-yellow-500/30 text-yellow-200", bold: "text-teal-300", panelBg: "bg-[#2a2a2a]", panelBorder: "border-[#404040]", btnHover: "hover:bg-[#404040]", placeholder: "text-stone-500",
    textarea: "text-[#e0e0e0] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]", outlineTextarea: "bg-[#242424] border-[#333333]", noteBg: "bg-[#2a2418] text-amber-100 border-amber-600/50"
  },
  midnight: {
    name: '深海夜讀',
    bg: "bg-[#0f172a]", text: "text-[#cbd5e1]", headerBg: "bg-[#1e293b]", border: "border-[#334155]",
    depthColors: ['text-indigo-300 border-indigo-300', 'text-sky-300 border-sky-300', 'text-cyan-300 border-cyan-300', 'text-teal-300 border-teal-300'],
    highlight: "bg-amber-500/30 text-amber-200", bold: "text-sky-300", panelBg: "bg-[#1e293b]", panelBorder: "border-[#334155]", btnHover: "hover:bg-[#334155]", placeholder: "text-slate-500",
    textarea: "text-[#cbd5e1] hover:bg-[#1e293b]/80 focus:bg-[#1e293b]/80", outlineTextarea: "bg-[#1e293b]/50 border-[#334155]", noteBg: "bg-[#1e293b] text-indigo-100 border-indigo-500/50"
  }
};

// --- 獨立的 TreeNode 元件 ---
const TreeNode = React.memo(({ 
  kepanNode, depth, mode, themeConfig,
  expandedTreeNodes, expandedContentNodes, expandedNoteNodes,
  deleteMenuId, dragInfo, isAILoadingId,
  actions 
}) => {
  const isTreeExpanded = expandedTreeNodes.has(kepanNode.id);
  const isContentVisible = mode === 'text' || mode === 'split' || expandedContentNodes.has(kepanNode.id);
  const isNoteVisible = expandedNoteNodes.has(kepanNode.id);
  
  const hasChildren = kepanNode.children && kepanNode.children.length > 0;
  const hasContent = kepanNode.content && kepanNode.content.trim().length > 0;
  const hasNote = kepanNode.note && kepanNode.note.trim().length > 0;

  const colorClass = themeConfig.depthColors[depth % themeConfig.depthColors.length];
  const textSizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
  const textSizeClass = textSizes[Math.min(depth, textSizes.length - 1)];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      actions.addSiblingKepanNode(kepanNode.id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) actions.outdentKepanNode(kepanNode.id);
      else actions.indentKepanNode(kepanNode.id);
    } else if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      actions.moveNode(kepanNode.id, 'up');
    } else if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      actions.moveNode(kepanNode.id, 'down');
    }
  };

  const isDragged = dragInfo.draggedId === kepanNode.id;
  const isDragOver = dragInfo.overId === kepanNode.id;
  let dropZoneClass = 'border border-transparent';
  if (isDragOver && dragInfo.position === 'top') dropZoneClass = `border-t-2 border-t-teal-500 rounded-t`;
  if (isDragOver && dragInfo.position === 'bottom') dropZoneClass = `border-b-2 border-b-teal-500 rounded-b`;
  if (isDragOver && dragInfo.position === 'inside') dropZoneClass = `bg-teal-500/10 rounded ring-1 ring-teal-500/50`;

  const handleNodeClick = () => {
    if (mode === 'split') {
      const element = document.getElementById(`split-content-${kepanNode.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('ring-2', 'ring-teal-400', 'bg-teal-500/10');
        setTimeout(() => element.classList.remove('ring-2', 'ring-teal-400', 'bg-teal-500/10'), 1500);
      }
    }
  };

  const wrapperSpacingClass = mode === 'text' ? 'mb-0' : 'mb-2';
  const paddingLeftClass = (mode === 'outline' || mode === 'split') && depth > 0 ? `ml-6 border-l-2 ${themeConfig.border} pl-4` : 'ml-0';

  return (
    <div className={`
      ${wrapperSpacingClass} 
      ${paddingLeftClass}
      ${isDragged ? 'opacity-30 scale-[0.98]' : 'opacity-100 scale-100'}
      transition-all duration-200
    `}>
      <div 
        onDragOver={(e) => actions.handleDragOver(e, kepanNode.id)}
        onDrop={(e) => actions.handleDrop(e, kepanNode.id)}
        className={`group relative flex items-start gap-1 ${mode === 'text' ? 'p-0 -ml-0' : 'p-1 -ml-1'} transition-colors ${dropZoneClass}`}
        onClick={handleNodeClick}
      >
        
        {(mode === 'outline' || mode === 'split') && (
          <div 
            draggable
            onDragStart={(e) => actions.handleDragStart(e, kepanNode.id)}
            className={`mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-stone-600`}
            title="按住拖曳以排序"
          >
            <GripVertical size={16} />
          </div>
        )}

        {(mode === 'outline' || mode === 'split') && hasChildren ? (
          <button 
            onClick={(e) => { e.stopPropagation(); actions.toggleTree(kepanNode.id); }}
            className={`mt-1 transition-colors shrink-0 text-stone-400 hover:text-teal-600`}
          >
            {isTreeExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : (mode === 'outline' || mode === 'split') && (
          <div className="w-[18px] shrink-0" />
        )}

        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              id={`input-${kepanNode.id}`}
              type="text"
              value={kepanNode.title}
              onChange={(e) => actions.updateKepanNode(kepanNode.id, 'title', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入科判標題..."
              className={`
                font-bold bg-transparent border-b border-transparent focus:border-teal-500 focus:outline-none transition-all flex-1 min-w-[150px]
                ${colorClass} 
                ${mode === 'text' ? `${textSizeClass} mt-4 mb-1 pb-0` : 'text-lg mb-1 pb-1'}
              `}
            />
            
            <div className={`flex items-center gap-1 shrink-0 ${mode === 'split' && !hasContent && !hasNote ? 'opacity-0' : ''}`}>
              {mode === 'outline' && hasContent && (
                <button
                  onClick={(e) => { e.stopPropagation(); actions.toggleContent(kepanNode.id); }}
                  className={`p-1 rounded transition-colors ${isContentVisible ? 'bg-teal-500/20 text-teal-600' : 'text-stone-400 hover:bg-stone-500/20'}`}
                  title={isContentVisible ? "隱藏內文" : "顯示內文"}
                >
                  <AlignLeft size={14} />
                </button>
              )}
              
              {(mode === 'outline' || mode === 'text' || mode === 'split') && (hasNote || isNoteVisible || hasContent) && (
                <button
                  onClick={(e) => { e.stopPropagation(); actions.toggleNote(kepanNode.id); }}
                  className={`p-1 rounded transition-colors ${isNoteVisible ? 'bg-amber-500/20 text-amber-600' : (hasNote ? 'text-amber-500' : 'text-stone-400 hover:bg-stone-500/20 opacity-0 group-hover:opacity-100')}`}
                  title="修行筆記 / 札記"
                >
                  <BookOpen size={14} />
                </button>
              )}

              {hasContent && mode !== 'split' && (
                <button
                  onClick={(e) => { e.stopPropagation(); actions.generateAISkeleton(kepanNode.id); }}
                  disabled={isAILoadingId === kepanNode.id}
                  className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 text-purple-500 hover:bg-purple-500/20 ${isAILoadingId === kepanNode.id ? 'animate-pulse' : ''}`}
                  title="AI 輔助骨架生成"
                >
                  <Wand2 size={14} />
                </button>
              )}

              <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${mode === 'split' ? 'hidden' : ''}`}>
                <button onClick={(e) => { e.stopPropagation(); actions.setFocusId(kepanNode.id); }} className="p-1 text-stone-400 hover:text-teal-600 hover:bg-teal-500/20 rounded" title="聚焦此節點">
                  <Target size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); actions.setDeleteMenuId(deleteMenuId === kepanNode.id ? null : kepanNode.id); }} className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-500/20 rounded" title="刪除選單">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {deleteMenuId === kepanNode.id && (
            <div className={`border shadow-lg rounded-md p-2 mb-2 flex gap-2 items-center text-sm z-10 relative animate-in fade-in slide-in-from-top-2 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
              <span className={`font-medium ml-1 ${themeConfig.text}`}>刪除選項：</span>
              <button onClick={() => actions.mergeUpKepanNode(kepanNode.id)} className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 rounded transition-colors" title="刪除此標題，內文與子節點併入上一段">
                向上合併
              </button>
              <button onClick={() => actions.deleteKepanNode(kepanNode.id)} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded transition-colors" title="徹底刪除此標題與其下所有內容">
                刪除全部
              </button>
              <button onClick={() => actions.setDeleteMenuId(null)} className={`px-3 py-1 rounded transition-colors ${themeConfig.btnHover} ${themeConfig.text}`}>
                取消
              </button>
            </div>
          )}

          {isContentVisible && mode !== 'split' && (
            <div className={`relative group/text w-full`}>
              <SmartTextarea
                value={kepanNode.content}
                onChange={(val) => actions.updateKepanNode(kepanNode.id, 'content', val)}
                onSplit={(cursorStart, currentText, isShift) => {
                  if (isShift) {
                    actions.splitTextToChildKepanNode(kepanNode.id, cursorStart, currentText);
                  } else {
                    actions.splitTextToSiblingKepanNode(kepanNode.id, cursorStart, currentText);
                  }
                }}
                placeholder={mode === 'text' ? "在此輸入或貼上原文..." : "無內文"}
                themeConfig={themeConfig}
                className={`
                  w-full transition-all
                  ${mode === 'outline' ? `text-sm p-2 rounded border ${themeConfig.outlineTextarea}` : `text-base leading-[1.8] py-1 rounded ${themeConfig.textarea}`}
                `}
              />
              
              {mode === 'text' && kepanNode.content && (
                <div className="absolute bottom-1 right-2 opacity-0 group-hover/text:opacity-100 pointer-events-none transition-all z-0 flex gap-2">
                  <span className="bg-teal-500/20 text-teal-600 text-xs px-2 py-1 rounded shadow backdrop-blur-sm">
                    Ctrl+Enter 同層拆分
                  </span>
                  <span className="bg-teal-500/20 text-teal-600 text-xs px-2 py-1 rounded shadow backdrop-blur-sm">
                    Ctrl+Shift+Enter 子層拆分
                  </span>
                </div>
              )}
            </div>
          )}

          {isNoteVisible && (
            <div className={`mb-2 mt-2 p-3 rounded-lg border-l-4 shadow-sm relative w-full ${themeConfig.noteBg}`}>
              <div className="flex items-center gap-2 mb-1 text-xs font-bold opacity-70 uppercase tracking-widest">
                <Leaf size={12} /> Dharma Journaling
              </div>
              <SmartTextarea
                value={kepanNode.note || ''}
                onChange={(val) => actions.updateKepanNode(kepanNode.id, 'note', val)}
                placeholder="在此記錄您的修行觀察、心相調伏或疑問 (支援浮動工具列)..."
                themeConfig={themeConfig}
                className="w-full bg-transparent text-sm leading-relaxed"
              />
            </div>
          )}

        </div>
      </div>

      {hasChildren && (mode === 'text' || mode === 'split' || isTreeExpanded) && (
        <div className="mt-0">
          {kepanNode.children.map(childNode => (
            <TreeNode 
              key={childNode.id} kepanNode={childNode} depth={depth + 1} mode={mode} themeConfig={themeConfig} userApiKey={userApiKey}
              expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes}
              deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={actions} 
            />
          ))}
        </div>
      )}
    </div>
  );
});

// --- 主應用程式 ---
export default function App() {
  const [historyState, setHistoryState] = useState(() => {
    try {
      const savedTree = localStorage.getItem('outline_editor_autosave_v3');
      return { past: [], present: savedTree ? JSON.parse(savedTree) : INITIAL_EMPTY_KEPAN_TREE, future: [] };
    } catch (error) {
      return { past: [], present: INITIAL_EMPTY_KEPAN_TREE, future: [] };
    }
  });

  const kepanTree = historyState.present;

  const [mode, setMode] = useState('text'); 
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('outline_theme') || 'default');
  const [focusId, setFocusId] = useState(null); 
  const [expandedTreeNodes, setExpandedTreeNodes] = useState(new Set(['root-1']));
  const [expandedContentNodes, setExpandedContentNodes] = useState(new Set());
  const [expandedNoteNodes, setExpandedNoteNodes] = useState(new Set());
  const [deleteMenuId, setDeleteMenuId] = useState(null);
  const [dragInfo, setDragInfo] = useState({ draggedId: null, overId: null, position: null });
  const [activeBreadcrumbDropdown, setActiveBreadcrumbDropdown] = useState(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('outline_api_key') || '');
  const [userApiModel, setUserApiModel] = useState(() => localStorage.getItem('outline_api_model') || 'gemini-2.5-flash');
  const [customApiModel, setCustomApiModel] = useState(() => localStorage.getItem('outline_custom_model') || '');
  const [aiPrompt, setAiPrompt] = useState(() => localStorage.getItem('outline_ai_prompt') || AI_PROMPT_PRESETS[0].value);
  const [isAILoadingId, setIsAILoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const themeConfig = THEMES[themeKey] || THEMES.default;

  const showToast = useCallback((msg, duration = 5000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('outline_editor_autosave_v3', JSON.stringify(kepanTree));
      localStorage.setItem('outline_theme', themeKey);
    } catch (error) {}
  }, [kepanTree, themeKey]);

  const commitChange = useCallback((updaterOrTree) => {
    setHistoryState(prevState => {
      const currentTree = prevState.present;
      const newTree = typeof updaterOrTree === 'function' ? updaterOrTree(currentTree) : updaterOrTree;
      const newPast = [...prevState.past, currentTree].slice(-50);
      return { past: newPast, present: newTree, future: [] };
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistoryState(prevState => {
      if (prevState.past.length === 0) return prevState;
      const newPast = [...prevState.past];
      const previousTree = newPast.pop();
      return { past: newPast, present: previousTree, future: [prevState.present, ...prevState.future] };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryState(prevState => {
      if (prevState.future.length === 0) return prevState;
      const newFuture = [...prevState.future];
      const nextTree = newFuture.shift();
      return { past: [...prevState.past, prevState.present], present: nextTree, future: newFuture };
    });
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  const toggleTree = useCallback((id) => {
    setExpandedTreeNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleContent = useCallback((id) => {
    setExpandedContentNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleNote = useCallback((id) => {
    setExpandedNoteNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const updateKepanNode = useCallback((id, field, value) => {
    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      const targetNode = findNodeInKepanTree(clonedTree, id);
      if (targetNode && targetNode[field] !== value) {
        targetNode[field] = value;
        return clonedTree;
      }
      return currentTree;
    });
  }, [commitChange]);

  const addSiblingKepanNode = useCallback((targetId) => {
    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      const newNode = { id: generateUniqueId(), title: '', content: '', note: '', children: [] };
      const insertRecursive = (nodes) => {
        const index = nodes.findIndex(n => n.id === targetId);
        if (index !== -1) {
          nodes.splice(index + 1, 0, newNode);
          return true;
        }
        for (let node of nodes) {
          if (node.children && insertRecursive(node.children)) return true;
        }
        return false;
      };
      if (insertRecursive(clonedTree)) {
        setTimeout(() => document.getElementById(`input-${newNode.id}`)?.focus(), 50);
        return clonedTree;
      }
      return currentTree;
    });
  }, [commitChange]);

  const indentKepanNode = useCallback((targetId) => {
    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      const processIndent = (nodes) => {
        const index = nodes.findIndex(n => n.id === targetId);
        if (index > 0) {
          const nodeToMove = nodes.splice(index, 1)[0];
          const prevSibling = nodes[index - 1];
          if (!prevSibling.children) prevSibling.children = [];
          prevSibling.children.push(nodeToMove);
          setExpandedTreeNodes(prev => new Set(prev).add(prevSibling.id));
          return true;
        }
        for (let node of nodes) {
          if (node.children && processIndent(node.children)) return true;
        }
        return false;
      };
      if (processIndent(clonedTree)) {
        setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
        return clonedTree;
      }
      return currentTree;
    });
  }, [commitChange]);

  const outdentKepanNode = useCallback((targetId) => {
    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      const processOutdent = (nodes, parentArr = null, parentIndex = -1) => {
        const index = nodes.findIndex(n => n.id === targetId);
        if (index !== -1 && parentArr) {
          const nodeToMove = nodes.splice(index, 1)[0];
          parentArr.splice(parentIndex + 1, 0, nodeToMove);
          return true;
        }
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].children && processOutdent(nodes[i].children, nodes, i)) return true;
        }
        return false;
      };
      if (processOutdent(clonedTree)) {
        setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
        return clonedTree;
      }
      return currentTree;
    });
  }, [commitChange]);

  const moveNode = useCallback((targetId, direction) => {
    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      const processMove = (nodes) => {
        const index = nodes.findIndex(n => n.id === targetId);
        if (index !== -1) {
          if (direction === 'up' && index > 0) {
            [nodes[index - 1], nodes[index]] = [nodes[index], nodes[index - 1]];
            return true;
          } else if (direction === 'down' && index < nodes.length - 1) {
            [nodes[index], nodes[index + 1]] = [nodes[index + 1], nodes[index]];
            return true;
          }
          return false;
        }
        for (let node of nodes) {
          if (node.children && processMove(node.children)) return true;
        }
        return false;
      };
      if (processMove(clonedTree)) {
        setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
        return clonedTree;
      }
      return currentTree;
    });
  }, [commitChange]);

  const splitTextToSiblingKepanNode = useCallback((nodeId, cursorStart, currentText) => {
    const textBefore = currentText.substring(0, cursorStart).replace(/\s+$/, '');
    const textAfter = currentText.substring(cursorStart).replace(/^\s+/, '');

    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      let targetNode = null;
      let parentArray = null;
      let targetIndex = -1;

      const findNodeAndParent = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === nodeId) {
            targetNode = nodes[i];
            parentArray = nodes;
            targetIndex = i;
            return true;
          }
          if (nodes[i].children && findNodeAndParent(nodes[i].children)) return true;
        }
        return false;
      };

      if (findNodeAndParent(clonedTree)) {
        targetNode.content = textBefore;
        const newNode = { id: generateUniqueId(), title: '新科判', content: textAfter, note: '', children: [] };
        parentArray.splice(targetIndex + 1, 0, newNode);
        return clonedTree;
      }
      return currentTree;
    });
  }, [commitChange]);

  const splitTextToChildKepanNode = useCallback((nodeId, cursorStart, currentText) => {
    const textBefore = currentText.substring(0, cursorStart).replace(/\s+$/, '');
    const textAfter = currentText.substring(cursorStart).replace(/^\s+/, '');

    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      const targetNode = findNodeInKepanTree(clonedTree, nodeId);
      if (targetNode) {
        targetNode.content = textBefore;
        const newNode = { id: generateUniqueId(), title: '新科判', content: textAfter, note: '', children: [] };
        if (!targetNode.children) targetNode.children = [];
        targetNode.children.unshift(newNode);
        setExpandedTreeNodes(prev => new Set(prev).add(nodeId));
        return clonedTree;
      }
      return currentTree;
    });
  }, [commitChange]);

  const deleteKepanNode = useCallback((id) => {
    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      const removeRecursive = (nodes) => {
        const index = nodes.findIndex(n => n.id === id);
        if (index !== -1) {
          nodes.splice(index, 1);
          return true;
        }
        for (let node of nodes) {
          if (node.children && removeRecursive(node.children)) return true;
        }
        return false;
      };
      if (removeRecursive(clonedTree)) {
        if (focusId === id) setFocusId(null);
        setDeleteMenuId(null);
        return clonedTree;
      }
      return currentTree;
    });
  }, [commitChange, focusId]);

  const mergeUpKepanNode = useCallback((id) => {
    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      let targetNode = null;
      let prevSiblingNode = null;
      let targetParentNode = null;

      const findAndMerge = (nodes, parentNode = null) => {
        const index = nodes.findIndex(n => n.id === id);
        if (index !== -1) {
          targetNode = nodes.splice(index, 1)[0];
          if (index > 0) {
            prevSiblingNode = nodes[index - 1]; 
          } else {
            targetParentNode = parentNode; 
          }
          return true;
        }
        for (let node of nodes) {
          if (node.children && findAndMerge(node.children, node)) return true;
        }
        return false;
      };

      if (findAndMerge(clonedTree)) {
        const mergeTarget = prevSiblingNode || targetParentNode;
        if (mergeTarget) {
          const additionalContent = (targetNode.content || '').trim();
          if (additionalContent) {
            mergeTarget.content = mergeTarget.content ? `${mergeTarget.content}\n${additionalContent}` : additionalContent;
          }
          if (targetNode.note) {
            mergeTarget.note = mergeTarget.note ? `${mergeTarget.note}\n${targetNode.note}` : targetNode.note;
          }
          if (targetNode.children && targetNode.children.length > 0) {
            mergeTarget.children = [...(mergeTarget.children || []), ...targetNode.children];
          }
          setDeleteMenuId(null);
          return clonedTree;
        } else {
          showToast("此節點已是最頂層，無法再向上合併。");
          setDeleteMenuId(null);
        }
      }
      return currentTree;
    });
  }, [commitChange, showToast]);

  const handleDragStart = useCallback((e, id) => {
    e.stopPropagation(); 
    try {
      e.dataTransfer.setData('text/plain', id);
      setDragInfo({ draggedId: id, overId: null, position: null });
    } catch (error) {}
  }, []);

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();  
    e.stopPropagation(); 
    if (id === dragInfo.draggedId) return;
    try {
      const elementRect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - elementRect.top;
      let dragPosition = 'inside';
      if (relativeY < elementRect.height * 0.25) dragPosition = 'top';
      else if (relativeY > elementRect.height * 0.75) dragPosition = 'bottom';

      setDragInfo(prev => {
        if (prev.overId === id && prev.position === dragPosition) return prev;
        return { ...prev, overId: id, position: dragPosition };
      });
    } catch (error) {}
  }, [dragInfo.draggedId]);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const draggedNodeId = e.dataTransfer.getData('text/plain');
      const { position } = dragInfo;
      setDragInfo({ draggedId: null, overId: null, position: null });

      if (!draggedNodeId || draggedNodeId === targetId) return;

      commitChange(currentTree => {
        const clonedTree = deepCloneKepanTree(currentTree);
        let draggedNode = null;
        
        const removeDraggedNode = (nodes) => {
          const index = nodes.findIndex(n => n.id === draggedNodeId);
          if (index !== -1) {
            draggedNode = nodes.splice(index, 1)[0];
            return true;
          }
          for (let node of nodes) {
            if (node.children && removeDraggedNode(node.children)) return true;
          }
          return false;
        };
        removeDraggedNode(clonedTree);
        if (!draggedNode) return currentTree;

        const insertAtTarget = (nodes) => {
          const index = nodes.findIndex(n => n.id === targetId);
          if (index !== -1) {
            if (position === 'top') nodes.splice(index, 0, draggedNode);
            else if (position === 'bottom') nodes.splice(index + 1, 0, draggedNode);
            else {
              if (!nodes[index].children) nodes[index].children = [];
              nodes[index].children.unshift(draggedNode); 
              setExpandedTreeNodes(prev => new Set(prev).add(targetId));
            }
            return true;
          }
          for (let node of nodes) {
            if (node.children && insertAtTarget(node.children)) return true;
          }
          return false;
        };
        
        if (insertAtTarget(clonedTree)) return clonedTree;
        return currentTree;
      });
    } catch (error) {
      setDragInfo({ draggedId: null, overId: null, position: null });
    }
  }, [dragInfo, commitChange]);

  // --- 核心破局：多 API Keys 輪詢與自訂模型機制 ---
  const generateAISkeleton = async (nodeId) => {
    const targetNode = findNodeInKepanTree(kepanTree, nodeId);
    if (!targetNode || !targetNode.content) return;
    
    // 解析使用者輸入的多個 Key
    const keyList = userApiKey.split(',').map(k => k.trim()).filter(Boolean);
    
    if (keyList.length === 0) {
      showToast("請先至右上角「設定」輸入至少一組 Google Gemini API 金鑰。");
      return;
    }
    
    setIsAILoadingId(nodeId);
    const finalModel = userApiModel === 'custom' ? customApiModel : userApiModel;

    const payload = {
      contents: [{ parts: [{ text: `原文內容：\n${targetNode.content}` }] }],
      systemInstruction: { parts: [{ text: aiPrompt }] },
      generationConfig: { responseMimeType: "application/json" }
    };

    let success = false;
    let lastErrorMsg = "";

    // 輪流測試每一組金鑰
    for (const currentKey of keyList) {
      if (success) break;
      
      let attempt = 0;
      const maxAttempts = 2; // 每個金鑰允許重試次數

      while (attempt < maxAttempts) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${currentKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errorJson = await response.json();
            // 如果遇到 429 錯誤，直接拋出並中斷當前金鑰的嘗試迴圈，換下一把金鑰
            if (response.status === 429) {
                throw new Error("429 Quota Exceeded");
            }
            throw new Error(errorJson.error?.message || `HTTP 錯誤 ${response.status}`);
          }
          
          const result = await response.json();
          let textResult = result.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (textResult) {
            textResult = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();
            const generatedNodes = JSON.parse(textResult);
            
            commitChange(currentTree => {
              const clonedTree = deepCloneKepanTree(currentTree);
              const tNode = findNodeInKepanTree(clonedTree, nodeId);
              if (tNode) {
                tNode.content = ""; 
                const newAiNodes = generatedNodes.map(n => ({
                  id: generateUniqueId(),
                  title: n.title || "新科判",
                  content: n.content || "",
                  note: n.note || "",
                  children: []
                }));
                tNode.children = [...newAiNodes, ...(tNode.children || [])];
                
                setExpandedTreeNodes(prev => new Set(prev).add(nodeId));
                return clonedTree;
              }
              return currentTree;
            });
            
            success = true;
            showToast("AI 拆分完成！");
            break; // 成功，完全跳出迴圈
          } else {
            throw new Error("模型回傳結果為空");
          }
        } catch (error) {
          lastErrorMsg = error.message;
          // 若為 429 配額用盡，不需 delay 重試，直接跳出 inner while 讓外層切換下一把金鑰
          if (error.message.includes("429")) {
              break; 
          }
          attempt++;
          if (attempt < maxAttempts) {
             await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
    }
    
    if (!success) {
      showToast(`AI 生成失敗。原因: ${lastErrorMsg.substring(0, 80)}... 已嘗試所有金鑰。`, 8000);
    }
    
    setIsAILoadingId(null);
  };

  const kepanTreeActions = {
    updateKepanNode, addSiblingKepanNode, indentKepanNode, outdentKepanNode, moveNode,
    deleteKepanNode, mergeUpKepanNode, splitTextToSiblingKepanNode, splitTextToChildKepanNode,
    setFocusId, setDeleteMenuId, toggleTree, toggleContent, toggleNote, generateAISkeleton,
    handleDragStart, handleDragOver, handleDrop
  };

  const handleNewFile = () => {
    if (window.confirm("確定要建立新檔案嗎？目前未存檔的變更將會遺失。")) {
      commitChange(INITIAL_EMPTY_KEPAN_TREE);
      setFocusId(null);
      setExpandedTreeNodes(new Set(['root-1']));
      setExpandedContentNodes(new Set());
      setExpandedNoteNodes(new Set());
      showToast("已建立乾淨的新檔案。");
    }
  };

  const handleExportToFile = () => {
    try {
      const rootTitle = kepanTree[0]?.title || '科判資料';
      const fileBlob = new Blob([JSON.stringify(kepanTree, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(fileBlob);
      const linkElement = document.createElement('a');
      linkElement.href = downloadUrl;
      linkElement.download = `${rootTitle}.json`;
      linkElement.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      showToast("檔案匯出失敗，請重試。");
    }
  };

  const handleImportFromFile = (e) => {
    try {
      const selectedFile = e.target.files[0];
      if (!selectedFile) return;
      const fileReader = new FileReader();
      fileReader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target.result);
          commitChange(parsedData);
          setFocusId(null);
          showToast("檔案匯入成功！");
        } catch (err) {
          showToast("檔案格式不正確，請匯入有效的 JSON 檔案。");
        }
      };
      fileReader.readAsText(selectedFile);
    } catch (error) {
      showToast("讀取檔案發生錯誤。");
    }
    e.target.value = ''; 
  };

  const saveSettings = () => {
    localStorage.setItem('outline_api_key', userApiKey);
    localStorage.setItem('outline_api_model', userApiModel);
    localStorage.setItem('outline_custom_model', customApiModel);
    localStorage.setItem('outline_ai_prompt', aiPrompt);
    setShowSettings(false);
    showToast("設定已儲存");
  };

  const currentRenderData = focusId ? [findNodeInKepanTree(kepanTree, focusId)].filter(Boolean) : kepanTree;
  const currentBreadcrumbPath = focusId ? findPathInKepanTree(kepanTree, focusId) : null;
  const isDark = themeKey === 'dark' || themeKey === 'midnight';

  const renderContinuousSplitText = (nodes) => {
    return nodes.map(node => (
      <div key={`split-${node.id}`} id={`split-content-${node.id}`} className="mb-6 group transition-colors duration-500 rounded p-2">
        <h3 className={`font-bold text-lg mb-2 ${themeConfig.bold}`}>{node.title}</h3>
        {node.content && (
           <div className={`leading-relaxed whitespace-pre-wrap ${themeConfig.text}`} dangerouslySetInnerHTML={{ __html: formatRichText(node.content, themeConfig) }} />
        )}
        {node.note && (
          <div className={`mt-2 p-3 text-sm rounded-lg border-l-4 shadow-sm ${themeConfig.noteBg}`}>
            <div className="font-bold opacity-70 mb-1 flex items-center gap-1"><Leaf size={12}/> 札記</div>
            <div dangerouslySetInnerHTML={{ __html: formatRichText(node.note, themeConfig) }} />
          </div>
        )}
        {node.children && node.children.length > 0 && (
          <div className={`mt-4 pl-4 border-l-2 ${themeConfig.border}`}>
            {renderContinuousSplitText(node.children)}
          </div>
        )}
      </div>
    ));
  };

  const renderMacroMap = (nodes) => {
    return (
      <div className="flex flex-col gap-2">
        {nodes.map(node => (
          <div key={`map-${node.id}`} className="flex flex-col">
            <div className={`py-1 px-2 rounded font-medium flex items-center gap-2 ${themeConfig.panelBg} ${themeConfig.bold}`}>
              <div className={`w-2 h-2 rounded-full ${themeConfig.bold.split(' ')[0].replace('text-', 'bg-')}`}></div>
              {node.title || '(未命名節點)'}
            </div>
            {node.children && node.children.length > 0 && (
              <div className={`ml-4 pl-4 border-l ${themeConfig.border} mt-2`}>
                {renderMacroMap(node.children)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${themeConfig.bg} ${themeConfig.text}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded shadow-lg z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in ${isDark ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-white'}`}>
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100"><X size={16}/></button>
        </div>
      )}

      {/* Header 工具列 */}
      <header className={`shadow-sm px-6 py-3 flex flex-wrap justify-between items-center sticky top-0 z-20 gap-4 border-b ${themeConfig.headerBg} ${themeConfig.border}`}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListTree className={themeConfig.bold.split(' ')[0]} />
            聞思科判編輯器
          </h1>
          
          <div className={`flex rounded-lg p-1 border gap-1 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
            <button onClick={() => setMode('text')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'text' ? (isDark ? 'bg-stone-700 text-teal-300 shadow' : 'bg-white shadow text-teal-700') : `opacity-60 ${themeConfig.btnHover}`}`} title="原文模式">
              <BookText size={16} /> <span className="hidden sm:inline">原文模式</span>
            </button>
            <button onClick={() => setMode('outline')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'outline' ? (isDark ? 'bg-stone-700 text-teal-300 shadow' : 'bg-white shadow text-teal-700') : `opacity-60 ${themeConfig.btnHover}`}`} title="科判模式">
              <ListTree size={16} /> <span className="hidden sm:inline">科判模式</span>
            </button>
            <button onClick={() => setMode('split')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'split' ? (isDark ? 'bg-stone-700 text-teal-300 shadow' : 'bg-white shadow text-teal-700') : `opacity-60 ${themeConfig.btnHover}`}`} title="對讀連動模式">
              <Columns size={16} /> <span className="hidden sm:inline">對讀模式</span>
            </button>
            <button onClick={() => setMode('map')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'map' ? (isDark ? 'bg-stone-700 text-teal-300 shadow' : 'bg-white shadow text-teal-700') : `opacity-60 ${themeConfig.btnHover}`}`} title="總體骨架鳥瞰圖">
              <Map size={16} /> <span className="hidden sm:inline">鳥瞰模式</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <button onClick={handleUndo} disabled={historyState.past.length === 0} className={`p-1.5 rounded-md transition-colors ${historyState.past.length === 0 ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover} ${themeConfig.bold}`}`} title="復原 (Ctrl+Z)"><Undo2 size={18}/></button>
            <button onClick={handleRedo} disabled={historyState.future.length === 0} className={`p-1.5 rounded-md transition-colors ${historyState.future.length === 0 ? 'opacity-30 cursor-not-allowed' : `${themeConfig.btnHover} ${themeConfig.bold}`}`} title="重做 (Ctrl+Y)"><Redo2 size={18}/></button>
          </div>

          <div className={`w-px h-4 mx-1 ${themeConfig.border}`}></div>

          {/* 主題下拉選單 */}
          <div className="relative">
             <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className={`p-1.5 rounded-md flex items-center gap-1 opacity-80 ${themeConfig.btnHover} transition-colors`} title="切換沉浸主題">
               <Palette size={18}/>
             </button>
             {isThemeMenuOpen && (
               <div className={`absolute top-full right-0 mt-2 w-36 rounded-md shadow-xl border z-50 overflow-hidden ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <button 
                      key={key} 
                      onClick={() => { setThemeKey(key); setIsThemeMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${themeKey === key ? theme.bold : theme.text} ${theme.btnHover}`}
                    >
                      {theme.name}
                    </button>
                  ))}
               </div>
             )}
          </div>
          
          <button onClick={() => setShowSettings(true)} className={`p-1.5 rounded-md opacity-80 ${themeConfig.btnHover} transition-colors`} title="設定"><Settings size={18}/></button>

          <div className={`w-px h-4 mx-1 ${themeConfig.border}`}></div>

          <button onClick={handleNewFile} className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${themeConfig.panelBg} ${themeConfig.panelBorder} ${themeConfig.btnHover}`} title="建立新檔案">
            <FilePlus size={16} /> <span className="hidden sm:inline">開新檔</span>
          </button>

          <label className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${themeConfig.panelBg} ${themeConfig.panelBorder} ${themeConfig.btnHover}`} title="匯入本地 JSON">
            <FolderOpen size={16} /> <span className="hidden sm:inline">開啟</span>
            <input type="file" accept=".json" onChange={handleImportFromFile} className="hidden" />
          </label>
          <button onClick={handleExportToFile} className={`flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white rounded shadow-sm transition-colors ${isDark ? 'bg-teal-700 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700'}`} title="匯出為 JSON">
            <Save size={16} /> <span className="hidden sm:inline">存檔</span>
          </button>
        </div>
      </header>

      {/* 設定面板 Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl p-6 shadow-2xl ${themeConfig.panelBg} ${themeConfig.text} ${themeConfig.panelBorder} border`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} className="opacity-60"/> 偏好與 AI 設定</h2>
              <button onClick={() => setShowSettings(false)} className={`p-1 rounded-full ${themeConfig.btnHover}`}><X size={20}/></button>
            </div>
            
            <div className="mb-6">
              <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}><Key size={16} className="inline mr-1"/> Google Gemini API Key (支援多組金鑰)</label>
              <textarea 
                value={userApiKey} 
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder="輸入您的 API 金鑰。若有多組，請用逗號 (,) 分隔以啟用輪替機制避開限制。"
                rows={2}
                className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm font-mono`}
              />
            </div>

            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}>指定模型</label>
                <select 
                  className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700 text-stone-200' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm`}
                  onChange={(e) => setUserApiModel(e.target.value)}
                  value={userApiModel}
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              
              {userApiModel === 'custom' && (
                <div className="flex-1 animate-in fade-in">
                  <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}>自訂模型名稱</label>
                  <input 
                    type="text" 
                    value={customApiModel} 
                    onChange={(e) => setCustomApiModel(e.target.value)}
                    placeholder="如: gemini-4-flash"
                    className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700 text-white' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm`}
                  />
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className={`block text-sm font-bold mb-2 ${themeConfig.bold}`}><FileText size={16} className="inline mr-1"/> 自訂 AI 拆分提示詞 (System Prompt)</label>
              <select 
                className={`w-full mb-2 p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700 text-stone-200' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm`}
                onChange={(e) => setAiPrompt(e.target.value)}
                value={AI_PROMPT_PRESETS.find(p => p.value === aiPrompt) ? aiPrompt : "custom"}
              >
                {AI_PROMPT_PRESETS.map((preset, idx) => (
                  <option key={idx} value={preset.value}>{preset.label}</option>
                ))}
                <option value="custom">✍️ 自訂提示詞...</option>
              </select>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={6}
                className={`w-full p-2 rounded border focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-teal-500 bg-black/30 border-stone-700' : 'focus:ring-teal-400 bg-white border-stone-200'} text-sm font-mono`}
              />
            </div>

            <div className="flex justify-end">
              <button onClick={saveSettings} className={`px-6 py-2 text-white rounded font-medium transition-colors ${isDark ? 'bg-teal-700 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700'}`}>確認並儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumbs - 加入下拉選單機制 */}
      {focusId && currentBreadcrumbPath && (
        <div className={`border-b px-6 py-2 flex flex-wrap items-center gap-2 text-sm sticky top-[60px] z-10 ${themeConfig.panelBg} ${themeConfig.border}`}>
          <button onClick={() => setFocusId(null)} className={`hover:opacity-80 flex items-center gap-1 font-medium ${themeConfig.highlight} bg-opacity-30 px-2 py-1 rounded`}>
            <Home size={14} /> 根目錄
          </button>
          {currentBreadcrumbPath.map((crumb, idx) => {
            const dropdownOptions = crumb.children || [];
            const isDropdownOpen = activeBreadcrumbDropdown === crumb.id;
            return (
              <React.Fragment key={crumb.id}>
                <ChevronRight size={14} className="opacity-40 mx-1" />
                <div className={`relative flex items-center rounded ${themeConfig.highlight} bg-opacity-20`}>
                  <button 
                    onClick={() => setFocusId(crumb.id)} 
                    className={`hover:opacity-80 px-2 py-1 transition-colors rounded-l ${idx === currentBreadcrumbPath.length - 1 ? `font-bold bg-opacity-40 ${themeConfig.highlight}` : ''}`}
                  >
                    {crumb.title || '(無標題)'}
                  </button>
                  {dropdownOptions.length > 0 && (
                    <button
                      className={`p-1 px-1.5 rounded-r transition-colors opacity-70 hover:opacity-100`}
                      onClick={(e) => { e.stopPropagation(); setActiveBreadcrumbDropdown(isDropdownOpen ? null : crumb.id); }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  )}
                  {isDropdownOpen && dropdownOptions.length > 0 && (
                    <div className={`absolute top-full left-0 mt-1 min-w-[200px] rounded-md shadow-lg border py-1 z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                      {dropdownOptions.map(opt => (
                        <button
                          key={opt.id}
                          className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${themeConfig.btnHover} ${themeConfig.bold}`}
                          onClick={(e) => { e.stopPropagation(); setFocusId(opt.id); setActiveBreadcrumbDropdown(null); }}
                        >
                          {opt.title || '(無標題)'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Editor Main */}
      <main className="flex-1 overflow-auto p-4 md:p-8 flex justify-center" onClick={() => { setActiveBreadcrumbDropdown(null); setIsThemeMenuOpen(false); }}>
        {mode === 'map' ? (
           <div className={`w-full max-w-4xl p-8 rounded-lg shadow-sm border min-h-[80vh] ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
             <h2 className={`text-2xl font-bold mb-8 text-center tracking-widest ${themeConfig.bold}`}>總體骨架鳥瞰圖</h2>
             {renderMacroMap(currentRenderData)}
           </div>
        ) : mode === 'split' ? (
           <div className="w-full max-w-7xl flex gap-6 h-[80vh]">
             <div className={`w-1/3 overflow-y-auto p-6 rounded-lg shadow-sm border ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                {currentRenderData.map(rootNode => (
                  <TreeNode 
                    key={rootNode.id} kepanNode={rootNode} depth={0} mode={mode} themeConfig={themeConfig} userApiKey={userApiKey}
                    expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes}
                    deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={kepanTreeActions} showToast={showToast}
                  />
                ))}
             </div>
             <div className={`w-2/3 overflow-y-auto p-8 rounded-lg shadow-sm border ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                {renderContinuousSplitText(currentRenderData)}
             </div>
           </div>
        ) : (
          <div className={`w-full max-w-4xl p-8 rounded-lg shadow-sm border min-h-[80vh] ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
            {currentRenderData.map(rootNode => (
              <TreeNode 
                key={rootNode.id} kepanNode={rootNode} depth={0} mode={mode} themeConfig={themeConfig} userApiKey={userApiKey}
                expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes}
                deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={kepanTreeActions} showToast={showToast}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
