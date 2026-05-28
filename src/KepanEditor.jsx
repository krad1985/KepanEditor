// Version: 1.6.1 - 升級智慧標記為標準 Markdown 粗體 (**)、導入 Gemini 3.1 系列模型支援、優化浮動工具列體驗
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, ListTree, ChevronRight, ChevronDown, 
  Trash2, Save, FolderOpen, Target, Home, 
  SplitSquareHorizontal, GripVertical, AlignLeft,
  Undo2, Redo2, Columns, Map, BookOpen, Wand2, Settings,
  X, Sun, Moon, Leaf, BookText, FilePlus, Highlighter, Bold
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

// --- 輕量級富文本解析 (升級為標準 Markdown 粗體) ---
const formatRichText = (txt, isDark) => {
  if (!txt) return '';
  let html = txt
    .replace(/</g, '&lt;').replace(/>/g, '&gt;') // 防 XSS
    .replace(/==(.*?)==/g, `<mark class="${isDark ? 'bg-yellow-500/30 text-yellow-200' : 'bg-yellow-200 text-yellow-800'} px-1 mx-0.5 rounded">$1</mark>`)
    .replace(/\*\*(.*?)\*\*/g, `<strong class="font-extrabold ${isDark ? 'text-teal-300' : 'text-teal-700'}">$1</strong>`);
  return html.replace(/\n/g, '<br/>');
};

