// Version: 1.4.2 - 壓縮原文模式間距、新增開新檔案功能、優化 API Key 判定與提示
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, ListTree, ChevronRight, ChevronDown, 
  Trash2, Save, FolderOpen, Target, Home, 
  SplitSquareHorizontal, GripVertical, AlignLeft,
  Undo2, Redo2, Columns, Map, BookOpen, Wand2, Settings,
  X, Sun, Moon, Leaf, BookText, FilePlus
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

// --- 初始空白資料模板 ---
const INITIAL_EMPTY_KEPAN_TREE = [{
  "id": "root-1",
  "title": "新科判",
  "content": "",
  "note": "",
  "children": []
}];

// --- AI 提示詞預設模板 ---
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
  const textareaRef = useRef(null);
  const noteAreaRef = useRef(null);
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

  const autoResizeTextarea = (e, field) => {
    try {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
      actions.updateKepanNode(kepanNode.id, field, e.target.value);
    } catch (error) {
      console.error("更新文字高度發生錯誤:", error);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [kepanNode.content, mode, isContentVisible]);

  useEffect(() => {
    if (noteAreaRef.current) {
      noteAreaRef.current.style.height = 'auto';
      noteAreaRef.current.style.height = `${noteAreaRef.current.scrollHeight}px`;
    }
  }, [kepanNode.note, isNoteVisible]);

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
    if (!userApiKey) {
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
                ${mode === 'text' ? `${textSizeClass} mb-0 pb-0 mt-2` : 'text-lg mb-1 pb-1'}
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
            <div className={`relative group/text ${mode === 'text' ? 'mb-0 mt-0' : 'mb-1 mt-1'}`}>
              <textarea
                ref={textareaRef}
                value={kepanNode.content}
                onChange={(e) => autoResizeTextarea(e, 'content')}
                placeholder={mode === 'text' ? "在此輸入或貼上原文..." : "無內文"}
                className={`
                  w-full bg-transparent resize-none overflow-hidden focus:outline-none transition-all
                  ${mode === 'outline' ? `text-sm p-2 rounded border ${isDark ? 'text-stone-400 bg-stone-800/50 border-stone-700' : 'text-stone-500 bg-stone-50/50 border-stone-100'}` : `text-base leading-relaxed p-0 hover:bg-stone-50/50 focus:bg-stone-50/50 rounded ${isDark ? 'text-stone-300 hover:bg-stone-800/30 focus:bg-stone-800/30' : 'text-stone-800'}`}
                `}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    actions.splitTextToChildKepanNode(kepanNode.id, textareaRef);
                  }
                }}
              />
              
              {mode === 'text' && kepanNode.content && (
                <button 
                  onClick={() => actions.splitTextToChildKepanNode(kepanNode.id, textareaRef)}
                  className="absolute bottom-2 right-2 opacity-0 group-hover/text:opacity-100 bg-teal-500/20 text-teal-600 text-xs px-2 py-1 rounded shadow flex items-center gap-1 hover:bg-teal-500/30 transition-all backdrop-blur-sm"
                  title="快捷鍵: Ctrl/Cmd + Enter"
                >
                  <SplitSquareHorizontal size={12} /> 游標處拆分
                </button>
              )}
            </div>
          )}

          {isNoteVisible && (
            <div className={`mb-2 mt-2 p-3 rounded-lg border-l-4 border-amber-400 shadow-sm relative ${isDark ? 'bg-[#2a2418] text-amber-100' : 'bg-[#fffdf5] text-[#5c4b3a]'}`}>
              <div className="flex items-center gap-2 mb-1 text-xs font-bold text-amber-600/70 uppercase tracking-widest">
                <Leaf size={12} /> Dharma Journaling
              </div>
              <textarea
                ref={noteAreaRef}
                value={kepanNode.note || ''}
                onChange={(e) => autoResizeTextarea(e, 'note')}
                placeholder="在此記錄您的修行觀察、心相調伏或疑問..."
                className="w-full bg-transparent resize-none overflow-hidden focus:outline-none text-sm leading-relaxed"
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
      return {
        past: [],
        present: savedTree ? JSON.parse(savedTree) : INITIAL_EMPTY_KEPAN_TREE,
        future: []
      };
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

  const splitTextToChildKepanNode = useCallback((nodeId, textareaRef) => {
    if (!textareaRef.current) return;
    const cursorStart = textareaRef.current.selectionStart;
    const currentText = textareaRef.current.value;
    if (cursorStart === 0 || cursorStart === currentText.length) return;

    const textBefore = currentText.substring(0, cursorStart).replace(/\s+$/, '');
    const textAfter = currentText.substring(cursorStart).replace(/^\s+/, '');

    commitChange(currentTree => {
      const clonedTree = deepCloneKepanTree(currentTree);
      const targetNode = findNodeInKepanTree(clonedTree, nodeId);
      if (targetNode) {
        targetNode.content = textBefore;
        const newNode = { id: generateUniqueId(), title: '新子科判', content: textAfter, note: '', children: [] };
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

  // --- AI 輔助生成 ---
  const generateAISkeleton = async (nodeId) => {
    const targetNode = findNodeInKepanTree(kepanTree, nodeId);
    if (!targetNode || !targetNode.content) return;
    
    // 強制驗證 API Key，無 Key 則阻擋執行並提示
    if (!userApiKey || userApiKey.trim() === '') {
      showToast("請先至右上角「設定」輸入您的 Google Gemini API 金鑰。");
      return;
    }
    
    setIsAILoadingId(nodeId);
    
    // 調整輪詢陣列，以 2.5-flash 作為首選主力，避免 429 錯誤
    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.0-flash', 'gemini-flash-latest'];

    const payload = {
      contents: [{ parts: [{ text: `原文內容：\n${targetNode.content}` }] }],
      systemInstruction: { parts: [{ text: aiPrompt }] },
      generationConfig: { responseMimeType: "application/json" }
    };

    let lastErrorMsg = "";
    let success = false;

    for (const modelName of modelsToTry) {
      if (success) break;
      
      let attempt = 0;
      const maxAttempts = 2; 
      const delays = [1500, 3000];

      while (attempt < maxAttempts) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${userApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errorTxt = await response.text();
            throw new Error(`${modelName} 回報錯誤: ${response.status} - ${errorTxt}`);
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
            break; 
          } else {
            throw new Error(`${modelName} 回傳結果為空`);
          }
        } catch (error) {
          lastErrorMsg = error.message;
          attempt++;
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
          }
        }
      }
    }
    
    if (!success) {
      showToast(`AI 生成失敗。原因: ${lastErrorMsg.substring(0, 100)}... 請確認 API 金鑰配額與有效性。`, 7000);
    }
    setIsAILoadingId(null);
  };

  const kepanTreeActions = {
    updateKepanNode, addSiblingKepanNode, indentKepanNode, outdentKepanNode, moveNode,
    deleteKepanNode, mergeUpKepanNode, splitTextToChildKepanNode, setFocusId,
    setDeleteMenuId, toggleTree, toggleContent, toggleNote, generateAISkeleton,
    handleDragStart, handleDragOver, handleDrop
  };

  // --- 檔案功能 ---
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
    e.target.value = ''; // Reset input to allow re-importing same file
  };

  const saveSettings = () => {
    localStorage.setItem('outline_api_key', userApiKey);
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
        {node.content && <p className={`leading-relaxed whitespace-pre-wrap ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>{node.content}</p>}
        {node.note && (
          <div className={`mt-2 p-3 text-sm rounded-lg border-l-4 border-amber-400 ${isDark ? 'bg-[#2a2418] text-amber-100' : 'bg-[#fffdf5] text-[#5c4b3a]'}`}>
            <div className="font-bold text-amber-600/70 mb-1 flex items-center gap-1"><Leaf size={12}/> 札記</div>
            {node.note}
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

          {/* 新增：開新檔案 */}
          <button onClick={handleNewFile} className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-200 text-stone-600'}`} title="開新檔案">
            <FilePlus size={18} />
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
            
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2 text-teal-600"><Wand2 size={16} className="inline mr-1"/> Google Gemini API Key</label>
              <input 
                type="password" 
                value={userApiKey} 
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder="貼上您的 API 金鑰 (必填才能使用 AI 功能)"
                className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-stone-50 border-stone-200'}`}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>系統不提供預設金鑰，請確保輸入有效金鑰以啟用魔法棒拆分功能。</p>
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
