// Version: 1.3.1 - 修正模式預設順序、優化 AI 解析穩定度與錯誤提示、修復修行筆記區塊顯示問題
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, ListTree, ChevronRight, ChevronDown, 
  Trash2, Save, FolderOpen, Target, Home, 
  SplitSquareHorizontal, GripVertical, AlignLeft,
  Undo2, Redo2, Columns, Map, BookOpen, Wand2, Settings,
  X, Sun, Moon, Leaf, BookText
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

// --- 主題設定 ---
const THEMES = {
  default: "bg-stone-50 text-stone-800",
  beige: "bg-[#fdfbf7] text-[#5c4b3a]",  // 貝葉經黃
  dark: "bg-[#1a1a1a] text-[#e0e0e0]",  // 檀木沉黑
  bamboo: "bg-[#f0f4f0] text-[#2c3e2e]" // 禪意竹綠
};

// --- 獨立的 TreeNode 元件 ---
const TreeNode = React.memo(({ 
  kepanNode, depth, mode, theme,
  expandedTreeNodes, expandedContentNodes, expandedNoteNodes,
  deleteMenuId, dragInfo, isAILoadingId,
  actions 
}) => {
  const textareaRef = useRef(null);
  const noteAreaRef = useRef(null);
  const isTreeExpanded = expandedTreeNodes.has(kepanNode.id);
  
  const isContentVisible = mode === 'text' || mode === 'split' || expandedContentNodes.has(kepanNode.id);
  const isNoteVisible = expandedNoteNodes.has(kepanNode.id);
  
  const hasChildren = kepanNode.children && kepanNode.children.length > 0;
  const hasContent = kepanNode.content && kepanNode.content.trim().length > 0;
  const hasNote = kepanNode.note && kepanNode.note.trim().length > 0;

  // 樣式運算 (配合深色主題調整)
  const isDark = theme === 'dark';
  const depthColors = isDark 
    ? ['text-blue-300 border-blue-300', 'text-teal-300 border-teal-300', 'text-emerald-300 border-emerald-300', 'text-cyan-300 border-cyan-300', 'text-indigo-300 border-indigo-300']
    : ['text-blue-900 border-blue-900', 'text-teal-800 border-teal-800', 'text-emerald-700 border-emerald-700', 'text-cyan-700 border-cyan-700', 'text-blue-600 border-blue-600'];
  const colorClass = depthColors[depth % depthColors.length];
  const textSizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
  const textSizeClass = textSizes[Math.min(depth, textSizes.length - 1)];

  // 自動調整高度
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

  // 鍵盤快捷鍵處理 (包含 Ctrl+Up/Down 移動)
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

  // 拖曳視覺反饋
  const isDragged = dragInfo.draggedId === kepanNode.id;
  const isDragOver = dragInfo.overId === kepanNode.id;
  let dropZoneClass = 'border border-transparent';
  if (isDragOver && dragInfo.position === 'top') dropZoneClass = 'border-t-2 border-t-teal-500 rounded-t';
  if (isDragOver && dragInfo.position === 'bottom') dropZoneClass = 'border-b-2 border-b-teal-500 rounded-b';
  if (isDragOver && dragInfo.position === 'inside') dropZoneClass = 'bg-teal-500/10 rounded ring-1 ring-teal-500/50';

  // 針對對讀模式的點擊連動
  const handleNodeClick = () => {
    if (mode === 'split') {
      const element = document.getElementById(`split-content-${kepanNode.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 短暫高亮
        element.classList.add('ring-2', 'ring-teal-400', 'bg-teal-500/10');
        setTimeout(() => element.classList.remove('ring-2', 'ring-teal-400', 'bg-teal-500/10'), 1500);
      }
    }
  };

  return (
    <div className={`
      ${mode === 'text' ? 'mb-4' : 'mb-2'} 
      ${(mode === 'outline' || mode === 'split') && depth > 0 ? `ml-6 border-l-2 ${isDark ? 'border-stone-700' : 'border-stone-200'} pl-4` : 'ml-0'}
      ${isDragged ? 'opacity-30 scale-[0.98]' : 'opacity-100 scale-100'}
      transition-all duration-200
    `}>
      <div 
        onDragOver={(e) => actions.handleDragOver(e, kepanNode.id)}
        onDrop={(e) => actions.handleDrop(e, kepanNode.id)}
        className={`group relative flex items-start gap-1 p-1.5 -ml-1.5 transition-colors ${dropZoneClass}`}
        onClick={handleNodeClick}
      >
        
        {/* 拖曳把手 */}
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

        {/* 展開/收合圖示 */}
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
          {/* 標題行 */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                ${mode === 'text' ? `${textSizeClass} mb-1 pb-1` : 'text-lg'}
              `}
            />
            
            {/* 工具列 (內文切換、筆記切換、AI輔助、聚焦、刪除) */}
            <div className={`flex items-center gap-1 shrink-0 ${mode === 'split' && !hasContent && !hasNote ? 'opacity-0' : ''}`}>
              {/* 內文切換按鈕 */}
              {mode === 'outline' && hasContent && (
                <button
                  onClick={(e) => { e.stopPropagation(); actions.toggleContent(kepanNode.id); }}
                  className={`p-1 rounded transition-colors ${isContentVisible ? 'bg-teal-500/20 text-teal-600' : 'text-stone-400 hover:bg-stone-500/20'}`}
                  title={isContentVisible ? "隱藏內文" : "顯示內文"}
                >
                  <AlignLeft size={14} />
                </button>
              )}
              
              {/* 修行筆記按鈕 */}
              {(mode === 'outline' || mode === 'text' || mode === 'split') && (hasNote || isNoteVisible || hasContent) && (
                <button
                  onClick={(e) => { e.stopPropagation(); actions.toggleNote(kepanNode.id); }}
                  className={`p-1 rounded transition-colors ${isNoteVisible ? 'bg-amber-500/20 text-amber-600' : (hasNote ? 'text-amber-500' : 'text-stone-400 hover:bg-stone-500/20 opacity-0 group-hover:opacity-100')}`}
                  title="修行筆記 / 札記"
                >
                  <BookOpen size={14} />
                </button>
              )}

              {/* AI 輔助生成骨架 (需有內文) */}
              {hasContent && mode !== 'split' && (
                <button
                  onClick={(e) => { e.stopPropagation(); actions.generateAISkeleton(kepanNode.id); }}
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

          {/* 原位刪除選單 */}
          {deleteMenuId === kepanNode.id && (
            <div className={`border shadow-lg rounded-md p-2 mb-2 flex gap-2 items-center text-sm z-10 relative animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
              <span className={`font-medium ml-1 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>刪除選項：</span>
              <button onClick={() => actions.mergeUpKepanNode(kepanNode.id)} className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 rounded transition-colors" title="標題刪除，內文與子節點併入上一段">
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

          {/* 原文內容區 */}
          {isContentVisible && mode !== 'split' && (
            <div className="relative group/text mb-2">
              <textarea
                ref={textareaRef}
                value={kepanNode.content}
                onChange={(e) => autoResizeTextarea(e, 'content')}
                placeholder={mode === 'text' ? "在此輸入或貼上原文..." : "無內文"}
                className={`
                  w-full bg-transparent resize-none overflow-hidden focus:outline-none transition-all
                  ${mode === 'outline' ? `text-sm p-2 rounded border ${isDark ? 'text-stone-400 bg-stone-800/50 border-stone-700' : 'text-stone-500 bg-stone-50/50 border-stone-100'}` : `text-base leading-relaxed p-1 rounded ${isDark ? 'text-stone-300 hover:bg-stone-800/50 focus:bg-stone-800/50' : 'text-stone-800 hover:bg-stone-50 focus:bg-stone-50'}`}
                `}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    actions.splitTextToChildKepanNode(kepanNode.id, textareaRef);
                  }
                }}
              />
              
              {/* 拆分按鈕 */}
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

          {/* 修行觀察札記區 (已修復：不再受 mode !== 'split' 的阻擋) */}
          {isNoteVisible && (
            <div className={`mb-2 p-3 rounded-lg border-l-4 border-amber-400 shadow-sm relative ${isDark ? 'bg-[#2a2418] text-amber-100' : 'bg-[#fffdf5] text-[#5c4b3a]'}`}>
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

      {/* 遞迴渲染子節點 */}
      {hasChildren && (mode === 'text' || mode === 'split' || isTreeExpanded) && (
        <div className="mt-1">
          {kepanNode.children.map(childNode => (
            <TreeNode 
              key={childNode.id} kepanNode={childNode} depth={depth + 1} mode={mode} theme={theme}
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
  // 核心資料狀態 (含 Undo/Redo)
  const [history, setHistory] = useState(() => {
    try {
      const savedTree = localStorage.getItem('outline_editor_autosave_v3');
      return savedTree ? [JSON.parse(savedTree)] : [INITIAL_EMPTY_KEPAN_TREE];
    } catch (error) {
      return [INITIAL_EMPTY_KEPAN_TREE];
    }
  });
  const [historyIndex, setHistoryIndex] = useState(0);
  const kepanTree = history[historyIndex];

  // 視圖與UI狀態 - 預設改為 'text' (原文模式)
  const [mode, setMode] = useState('text'); 
  const [theme, setTheme] = useState('default');
  const [focusId, setFocusId] = useState(null); 
  const [expandedTreeNodes, setExpandedTreeNodes] = useState(new Set(['root-1']));
  const [expandedContentNodes, setExpandedContentNodes] = useState(new Set());
  const [expandedNoteNodes, setExpandedNoteNodes] = useState(new Set());
  const [deleteMenuId, setDeleteMenuId] = useState(null);
  const [dragInfo, setDragInfo] = useState({ draggedId: null, overId: null, position: null });
  
  // 設定與 AI 狀態
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  const [isAILoadingId, setIsAILoadingId] = useState(null);

  // 本地端自動存檔
  useEffect(() => {
    try {
      localStorage.setItem('outline_editor_autosave_v3', JSON.stringify(kepanTree));
    } catch (error) {
      console.error("Local Storage 儲存失敗:", error);
    }
  }, [kepanTree]);

  // 快捷鍵: 復原與重做
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  });

  // --- 歷史紀錄管理 (Undo/Redo) ---
  const commitChange = useCallback((newTree) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newTree);
    if (nextHistory.length > 50) nextHistory.shift(); // 保留最近50步
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };
  const handleRedo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  // --- 狀態切換 Actions ---
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

  // --- 樹狀資料操作 Actions (寫入 History) ---
  const updateKepanNode = useCallback((id, field, value) => {
    const clonedTree = deepCloneKepanTree(kepanTree);
    const targetNode = findNodeInKepanTree(clonedTree, id);
    if (targetNode && targetNode[field] !== value) {
      targetNode[field] = value;
      commitChange(clonedTree);
    }
  }, [kepanTree, commitChange]);

  const addSiblingKepanNode = useCallback((targetId) => {
    const clonedTree = deepCloneKepanTree(kepanTree);
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
      commitChange(clonedTree);
      setTimeout(() => document.getElementById(`input-${newNode.id}`)?.focus(), 50);
    }
  }, [kepanTree, commitChange]);

  const indentKepanNode = useCallback((targetId) => {
    const clonedTree = deepCloneKepanTree(kepanTree);
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
      commitChange(clonedTree);
      setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
    }
  }, [kepanTree, commitChange]);

  const outdentKepanNode = useCallback((targetId) => {
    const clonedTree = deepCloneKepanTree(kepanTree);
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
      commitChange(clonedTree);
      setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
    }
  }, [kepanTree, commitChange]);

  const moveNode = useCallback((targetId, direction) => {
    const clonedTree = deepCloneKepanTree(kepanTree);
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
      commitChange(clonedTree);
      setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
    }
  }, [kepanTree, commitChange]);

  const splitTextToChildKepanNode = useCallback((nodeId, textareaRef) => {
    if (!textareaRef.current) return;
    const cursorStart = textareaRef.current.selectionStart;
    const currentText = textareaRef.current.value;
    if (cursorStart === 0 || cursorStart === currentText.length) return;

    const textBefore = currentText.substring(0, cursorStart).replace(/\s+$/, '');
    const textAfter = currentText.substring(cursorStart).replace(/^\s+/, '');

    const clonedTree = deepCloneKepanTree(kepanTree);
    const targetNode = findNodeInKepanTree(clonedTree, nodeId);
    if (targetNode) {
      targetNode.content = textBefore;
      const newNode = {
        id: generateUniqueId(), title: '新子科判', content: textAfter, note: '', children: []
      };
      if (!targetNode.children) targetNode.children = [];
      targetNode.children.unshift(newNode);
      setExpandedTreeNodes(prev => new Set(prev).add(nodeId));
      commitChange(clonedTree);
    }
  }, [kepanTree, commitChange]);

  const deleteKepanNode = useCallback((id) => {
    const clonedTree = deepCloneKepanTree(kepanTree);
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
      commitChange(clonedTree);
    }
  }, [kepanTree, commitChange, focusId]);

  const mergeUpKepanNode = useCallback((id) => {
    const clonedTree = deepCloneKepanTree(kepanTree);
    let targetNode = null;
    let prevSiblingNode = null;

    const findAndMerge = (nodes) => {
      const index = nodes.findIndex(n => n.id === id);
      if (index > 0) {
        targetNode = nodes.splice(index, 1)[0];
        prevSiblingNode = nodes[index - 1];
        return true;
      }
      for (let node of nodes) {
        if (node.children && findAndMerge(node.children)) return true;
      }
      return false;
    };

    if (findAndMerge(clonedTree) && targetNode && prevSiblingNode) {
      if (targetNode.content) {
        prevSiblingNode.content = prevSiblingNode.content ? `${prevSiblingNode.content}\n${targetNode.content}` : targetNode.content;
      }
      if (targetNode.note) {
        prevSiblingNode.note = prevSiblingNode.note ? `${prevSiblingNode.note}\n${targetNode.note}` : targetNode.note;
      }
      if (targetNode.children && targetNode.children.length > 0) {
        prevSiblingNode.children = [...(prevSiblingNode.children || []), ...targetNode.children];
      }
      setDeleteMenuId(null);
      commitChange(clonedTree);
    }
  }, [kepanTree, commitChange]);

  // --- 拖曳事件處理 ---
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

      const clonedTree = deepCloneKepanTree(kepanTree);
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
      if (!draggedNode) return;

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
      
      if (insertAtTarget(clonedTree)) commitChange(clonedTree);

    } catch (error) {
      setDragInfo({ draggedId: null, overId: null, position: null });
    }
  }, [kepanTree, dragInfo, commitChange]);

  // --- AI 輔助生成 (已優化容錯處理與錯誤提示) ---
  const generateAISkeleton = async (nodeId) => {
    const targetNode = findNodeInKepanTree(kepanTree, nodeId);
    if (!targetNode || !targetNode.content) return;
    
    setIsAILoadingId(nodeId);
    
    const actualKey = userApiKey || ""; 
    const prompt = `請分析以下佛教經典/開示原文，將其意群切分為合適的子科判骨架。
    必須嚴格回傳 JSON 格式，架構如下 (只需回傳子層陣列):
    [ { "title": "科判標題", "content": "該標題對應的拆分後內文", "note": "" } ]
    
    注意：請務必只回傳合法的 JSON 陣列，不要有任何多餘的解釋文字或 Markdown 標記。
    原文內容：\n${targetNode.content}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: "你是一個專業的佛學科判編輯助理。請將提供的文本進行精確的意群切割，並返回嚴格的 JSON 陣列結構。不要包含 ```json 以外的額外文字。" }] },
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    let attempt = 0;
    const maxAttempts = 3;
    const delays = [1000, 2000, 4000];
    let lastErrorMsg = "";

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${actualKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorTxt = await response.text();
          throw new Error(`HTTP ${response.status} - ${errorTxt}`);
        }
        
        const result = await response.json();
        let textResult = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (textResult) {
          // 強制清理可能出現的 Markdown 標記以避免 JSON.parse 失敗
          textResult = textResult.replace(/```json/gi, '').replace(/```/g, '').trim();
          const generatedNodes = JSON.parse(textResult);
          
          const clonedTree = deepCloneKepanTree(kepanTree);
          const tNode = findNodeInKepanTree(clonedTree, nodeId);
          if (tNode) {
            tNode.content = ""; 
            tNode.children = generatedNodes.map(n => ({
              id: generateUniqueId(),
              title: n.title || "新科判",
              content: n.content || "",
              note: n.note || "",
              children: []
            }));
            commitChange(clonedTree);
            setExpandedTreeNodes(prev => new Set(prev).add(nodeId));
          }
          setIsAILoadingId(null);
          return; // 成功即結束
        } else {
          throw new Error("API 回傳結果為空");
        }
      } catch (error) {
        lastErrorMsg = error.message;
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
        }
      }
    }
    
    // 如果重試皆失敗，顯示具體的錯誤原因讓用戶可以除錯
    alert(`AI 骨架生成失敗。\n原因: ${lastErrorMsg}\n請確認您的 API 金鑰是否有效，或模型是否目前超載。`);
    setIsAILoadingId(null);
  };

  const kepanTreeActions = {
    updateKepanNode, addSiblingKepanNode, indentKepanNode, outdentKepanNode, moveNode,
    deleteKepanNode, mergeUpKepanNode, splitTextToChildKepanNode, setFocusId,
    setDeleteMenuId, toggleTree, toggleContent, toggleNote, generateAISkeleton,
    handleDragStart, handleDragOver, handleDrop
  };

  // --- 檔案匯出/匯入 ---
  const handleExportToFile = () => {
    try {
      const fileBlob = new Blob([JSON.stringify(kepanTree, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(fileBlob);
      const linkElement = document.createElement('a');
      linkElement.href = downloadUrl;
      linkElement.download = '科判資料.json';
      linkElement.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {}
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
        } catch (err) {
          alert("檔案格式不正確，請匯入有效的 JSON 檔案。");
        }
      };
      fileReader.readAsText(selectedFile);
    } catch (error) {}
  };

  // 渲染資料準備
  const currentRenderData = focusId ? [findNodeInKepanTree(kepanTree, focusId)].filter(Boolean) : kepanTree;
  const currentBreadcrumbPath = focusId ? findPathInKepanTree(kepanTree, focusId) : null;
  const isDark = theme === 'dark';

  // 渲染對讀模式的右側連續文本
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

  // 渲染鳥瞰圖
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

        <div className="flex items-center gap-3">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 mr-2">
            <button onClick={handleUndo} disabled={historyIndex === 0} className={`p-1.5 rounded-md transition-colors ${historyIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-teal-500/20 text-teal-600'}`} title="復原 (Ctrl+Z)"><Undo2 size={18}/></button>
            <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className={`p-1.5 rounded-md transition-colors ${historyIndex === history.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-teal-500/20 text-teal-600'}`} title="重做 (Ctrl+Y)"><Redo2 size={18}/></button>
          </div>

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-stone-700' : 'bg-stone-300'}`}></div>

          {/* 主題切換 */}
          <button onClick={() => setTheme(theme === 'default' ? 'beige' : theme === 'beige' ? 'dark' : theme === 'dark' ? 'bamboo' : 'default')} className={`p-1.5 rounded-full hover:bg-stone-500/20 transition-colors ${isDark ? 'text-yellow-400' : 'text-stone-500'}`} title="切換禪風主題">
            {theme === 'dark' ? <Moon size={18}/> : theme === 'bamboo' ? <Leaf size={18}/> : <Sun size={18}/>}
          </button>
          
          <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-full hover:bg-stone-500/20 text-stone-500 transition-colors" title="設定"><Settings size={18}/></button>

          <label className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border rounded shadow-sm cursor-pointer transition-colors ${isDark ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300' : 'bg-white border-stone-300 hover:bg-stone-50 text-stone-600'}`}>
            <FolderOpen size={16} /> 開啟
            <input type="file" accept=".json" onChange={handleImportFromFile} className="hidden" />
          </label>
          <button onClick={handleExportToFile} className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded shadow-sm hover:bg-teal-700 transition-colors">
            <Save size={16} /> 存檔
          </button>
        </div>
      </header>

      {/* 設定面板 Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-xl p-6 shadow-2xl ${isDark ? 'bg-stone-900 text-stone-200' : 'bg-white text-stone-800'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Wand2 size={20} className="text-purple-500"/> AI 輔助設定</h2>
              <button onClick={() => setShowSettings(false)} className="hover:bg-stone-500/20 p-1 rounded-full"><X size={20}/></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Google Gemini API Key</label>
              <input 
                type="password" 
                value={userApiKey} 
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder="貼上您的 API 金鑰 (非必填)"
                className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-stone-800 border-stone-700 text-white' : 'bg-stone-50 border-stone-200'}`}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>若留空，系統在支援的預覽環境中將自動採用內建金鑰。內建重試機制可自動切換可用資源。</p>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors">確認並儲存</button>
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
                    key={rootNode.id} kepanNode={rootNode} depth={0} mode={mode} theme={theme}
                    expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes}
                    deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={kepanTreeActions} 
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
                key={rootNode.id} kepanNode={rootNode} depth={0} mode={mode} theme={theme}
                expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes}
                deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={kepanTreeActions} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
