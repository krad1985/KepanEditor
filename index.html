import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { 
  FileText, ListTree, AlignLeft, 
  ChevronRight, ChevronDown, Trash2, 
  Save, FolderOpen, Target, Home, 
  SplitSquareHorizontal, FolderTree, GripVertical, Search
} from 'lucide-react';

// --- 全域狀態管理 Context ---
const EditorContext = createContext(null);

// --- 工具函數 ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const cloneTree = (nodes) => JSON.parse(JSON.stringify(nodes));

const findPath = (nodes, targetId, currentPath = []) => {
  for (let node of nodes) {
    const newPath = [...currentPath, node];
    if (node.id === targetId) return newPath;
    if (node.children) {
      const found = findPath(node.children, targetId, newPath);
      if (found) return found;
    }
  }
  return null;
};

const findNode = (nodes, id) => {
  for (let node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const isDescendant = (nodes, sourceId, targetId) => {
  const sourceNode = findNode(nodes, sourceId);
  if (!sourceNode || !sourceNode.children) return false;
  let found = false;
  const checkChildren = (children) => {
    for (let child of children) {
      if (child.id === targetId) { found = true; return; }
      if (child.children) checkChildren(child.children);
    }
  };
  checkChildren(sourceNode.children);
  return found;
};

// --- 獨立的 TreeNode 元件 (避免游標跳掉的關鍵) ---
const TreeNode = React.memo(({ node, depth = 0 }) => {
  const context = useContext(EditorContext);
  const { 
    mode, expandedNodes, dragOverId, dropPosition, draggedId, data,
    updateNode, addSiblingAfter, indentNode, outdentNode, deleteNode, mergeNodeUp,
    splitText, setFocusId, toggleExpand,
    onDragStart, onDragOver, onDrop, onDragLeave, onDragEnd
  } = context;

  const isExpanded = expandedNodes.has(node.id);
  const textRef = useRef(null);
  const nodeRef = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isDragOver = dragOverId === node.id;
  const isBeingDragged = draggedId === node.id;

  // 自動調整文字框高度 (無縫閱讀體驗)
  useEffect(() => {
    if (textRef.current && (mode === 'text' || isExpanded)) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = textRef.current.scrollHeight + 'px';
    }
  }, [node.content, mode, isExpanded]);

  // 樣式設定
  const depthColors = ['text-blue-900 border-blue-900', 'text-teal-800 border-teal-800', 'text-emerald-700 border-emerald-700', 'text-cyan-700 border-cyan-700', 'text-blue-600 border-blue-600'];
  const colorClass = depthColors[depth % depthColors.length];
  const textSizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
  const textSizeClass = textSizes[Math.min(depth, textSizes.length - 1)];

  // 鍵盤操作
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSiblingAfter(node.id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) outdentNode(node.id);
      else indentNode(node.id);
    }
  };

  const handleSplit = () => {
    if (!textRef.current) return;
    const cursor = textRef.current.selectionStart;
    if (cursor === 0 || cursor === textRef.current.value.length) {
      context.showMessage("請將游標置於文字段落中間"); return;
    }
    splitText(node.id, textRef.current.value, cursor);
  };

  return (
    <div 
      ref={nodeRef}
      className={`
        relative ${mode === 'text' ? 'mb-2' : 'mb-1'} 
        ${(depth > 0 && mode === 'outline') ? 'ml-6 border-l-2 border-stone-200 pl-4' : ''}
        transition-all duration-200
        ${isBeingDragged ? 'opacity-30' : 'opacity-100'}
      `}
      onDragOver={(e) => onDragOver(e, node.id, nodeRef)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, node.id)}
    >
      {/* 拖曳視覺指示器 */}
      {isDragOver && dropPosition === 'before' && <div className="absolute -top-1 left-0 right-0 h-1.5 bg-teal-500 rounded z-10" />}
      {isDragOver && dropPosition === 'after' && <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-teal-500 rounded z-10" />}

      <div className={`
        group relative flex items-start gap-1 rounded-lg transition-colors
        ${isDragOver && dropPosition === 'inside' ? 'bg-teal-50 ring-2 ring-teal-400 p-1 -m-1' : ''}
      `}>
        
        {/* 拖曳把手 */}
        <div 
          draggable
          onDragStart={(e) => onDragStart(e, node.id)}
          onDragEnd={onDragEnd}
          className="mt-1.5 shrink-0 text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="拖曳以排序或移動"
        >
          <GripVertical size={16} />
        </div>

        {/* 展開/收合圖示 */}
        {mode === 'outline' && (
          <div className="mt-1.5 shrink-0 w-[18px]">
            {node.children && node.children.length > 0 ? (
              <button onClick={() => toggleExpand(node.id)} className="text-stone-400 hover:text-teal-600 transition-colors">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            ) : <div className="w-[18px]" />}
          </div>
        )}

        {/* 主要內容區 */}
        <div className="flex-1 w-full min-w-0">
          {/* 標題與工具 */}
          <div className="flex items-center gap-2 mb-1">
            <input
              id={`input-${node.id}`}
              type="text"
              value={node.title}
              onChange={(e) => updateNode(node.id, 'title', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入科判標題 (按 Enter 新增同層，Tab 縮排)..."
              className={`
                font-bold bg-transparent border-b border-transparent focus:border-teal-400 focus:outline-none focus:bg-white focus:shadow-sm px-1 py-0.5 rounded transition-all w-full
                ${colorClass} 
                ${mode === 'text' ? `${textSizeClass} mb-0 border-b-2 inline-block w-auto min-w-[300px]` : 'text-lg'}
              `}
            />
            
            {deleteConfirm ? (
              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-md border border-red-200 shrink-0 z-10">
                <button onClick={() => { mergeNodeUp(node.id); setDeleteConfirm(false); }} className="px-2 py-0.5 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 shadow-sm whitespace-nowrap" title="移除標題，內文與子層向上併入前一段落">向上合併</button>
                <button onClick={() => { deleteNode(node.id); setDeleteConfirm(false); }} className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 shadow-sm whitespace-nowrap" title="徹底刪除此節點與所有子層">刪除全部</button>
                <button onClick={() => setDeleteConfirm(false)} className="px-2 py-0.5 text-xs bg-stone-200 text-stone-700 rounded hover:bg-stone-300 shadow-sm whitespace-nowrap">取消</button>
              </div>
            ) : (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0 bg-stone-50 p-0.5 rounded">
                <button onClick={() => setFocusId(node.id)} className="p-1 text-stone-500 hover:text-teal-600 hover:bg-teal-100 rounded" title="聚焦此節點">
                  <Target size={14} />
                </button>
                <button onClick={() => setDeleteConfirm(true)} className="p-1 text-stone-500 hover:text-red-600 hover:bg-red-100 rounded" title="刪除或合併節點">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* 內容/原文 */}
          {(mode === 'text' || (mode === 'outline' && isExpanded)) && (
            <div className="relative group/text mt-0.5">
              <textarea
                ref={textRef}
                value={node.content}
                onChange={(e) => updateNode(node.id, 'content', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSplit(); }}
                placeholder={mode === 'text' ? "貼上原文內容或開始筆記..." : "備註/摘要..."}
                className={`
                  w-full bg-transparent focus:outline-none rounded transition-colors
                  ${mode === 'outline' ? 'resize-y text-sm text-stone-500 bg-stone-50/50 min-h-[40px] border border-transparent hover:bg-white p-2 focus:ring-1 focus:ring-teal-300' : 'resize-none overflow-hidden text-base text-stone-800 leading-relaxed min-h-[30px] border-none px-1 py-0 hover:bg-stone-100/50 focus:bg-stone-50'}
                `}
              />
              
              {mode === 'text' && node.content && (
                <button 
                  onClick={handleSplit}
                  className="absolute bottom-2 right-2 opacity-0 group-hover/text:opacity-100 bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded shadow-sm flex items-center gap-1 hover:bg-teal-200 transition-all border border-teal-200"
                  title="快捷鍵: Ctrl/Cmd + Enter"
                >
                  <SplitSquareHorizontal size={14} /> 從游標處建立子科判
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 遞迴渲染子節點 */}
      {node.children && node.children.length > 0 && (mode === 'text' || isExpanded) && (
        <div className="mt-2">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

// --- 主應用程式 ---
export default function App() {
  const initialData = [
    {
      id: 'root-1',
      title: '菩提道次第廣論',
      content: '造者：宗喀巴大師\n請在此貼上完整原文，並嘗試使用「游標處拆分子節點」功能。',
      children: [
        {
          id: 'node-1',
          title: '甲一、為顯其法根源淨故開示造者殊勝',
          content: '',
          children: [
            { id: 'node-1-1', title: '乙一、圓滿種中受生事理', content: '如是隨念當尊，應修禮敬。...', children: [] },
            { id: 'node-1-2', title: '乙二、其身獲得功德事理', content: '', children: [] }
          ]
        }
      ]
    }
  ];

  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('outline_editor_autosave');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) { }
    }
    return initialData;
  });
  const [mode, setMode] = useState('outline');
  const [focusId, setFocusId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root-1', 'node-1']));
  const [message, setMessage] = useState('');
  
  // 搜尋
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // 麵包屑
  const [activeBreadcrumbDropdown, setActiveBreadcrumbDropdown] = useState(null);

  // 拖曳狀態
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before', 'inside', 'after'
  const fileInputRef = useRef(null);

  // --- 本地自動儲存 (防護機制) ---
  useEffect(() => {
    localStorage.setItem('outline_editor_autosave', JSON.stringify(data));
  }, [data]);

  // --- 全域事件與效果 ---
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const results = [];
    const searchRecursive = (nodes, path) => {
      for (let node of nodes) {
        if (node.title.includes(searchQuery) || node.content.includes(searchQuery)) {
          results.push({ 
            id: node.id, 
            title: node.title, 
            pathString: path.length > 0 ? path.map(p => p.title).join(' > ') : '根節點'
          });
        }
        if (node.children) searchRecursive(node.children, [...path, node]);
      }
    };
    searchRecursive(data, []);
    setSearchResults(results);
  }, [searchQuery, data]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // --- 核心邏輯操作 ---
  const updateNode = (id, field, value) => {
    setData(prev => {
      const newData = cloneTree(prev);
      const node = findNode(newData, id);
      if (node) node[field] = value;
      return newData;
    });
  };

  const addSiblingAfter = (targetId) => {
    const newNodeId = generateId();
    setData(prev => {
      const newData = cloneTree(prev);
      const insertRecursive = (nodes) => {
        const index = nodes.findIndex(n => n.id === targetId);
        if (index !== -1) {
          nodes.splice(index + 1, 0, { id: newNodeId, title: '', content: '', children: [] });
          return true;
        }
        for (let node of nodes) {
          if (node.children && insertRecursive(node.children)) return true;
        }
        return false;
      };
      insertRecursive(newData);
      return newData;
    });
    setTimeout(() => document.getElementById(`input-${newNodeId}`)?.focus(), 50);
  };

  const indentNode = (targetId) => {
    setData(prev => {
      const newData = cloneTree(prev);
      let autoExpandId = null;
      const process = (nodes) => {
        const index = nodes.findIndex(n => n.id === targetId);
        if (index > 0) {
          const nodeToMove = nodes.splice(index, 1)[0];
          const prevSibling = nodes[index - 1];
          if (!prevSibling.children) prevSibling.children = [];
          prevSibling.children.push(nodeToMove);
          autoExpandId = prevSibling.id;
          return true;
        }
        for (let node of nodes) {
          if (node.children && process(node.children)) return true;
        }
        return false;
      };
      process(newData);
      if (autoExpandId) setExpandedNodes(prevSet => new Set(prevSet).add(autoExpandId));
      return newData;
    });
    setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
  };

  const outdentNode = (targetId) => {
    setData(prev => {
      const newData = cloneTree(prev);
      const process = (nodes, parentArr = null, parentIndex = -1) => {
        const index = nodes.findIndex(n => n.id === targetId);
        if (index !== -1 && parentArr) {
          const nodeToMove = nodes.splice(index, 1)[0];
          parentArr.splice(parentIndex + 1, 0, nodeToMove);
          return true;
        }
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].children && process(nodes[i].children, nodes, i)) return true;
        }
        return false;
      };
      process(newData);
      return newData;
    });
    setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
  };

  const deleteNode = (id) => {
    setData(prev => {
      const newData = cloneTree(prev);
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
      removeRecursive(newData);
      return newData;
    });
    if (focusId === id) setFocusId(null);
    showMessage("已徹底刪除");
  };

  const mergeNodeUp = (id) => {
    setData(prev => {
      const newData = cloneTree(prev);
      let merged = false;
      const process = (nodes, parentNode) => {
        const index = nodes.findIndex(n => n.id === id);
        if (index !== -1) {
          const targetNode = nodes[index];
          if (index > 0) {
            // 1. 合併到前一個兄弟節點
            const prevSibling = nodes[index - 1];
            if (targetNode.content) {
               prevSibling.content = prevSibling.content + (prevSibling.content ? '\n\n' : '') + targetNode.content;
            }
            if (targetNode.children && targetNode.children.length > 0) {
               prevSibling.children = [...(prevSibling.children || []), ...targetNode.children];
            }
            nodes.splice(index, 1);
            merged = true;
          } else if (parentNode) {
            // 2. 如果是第一個子節點，合併到父節點
            if (targetNode.content) {
               parentNode.content = parentNode.content + (parentNode.content ? '\n\n' : '') + targetNode.content;
            }
            if (targetNode.children && targetNode.children.length > 0) {
               // 把剩下的兄弟節點接在合併進來的子節點後面
               const otherSiblings = nodes.slice(1);
               parentNode.children = [...targetNode.children, ...otherSiblings];
            } else {
               nodes.splice(index, 1);
            }
            merged = true;
          }
          return true;
        }
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].children && process(nodes[i].children, nodes[i])) return true;
        }
        return false;
      };
      process(newData, null);
      if (!merged) {
         showMessage("此為最頂層，無法向上合併");
      } else {
         showMessage("已將內容向上合併");
      }
      return newData;
    });
    if (focusId === id) setFocusId(null);
  };

  const splitText = (nodeId, fullText, cursorIndex) => {
    // 移除拆分點前後的空白與換行符號
    const textBefore = fullText.substring(0, cursorIndex).replace(/\s+$/, '');
    const textAfter = fullText.substring(cursorIndex).replace(/^\s+/, '');
    const newNodeId = generateId();

    setData(prev => {
      const newData = cloneTree(prev);
      const targetNode = findNode(newData, nodeId);
      if (targetNode) {
        targetNode.content = textBefore;
        if (!targetNode.children) targetNode.children = [];
        targetNode.children.unshift({
          id: newNodeId, title: '新子科判', content: textAfter, children: []
        });
      }
      return newData;
    });
    setExpandedNodes(prev => new Set(prev).add(nodeId));
    showMessage("已拆分");
    setTimeout(() => document.getElementById(`input-${newNodeId}`)?.focus(), 50);
  };

  // --- 進階拖曳邏輯 ---
  const onDragStart = (e, id) => {
    e.stopPropagation();
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = (e) => {
    e.stopPropagation();
    setDraggedId(null);
    setDragOverId(null);
    setDropPosition(null);
  };

  const onDragOver = (e, id, nodeRef) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (id === draggedId || isDescendant(data, draggedId, id)) return;

    // 計算游標落在該節點的哪個區域，來決定是成為子節點，還是重新排序(前後)
    const rect = nodeRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position = 'inside';
    if (y < height * 0.25) position = 'before';
    else if (y > height * 0.75) position = 'after';

    setDragOverId(id);
    setDropPosition(position);
  };

  const onDragLeave = (e) => {
    e.stopPropagation();
    setDragOverId(null);
    setDropPosition(null);
  };

  const moveNode = (sourceId, targetId, position) => {
    setData(prev => {
      const newData = cloneTree(prev);
      let sourceNode = null;

      // 1. 拔除原始節點
      const removeNode = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === sourceId) {
            sourceNode = nodes.splice(i, 1)[0];
            return true;
          }
          if (nodes[i].children && removeNode(nodes[i].children)) return true;
        }
        return false;
      };
      removeNode(newData);

      if (!sourceNode) return newData;

      // 2. 插入新位置
      const insertNode = (nodes) => {
        if (position === 'inside') {
          const target = findNode(newData, targetId);
          if (target) {
            if (!target.children) target.children = [];
            target.children.push(sourceNode); // 加入成為子節點
            return true;
          }
        } else {
          // 同層排序
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === targetId) {
              nodes.splice(position === 'before' ? i : i + 1, 0, sourceNode);
              return true;
            }
            if (nodes[i].children && insertNode(nodes[i].children)) return true;
          }
        }
        return false;
      };
      
      insertNode(newData);
      return newData;
    });
    
    if (position === 'inside') {
      setExpandedNodes(prev => new Set(prev).add(targetId));
    }
  };

  const onDrop = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== targetId && !isDescendant(data, draggedId, targetId)) {
      moveNode(draggedId, targetId, dropPosition);
    }
    setDraggedId(null);
    setDragOverId(null);
    setDropPosition(null);
  };

  // --- 其他輔助功能 ---
  const handleSearchResultClick = (id) => {
    setFocusId(id);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setExpandedNodes(prev => new Set(prev).add(id));
  };

  const toggleExpand = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = (shouldExpand) => {
    if (!shouldExpand) { setExpandedNodes(new Set()); return; }
    let ids = [];
    const traverse = (nodes) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          ids.push(node.id);
          traverse(node.children);
        }
      });
    };
    traverse(data);
    setExpandedNodes(new Set(ids));
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "科判資料.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showMessage("已匯出");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          setData(imported); setFocusId(null); showMessage("匯入成功");
        }
      } catch (err) { showMessage("檔案格式錯誤"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 渲染準備
  const renderData = focusId ? [findNode(data, focusId)].filter(Boolean) : data;
  const breadcrumbPath = focusId ? findPath(data, focusId) : null;

  // 包裝給 Context 的值
  const contextValue = {
    mode, expandedNodes, dragOverId, dropPosition, draggedId, data,
    updateNode, addSiblingAfter, indentNode, outdentNode, deleteNode, mergeNodeUp,
    splitText, setFocusId, toggleExpand, showMessage,
    onDragStart, onDragOver, onDrop, onDragLeave, onDragEnd
  };

  return (
    <EditorContext.Provider value={contextValue}>
      <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-800">
        
        {/* --- Header --- */}
        <header className="bg-white shadow-sm border-b border-stone-200 px-6 py-3 flex flex-wrap justify-between items-center sticky top-0 z-20 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
              <ListTree className="text-teal-600" />
              科判編輯器
            </h1>
            
            <div className="flex bg-stone-100 rounded-lg p-1 border border-stone-200">
              <button onClick={() => setMode('text')} className={`flex items-center gap-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'text' ? 'bg-white shadow text-teal-700' : 'text-stone-500 hover:text-stone-700'}`}>
                <FileText size={16} /> 原文模式
              </button>
              <button onClick={() => setMode('outline')} className={`flex items-center gap-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'outline' ? 'bg-white shadow text-teal-700' : 'text-stone-500 hover:text-stone-700'}`}>
                <AlignLeft size={16} /> 科判模式
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            {/* 搜尋 */}
            <div className="relative" ref={searchRef}>
              <div className="flex items-center bg-stone-100 rounded-full px-3 py-1.5 border border-stone-200 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-400 transition-all">
                <Search size={16} className="text-stone-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="搜尋科判或內容..." 
                  className="bg-transparent border-none outline-none text-sm w-48"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                  onFocus={() => setShowSearchDropdown(true)}
                />
              </div>
              {showSearchDropdown && searchQuery && (
                <div className="absolute top-full mt-2 right-0 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-stone-200 z-50">
                  {searchResults.length > 0 ? searchResults.map(res => (
                    <div key={res.id} className="p-3 border-b border-stone-100 hover:bg-teal-50 cursor-pointer" onClick={() => handleSearchResultClick(res.id)}>
                      <div className="font-medium text-stone-800 text-sm mb-1">{res.title || '(無標題)'}</div>
                      <div className="text-xs text-stone-400 line-clamp-1">{res.pathString}</div>
                    </div>
                  )) : <div className="p-4 text-center text-sm text-stone-500">找不到相符結果</div>}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-stone-300 mx-1"></div>
            
            {mode === 'outline' && (
               <div className="flex items-center gap-1 mr-2">
                  <button onClick={() => expandAll(true)} className="text-stone-500 hover:text-teal-600 p-1.5 rounded bg-stone-50" title="展開全部"><FolderTree size={16} /></button>
                  <button onClick={() => expandAll(false)} className="text-stone-500 hover:text-teal-600 p-1.5 rounded bg-stone-50 text-xs font-bold" title="摺疊全部">摺</button>
               </div>
            )}

            {message && <span className="text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">{message}</span>}
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded hover:bg-stone-50 transition-colors shadow-sm">
            <FolderOpen size={16} /> 開啟檔案
          </button>
          <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors shadow-sm">
            <Save size={16} /> 存檔
          </button>
        </div>
      </header>

        {/* --- 麵包屑導覽 (下拉選單) --- */}
        {focusId && breadcrumbPath && (
          <div className="bg-teal-50 border-b border-teal-100 px-6 py-2 flex items-center flex-wrap gap-y-2 text-sm text-teal-800 z-10 relative">
            <button onClick={() => setFocusId(null)} className="hover:text-teal-600 flex items-center gap-1 font-medium bg-teal-100/50 px-2 py-1 rounded">
              <Home size={14} /> 顯示全部
            </button>
            
            {breadcrumbPath.map((crumb, idx) => {
              const dropdownOptions = crumb.children || [];
              const isDropdownOpen = activeBreadcrumbDropdown === crumb.id;
              return (
                <React.Fragment key={crumb.id}>
                  <ChevronRight size={14} className="text-teal-400 mx-1" />
                  <div className="relative flex items-center bg-teal-100/30 rounded">
                    <button 
                      onClick={() => setFocusId(crumb.id)}
                      className={`hover:text-teal-600 px-2 py-1 rounded-l transition-colors ${idx === breadcrumbPath.length - 1 ? 'font-bold bg-teal-100' : ''}`}
                    >
                      {crumb.title || '(無標題)'}
                    </button>
                    {dropdownOptions.length > 0 && (
                      <button 
                        className="px-1 py-1 hover:bg-teal-200 rounded-r text-teal-600 transition-colors"
                        onClick={() => setActiveBreadcrumbDropdown(isDropdownOpen ? null : crumb.id)}
                      >
                        <ChevronDown size={14} />
                      </button>
                    )}
                    {isDropdownOpen && dropdownOptions.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-white rounded-md shadow-lg border border-stone-200 py-1 z-50">
                        {dropdownOptions.map(opt => (
                          <button
                            key={opt.id}
                            className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-teal-50 hover:text-teal-700 truncate"
                            onClick={() => { setFocusId(opt.id); setActiveBreadcrumbDropdown(null); }}
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

        {/* --- 編輯區 Main --- */}
        <main className="flex-1 overflow-auto p-8 flex justify-center" onClick={() => setActiveBreadcrumbDropdown(null)}>
          <div className="w-full max-w-4xl bg-stone-50/50 p-6 min-h-[80vh] rounded-xl border border-stone-100 shadow-sm">
            {renderData.map(rootNode => (
              <TreeNode key={rootNode.id} node={rootNode} depth={0} />
            ))}
            
            <div className="mt-12 text-center text-stone-400 text-sm border-t border-stone-200 pt-4">
              快捷鍵：按 <strong>Enter</strong> 新增 | <strong>Tab</strong> 縮排 | <strong>Shift+Tab</strong> 凸排 | 拖曳左側 <strong>⋮⋮</strong> 可同層排序或改變層級
            </div>
          </div>
        </main>

      </div>
    </EditorContext.Provider>
  );
}