// --- 智慧文字輸入框 (SmartTextarea) 支援一鍵粗體標記 ---
const SmartTextarea = ({ value, onChange, onSplit, placeholder, className, isDark }) => {
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
    
    // 更新高度與內容
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    onChange(newVal);

    // 延遲恢復游標位置，確保 React 完成重新渲染
    setTimeout(() => {
      if (textareaRef.current) {
         textareaRef.current.focus();
         textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
      }
    }, 0);
  };

  if (isEditing) {
    return (
      <div className="relative group/editor w-full">
        {/* 浮動格式化工具列 (使用 onMouseDown 防止失去焦點) */}
        <div className={`absolute -top-8 right-0 flex gap-1 p-1 rounded shadow-md border opacity-0 group-hover/editor:opacity-100 transition-opacity z-10 ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
          <button
            onMouseDown={(e) => { e.preventDefault(); applyFormat('==', '=='); }}
            className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${isDark ? 'hover:bg-stone-700 text-yellow-400' : 'hover:bg-stone-100 text-yellow-600'}`}
            title="反白文字後點擊，標記為黃色重點"
          >
            <Highlighter size={12} className="mr-1"/> 重點
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); applyFormat('**', '**'); }}
            className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${isDark ? 'hover:bg-stone-700 text-teal-400' : 'hover:bg-stone-100 text-teal-600'}`}
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
              if (onSplit) onSplit(textareaRef.current.selectionStart, e.target.value);
              setIsEditing(false);
            }
          }}
          className={`${className} resize-none overflow-hidden outline-none block w-full`}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`${className} cursor-text min-h-[1.5rem] whitespace-pre-wrap block w-full`}
      dangerouslySetInnerHTML={{ __html: value ? formatRichText(value, isDark) : `<span class="opacity-40 italic">${placeholder}</span>` }}
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

// --- AI 提示詞與模型設定 (加入 Gemini 3.1 系列) ---
const AI_MODELS = [
  { label: 'Gemini 3.1 Flash (最新高效推薦)', value: 'gemini-3.1-flash' },
  { label: 'Gemini 3.1 Flash Lite (輕量高配額)', value: 'gemini-3.1-flash-lite' },
  { label: 'Gemini 2.5 Flash (穩定快速型)', value: 'gemini-2.5-flash' },
  { label: 'Gemini 3.0 Flash (進階體驗版)', value: 'gemini-3.0-flash' }
];

const AI_PROMPT_PRESETS = [
  {
    label: '預設：依意群適度拆分',
    value: `請分析以下佛教經典/開示原文，將其意群切分為合適的子科判骨架。\n必須嚴格回傳 JSON 格式，架構如下 (只需回傳子層陣列):\n[ { "title": "科判標題", "content": "該標題對應的拆分後內文", "note": "" } ]\n\n注意：請務必只回傳合法的 JSON 陣列，不要有任何多餘的解釋文字。`
  },
  {
    label: '細緻：逐句/小段落詳細拆分',
    value: `請將以下原文進行非常細緻的逐句或小段落拆分，適合深度研討。\n必須嚴格回傳 JSON 格式，架構如下:\n[ { "title": "精煉標題", "content": "詳細內文段落", "note": "" } ]\n\n注意：只回傳 JSON 陣列，無多餘文字。`
  },
  {
    label: '簡要：僅提煉核心骨架 (不保留全文)',
    value: `請閱讀以下原文，僅提煉出最核心的科判大綱骨架，不需保留完整內文，將重點摘要放入 note 中。\n必須嚴格回傳 JSON 格式，架構如下:\n[ { "title": "核心標題", "content": "", "note": "重點摘要" } ]\n\n注意：只回傳 JSON 陣列。`
  }
];

// --- 主題設定 ---
const THEMES = {
  default: "bg-stone-50 text-stone-800",
  beige: "bg-[#fdfbf7] text-[#5c4b3a]",
  dark: "bg-[#1a1a1a] text-[#e0e0e0]",
  bamboo: "bg-[#f0f4f0] text-[#2c3e2e]"
};

// --- 獨立的 TreeNode 元件 ---
const TreeNode = React.memo(({ 
  kepanNode, depth, mode, theme, userApiKey,
  expandedTreeNodes, expandedContentNodes, expandedNoteNodes,
  deleteMenuId, dragInfo, isAILoadingId,
  actions, showToast 
}) => {
  const isTreeExpanded = expandedTreeNodes.has(kepanNode.id);
  const isContentVisible = mode === 'text' || mode === 'split' || expandedContentNodes.has(kepanNode.id);
  const isNoteVisible = expandedNoteNodes.has(kepanNode.id);
  
  const hasChildren = kepanNode.children && kepanNode.children.length > 0;
  const hasContent = kepanNode.content && kepanNode.content.trim().length > 0;
  const hasNote = kepanNode.note && kepanNode.note.trim().length > 0;

  const isDark = theme === 'dark';
  const depthColors = isDark 
    ? ['text-blue-300 border-blue-300', 'text-teal-300 border-teal-300', 'text-emerald-300 border-emerald-300', 'text-cyan-300 border-cyan-300', 'text-indigo-300 border-indigo-300']
    : ['text-blue-900 border-blue-900', 'text-teal-800 border-teal-800', 'text-emerald-700 border-emerald-700', 'text-cyan-700 border-cyan-700', 'text-blue-600 border-blue-600'];
  const colorClass = depthColors[depth % depthColors.length];
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

  const handleAIAssistClick = (e) => {
    e.stopPropagation();
    if (!userApiKey || userApiKey.trim() === '') {
      showToast("請先至右上角「設定」輸入 Google Gemini API 金鑰。");
      return;
    }
    actions.generateAISkeleton(kepanNode.id);
  };

  const isDragged = dragInfo.draggedId === kepanNode.id;
  const isDragOver = dragInfo.overId === kepanNode.id;
  let dropZoneClass = 'border border-transparent';
  if (isDragOver && dragInfo.position === 'top') dropZoneClass = 'border-t-2 border-t-teal-500 rounded-t';
  if (isDragOver && dragInfo.position === 'bottom') dropZoneClass = 'border-b-2 border-b-teal-500 rounded-b';
  if (isDragOver && dragInfo.position === 'inside') dropZoneClass = 'bg-teal-500/10 rounded ring-1 ring-teal-500/50';

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

  return (
    <div className={`
      ${mode === 'text' ? 'mb-0 mt-0' : 'mb-2'} 
      ${(mode === 'outline' || mode === 'split') && depth > 0 ? `ml-6 border-l-2 ${isDark ? 'border-stone-700' : 'border-stone-200'} pl-4` : 'ml-0'}
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
            className={`mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-stone-500 hover:text-stone-300' : 'text-stone-300 hover:text-stone-500'}`}
            title="按住拖曳以排序"
          >
            <GripVertical size={16} />
          </div>
        )}

        {(mode === 'outline' || mode === 'split') && hasChildren ? (
          <button 
            onClick={(e) => { e.stopPropagation(); actions.toggleTree(kepanNode.id); }}
            className={`mt-1 transition-colors shrink-0 ${isDark ? 'text-stone-500 hover:text-teal-400' : 'text-stone-400 hover:text-teal-600'}`}
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
                ${mode === 'text' ? `${textSizeClass} mb-0 pb-0 mt-3` : 'text-lg mb-1 pb-1'}
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
                  onClick={handleAIAssistClick}
                  disabled={isAILoadingId === kepanNode.id}
                  className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 text-purple-400 hover:bg-purple-500/20 ${isAILoadingId === kepanNode.id ? 'animate-pulse' : ''}`}
                  title="AI 輔助骨架生成"
                >
                  <Wand2 size={14} />
                </button>
              )}

              <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${mode === 'split' ? 'hidden' : ''}`}>
                <button onClick={(e) => { e.stopPropagation(); actions.setFocusId(kepanNode.id); }} className="p-1 text-stone-400 hover:text-teal-500 hover:bg-teal-500/20 rounded" title="聚焦此節點">
                  <Target size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); actions.setDeleteMenuId(deleteMenuId === kepanNode.id ? null : kepanNode.id); }} className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-500/20 rounded" title="刪除選單">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {deleteMenuId === kepanNode.id && (
            <div className={`border shadow-lg rounded-md p-2 mb-2 flex gap-2 items-center text-sm z-10 relative animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
              <span className={`font-medium ml-1 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>刪除選項：</span>
              <button onClick={() => actions.mergeUpKepanNode(kepanNode.id)} className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 rounded transition-colors" title="刪除此標題，內文與子節點併入上一段">
                向上合併
              </button>
              <button onClick={() => actions.deleteKepanNode(kepanNode.id)} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded transition-colors" title="徹底刪除此標題與其下所有內容">
                刪除全部
              </button>
              <button onClick={() => actions.setDeleteMenuId(null)} className={`px-3 py-1 rounded transition-colors ${isDark ? 'bg-stone-700 hover:bg-stone-600 text-stone-300' : 'bg-stone-100 hover:bg-stone-200 text-stone-600'}`}>
                取消
              </button>
            </div>
          )}

          {isContentVisible && mode !== 'split' && (
            <div className={`relative group/text ${mode === 'text' ? 'mb-0 mt-0' : 'mb-1 mt-1'} w-full`}>
              <SmartTextarea
                value={kepanNode.content}
                onChange={(val) => actions.updateKepanNode(kepanNode.id, 'content', val)}
                onSplit={(cursorStart, currentText) => actions.splitTextToSiblingKepanNode(kepanNode.id, cursorStart, currentText)}
                placeholder={mode === 'text' ? "在此輸入或貼上原文 (反白文字可使用浮動工具列標記重點)..." : "無內文"}
                isDark={isDark}
                className={`
                  w-full bg-transparent transition-all
                  ${mode === 'outline' ? `text-sm p-2 rounded border ${isDark ? 'text-stone-400 bg-stone-800/50 border-stone-700' : 'text-stone-500 bg-stone-50/50 border-stone-100'}` : `text-base leading-relaxed p-0 rounded ${isDark ? 'text-stone-300 hover:bg-stone-800/30 focus:bg-stone-800/30' : 'text-stone-800 hover:bg-stone-50/50 focus:bg-stone-50/50'}`}
                `}
              />
              
              {mode === 'text' && kepanNode.content && (
                <div className="absolute bottom-1 right-2 opacity-0 group-hover/text:opacity-100 pointer-events-none transition-all z-0">
                  <span className="bg-teal-500/20 text-teal-600 text-xs px-2 py-1 rounded shadow backdrop-blur-sm">
                    Ctrl+Enter 同層拆分
                  </span>
                </div>
              )}
            </div>
          )}

          {isNoteVisible && (
            <div className={`mb-2 mt-2 p-3 rounded-lg border-l-4 border-amber-400 shadow-sm relative w-full ${isDark ? 'bg-[#2a2418] text-amber-100' : 'bg-[#fffdf5] text-[#5c4b3a]'}`}>
              <div className="flex items-center gap-2 mb-1 text-xs font-bold text-amber-600/70 uppercase tracking-widest">
                <Leaf size={12} /> Dharma Journaling
              </div>
              <SmartTextarea
                value={kepanNode.note || ''}
                onChange={(val) => actions.updateKepanNode(kepanNode.id, 'note', val)}
                placeholder="在此記錄您的修行觀察、心相調伏或疑問 (支援浮動工具列)..."
                isDark={isDark}
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
              key={childNode.id} kepanNode={childNode} depth={depth + 1} mode={mode} theme={theme} userApiKey={userApiKey}
              expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes}
              deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={actions} showToast={showToast}
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
  const [theme, setTheme] = useState('default');
  const [focusId, setFocusId] = useState(null); 
  const [expandedTreeNodes, setExpandedTreeNodes] = useState(new Set(['root-1']));
  const [expandedContentNodes, setExpandedContentNodes] = useState(new Set());
  const [expandedNoteNodes, setExpandedNoteNodes] = useState(new Set());
  const [deleteMenuId, setDeleteMenuId] = useState(null);
  const [dragInfo, setDragInfo] = useState({ draggedId: null, overId: null, position: null });
  
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('outline_api_key') || '');
  const [userApiModel, setUserApiModel] = useState(() => localStorage.getItem('outline_api_model') || 'gemini-3.1-flash');
  const [aiPrompt, setAiPrompt] = useState(() => localStorage.getItem('outline_ai_prompt') || AI_PROMPT_PRESETS[0].value);
  const [isAILoadingId, setIsAILoadingId] = useState(null);
  
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg, duration = 5000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('outline_editor_autosave_v3', JSON.stringify(kepanTree));
    } catch (error) {}
  }, [kepanTree]);

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

  const toggleAllContent = (show) => {
    if (!show) {
      setExpandedContentNodes(new Set());
      return;
    }
    const allContentIds = new Set();
    const traverse = (nodes) => {
      nodes.forEach(node => {
        if (node.content && node.content.trim().length > 0) allContentIds.add(node.id);
        if (node.children) traverse(node.children);
      });
    };
    traverse(kepanTree);
    setExpandedContentNodes(allContentIds);
  };

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
    if (cursorStart === 0 || cursorStart === currentText.length) return;

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

  const generateAISkeleton = async (nodeId) => {
    const targetNode = findNodeInKepanTree(kepanTree, nodeId);
    if (!targetNode || !targetNode.content) return;
    
    const actualKey = userApiKey.trim();
    if (!actualKey) {
      showToast("請先至右上角「設定」輸入 Google Gemini API 金鑰。");
      return;
    }
    
    setIsAILoadingId(nodeId);

    const payload = {
      contents: [{ parts: [{ text: `原文內容：\n${targetNode.content}` }] }],
      systemInstruction: { parts: [{ text: aiPrompt }] },
      generationConfig: { responseMimeType: "application/json" }
    };

    let attempt = 0;
    const maxAttempts = 2; 
    let success = false;

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${userApiModel}:generateContent?key=${actualKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorTxt = await response.text();
          throw new Error(`API 錯誤 (${response.status}): ${errorTxt.substring(0, 100)}`);
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
          break; 
        } else {
          throw new Error("回傳結果為空");
        }
      } catch (error) {
        attempt++;
        if (attempt === maxAttempts) {
           showToast(`AI 生成失敗。原因: ${error.message}`);
        } else {
           await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    setIsAILoadingId(null);
  };

  const kepanTreeActions = {
    updateKepanNode, addSiblingKepanNode, indentKepanNode, outdentKepanNode, moveNode,
    deleteKepanNode, mergeUpKepanNode, splitTextToSiblingKepanNode, setFocusId,
    setDeleteMenuId, toggleTree, toggleContent, toggleNote, generateAISkeleton,
    handleDragStart, handleDragOver, handleDrop
  };

  const handleNewFile = () => {
    if (window.confirm("確定要開啟新檔案嗎？未存檔的變更將會遺失。")) {
      commitChange(INITIAL_EMPTY_KEPAN_TREE);
      setFocusId(null);
      showToast("已建立新科判檔案。");
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
    localStorage.setItem('outline_ai_prompt', aiPrompt);
    setShowSettings(false);
    showToast("設定已儲存");
  };

  const currentRenderData = focusId ? [findNodeInKepanTree(kepanTree, focusId)].filter(Boolean) : kepanTree;
  const currentBreadcrumbPath = focusId ? findPathInKepanTree(kepanTree, focusId) : null;
  const isDark = theme === 'dark';

  const renderContinuousSplitText = (nodes) => {
    return nodes.map(node => (
      <div key={`split-${node.id}`} id={`split-content-${node.id}`} className="mb-6 group transition-colors duration-500 rounded p-2">
        <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>{node.title}</h3>
        {node.content && (
           <div className={`leading-relaxed whitespace-pre-wrap ${isDark ? 'text-stone-300' : 'text-stone-800'}`} dangerouslySetInnerHTML={{ __html: formatRichText(node.content, isDark) }} />
        )}
        {node.note && (
          <div className={`mt-2 p-3 text-sm rounded-lg border-l-4 border-amber-400 ${isDark ? 'bg-[#2a2418] text-amber-100' : 'bg-[#fffdf5] text-[#5c4b3a]'}`}>
            <div className="font-bold text-amber-600/70 mb-1 flex items-center gap-1"><Leaf size={12}/> 札記</div>
            <div dangerouslySetInnerHTML={{ __html: formatRichText(node.note, isDark) }} />
          </div>
        )}
        {node.children && node.children.length > 0 && (
          <div className={`mt-4 pl-4 border-l-2 ${isDark ? 'border-stone-800' : 'border-stone-100'}`}>
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
            <div className={`py-1 px-2 rounded font-medium flex items-center gap-2 ${isDark ? 'bg-stone-800 text-teal-300' : 'bg-teal-50 text-teal-800'}`}>
              <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-teal-500' : 'bg-teal-600'}`}></div>
              {node.title || '(未命名節點)'}
            </div>
            {node.children && node.children.length > 0 && (
              <div className={`ml-4 pl-4 border-l ${isDark ? 'border-stone-700' : 'border-stone-200'} mt-2`}>
                {renderMacroMap(node.children)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${THEMES[theme]}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded shadow-lg z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in ${isDark ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-white'}`}>
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100"><X size={16}/></button>
        </div>
      )}

      {/* Header 工具列 */}
      <header className={`shadow-sm px-6 py-3 flex flex-wrap justify-between items-center sticky top-0 z-20 gap-4 border-b ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'}`}>
        <div className="flex items-center gap-4">
          <h1 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-stone-100' : 'text-stone-800'}`}>
            <ListTree className="text-teal-600" />
            聞思科判編輯器
          </h1>
          
          <div className={`flex rounded-lg p-1 border gap-1 ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-stone-100 border-stone-200'}`}>
            <button onClick={() => setMode('text')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'text' ? (isDark ? 'bg-stone-700 text-teal-300' : 'bg-white shadow text-teal-700') : 'text-stone-400 hover:text-stone-300'}`} title="原文模式">
              <BookText size={16} /> <span className="hidden sm:inline">原文模式</span>
            </button>
            <button onClick={() => setMode('outline')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'outline' ? (isDark ? 'bg-stone-700 text-teal-300' : 'bg-white shadow text-teal-700') : 'text-stone-400 hover:text-stone-300'}`} title="科判模式">
              <ListTree size={16} /> <span className="hidden sm:inline">科判模式</span>
            </button>
            <button onClick={() => setMode('split')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'split' ? (isDark ? 'bg-stone-700 text-teal-300' : 'bg-white shadow text-teal-700') : 'text-stone-400 hover:text-stone-300'}`} title="對讀連動模式">
              <Columns size={16} /> <span className="hidden sm:inline">對讀模式</span>
            </button>
            <button onClick={() => setMode('map')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'map' ? (isDark ? 'bg-stone-700 text-teal-300' : 'bg-white shadow text-teal-700') : 'text-stone-400 hover:text-stone-300'}`} title="總體骨架鳥瞰圖">
              <Map size={16} /> <span className="hidden sm:inline">鳥瞰模式</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <button onClick={handleUndo} disabled={historyState.past.length === 0} className={`p-1.5 rounded-md transition-colors ${historyState.past.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-teal-500/20 text-teal-600'}`} title="復原 (Ctrl+Z)"><Undo2 size={18}/></button>
            <button onClick={handleRedo} disabled={historyState.future.length === 0} className={`p-1.5 rounded-md transition-colors ${historyState.future.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-teal-500/20 text-teal-600'}`} title="重做 (Ctrl+Y)"><Redo2 size={18}/></button>
          </div>

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-stone-700' : 'bg-stone-300'}`}></div>

          <button onClick={() => setTheme(theme === 'default' ? 'beige' : theme === 'beige' ? 'dark' : theme === 'dark' ? 'bamboo' : 'default')} className={`p-1.5 rounded-full hover:bg-stone-500/20 transition-colors ${isDark ? 'text-yellow-400' : 'text-stone-500'}`} title="切換禪風主題">
            {theme === 'dark' ? <Moon size={18}/> : theme === 'bamboo' ? <Leaf size={18}/> : <Sun size={18}/>}
          </button>
          
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-full hover:bg-stone-500/20 text-stone-500 transition-colors" title="設定"><Settings size={18}/></button>

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-stone-700' : 'bg-stone-300'}`}></div>

          <button onClick={handleNewFile} className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${isDark ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300' : 'bg-white border-stone-300 hover:bg-stone-50 text-stone-600'}`} title="開新檔案">
            <FilePlus size={16} /> <span className="hidden sm:inline">開新檔</span>
          </button>

          <label className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${isDark ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300' : 'bg-white border-stone-300 hover:bg-stone-50 text-stone-600'}`} title="匯入本地 JSON">
            <FolderOpen size={16} /> <span className="hidden sm:inline">開啟</span>
            <input type="file" accept=".json" onChange={handleImportFromFile} className="hidden" />
          </label>
          <button onClick={handleExportToFile} className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded shadow-sm hover:bg-teal-700 transition-colors" title="匯出為 JSON">
            <Save size={16} /> <span className="hidden sm:inline">存檔</span>
          </button>
        </div>
      </header>

      {/* 設定面板 Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-xl p-6 shadow-2xl ${isDark ? 'bg-stone-900 text-stone-200' : 'bg-white text-stone-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} className="text-stone-500"/> 偏好與 AI 設定</h2>
              <button onClick={() => setShowSettings(false)} className="hover:bg-stone-500/20 p-1 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold mb-2 text-teal-600"><Wand2 size={16} className="inline mr-1"/> Google Gemini API Key</label>
                <input 
                  type="password" 
                  value={userApiKey} 
                  onChange={(e) => setUserApiKey(e.target.value)}
                  placeholder="請貼上您的 API 金鑰 (必填)"
                  className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-stone-50 border-stone-200'}`}
                />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-bold mb-2 text-teal-600">指定模型</label>
                <select 
                  className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-800'}`}
                  onChange={(e) => setUserApiModel(e.target.value)}
                  value={userApiModel}
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2 text-teal-600"><FileText size={16} className="inline mr-1"/> 自訂 AI 拆分提示詞 (System Prompt)</label>
              <select 
                className={`w-full mb-2 p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-800'}`}
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
                className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono ${isDark ? 'bg-stone-800 border-stone-700 text-stone-300' : 'bg-stone-50 border-stone-200 text-stone-600'}`}
              />
            </div>

            <div className="flex justify-end">
              <button onClick={saveSettings} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-medium transition-colors">確認並儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      {focusId && currentBreadcrumbPath && (
        <div className={`border-b px-6 py-2 flex items-center gap-2 text-sm sticky top-[60px] z-10 ${isDark ? 'bg-[#121c1a] border-teal-900/50 text-teal-400' : 'bg-teal-50 border-teal-100 text-teal-800'}`}>
          <button onClick={() => setFocusId(null)} className="hover:text-teal-600 flex items-center gap-1 font-medium">
            <Home size={14} /> 根目錄
          </button>
          {currentBreadcrumbPath.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight size={14} className="text-teal-500/50" />
              <button onClick={() => setFocusId(crumb.id)} className={`hover:text-teal-500 ${idx === currentBreadcrumbPath.length - 1 ? 'font-bold' : ''}`}>
                {crumb.title || '(無標題)'}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Editor Main */}
      <main className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        {mode === 'map' ? (
           <div className={`w-full max-w-4xl p-8 rounded-lg shadow-sm border min-h-[80vh] ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'}`}>
             <h2 className={`text-2xl font-bold mb-8 text-center tracking-widest ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>總體骨架鳥瞰圖</h2>
             {renderMacroMap(currentRenderData)}
           </div>
        ) : mode === 'split' ? (
           <div className="w-full max-w-7xl flex gap-6 h-[80vh]">
             {/* 左側大綱區 */}
             <div className={`w-1/3 overflow-y-auto p-6 rounded-lg shadow-sm border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'}`}>
                {currentRenderData.map(rootNode => (
                  <TreeNode 
                    key={rootNode.id} kepanNode={rootNode} depth={0} mode={mode} theme={theme} userApiKey={userApiKey}
                    expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes}
                    deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={kepanTreeActions} showToast={showToast}
                  />
                ))}
             </div>
             {/* 右側連續對讀區 */}
             <div className={`w-2/3 overflow-y-auto p-8 rounded-lg shadow-sm border ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'}`}>
                {renderContinuousSplitText(currentRenderData)}
             </div>
           </div>
        ) : (
          <div className={`w-full max-w-4xl p-8 rounded-lg shadow-sm border min-h-[80vh] ${isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-100'}`}>
            {currentRenderData.map(rootNode => (
              <TreeNode 
                key={rootNode.id} kepanNode={rootNode} depth={0} mode={mode} theme={theme} userApiKey={userApiKey}
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
