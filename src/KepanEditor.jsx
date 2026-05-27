// Version: 1.2.1 - 修正拖曳排序判定區域、解決事件冒泡干擾，並強化 Try-Catch 健壯性
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, ListTree, ChevronRight, ChevronDown, 
  Trash2, Save, FolderOpen, Target, Home, 
  SplitSquareHorizontal, GripVertical, AlignLeft
} from 'lucide-react';

// --- 工具函數 (意圖明確命名) ---
const generateUniqueId = () => Math.random().toString(36).substr(2, 9);
const deepCloneKepanTree = (treeNodes) => JSON.parse(JSON.stringify(treeNodes));

// 尋找科判節點路徑 (Breadcrumbs)
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

// 尋找科判節點本身
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
const INITIAL_EMPTY_KEPAN_TREE = [
  {
    "id": "root-1",
    "title": "新科判",
    "content": "",
    "children": []
  }
];

// --- 獨立的 TreeNode 元件 (避免 Focus 跳失) ---
const TreeNode = React.memo(({ 
  kepanNode, depth, mode, 
  expandedTreeNodes, expandedContentNodes, 
  deleteMenuId, dragInfo,
  actions 
}) => {
  const textareaRef = useRef(null);
  const isTreeExpanded = expandedTreeNodes.has(kepanNode.id);
  
  // 決定原文是否顯示：若是原文模式則預設顯示，若是科判模式則依據獨立狀態判定
  const isContentVisible = mode === 'text' || expandedContentNodes.has(kepanNode.id);
  const hasChildren = kepanNode.children && kepanNode.children.length > 0;
  const hasContent = kepanNode.content && kepanNode.content.trim().length > 0;

  // 深度層次顏色運算
  const depthColors = ['text-blue-900 border-blue-900', 'text-teal-800 border-teal-800', 'text-emerald-700 border-emerald-700', 'text-cyan-700 border-cyan-700', 'text-blue-600 border-blue-600'];
  const colorClass = depthColors[depth % depthColors.length];
  const textSizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
  const textSizeClass = textSizes[Math.min(depth, textSizes.length - 1)];

  // 自動調整文字框高度
  const handleTextareaInput = (e) => {
    try {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
      actions.updateKepanNode(kepanNode.id, 'content', e.target.value);
    } catch (error) {
      console.error("更新文字高度時發生錯誤:", error);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [kepanNode.content, mode, isContentVisible]);

  // 鍵盤快捷鍵處理
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      actions.addSiblingKepanNode(kepanNode.id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) actions.outdentKepanNode(kepanNode.id);
      else actions.indentKepanNode(kepanNode.id);
    }
  };

  // 拖曳狀態視覺反饋 (融入主視覺色系 Teal)
  const isDragged = dragInfo.draggedId === kepanNode.id;
  const isDragOver = dragInfo.overId === kepanNode.id;
  let dropZoneClass = 'border border-transparent';
  if (isDragOver && dragInfo.position === 'top') dropZoneClass = 'border-t-2 border-t-teal-500 rounded-t bg-stone-50/50';
  if (isDragOver && dragInfo.position === 'bottom') dropZoneClass = 'border-b-2 border-b-teal-500 rounded-b bg-stone-50/50';
  if (isDragOver && dragInfo.position === 'inside') dropZoneClass = 'bg-teal-50/80 rounded ring-1 ring-teal-300';

  return (
    <div className={`
      ${mode === 'text' ? 'mb-4' : 'mb-2'} 
      ${mode === 'outline' && depth > 0 ? 'ml-6 border-l-2 border-stone-200 pl-4' : 'ml-0'}
      ${isDragged ? 'opacity-30 scale-[0.98]' : 'opacity-100 scale-100'}
      transition-all duration-200
    `}>
      {/* 拖曳判定區域 (熱區涵蓋整個標題行) */}
      <div 
        onDragOver={(e) => actions.handleDragOver(e, kepanNode.id)}
        onDrop={(e) => actions.handleDrop(e, kepanNode.id)}
        className={`group relative flex items-start gap-1 p-1.5 -ml-1.5 transition-colors ${dropZoneClass}`}
      >
        
        {/* 拖曳把手 */}
        {mode === 'outline' && (
          <div 
            draggable
            onDragStart={(e) => actions.handleDragStart(e, kepanNode.id)}
            className="mt-1 cursor-grab opacity-0 group-hover:opacity-100 text-stone-300 hover:text-stone-500 transition-opacity"
            title="按住拖曳以排序"
          >
            <GripVertical size={16} />
          </div>
        )}

        {/* 樹狀結構展開/收合圖示 */}
        {mode === 'outline' && hasChildren ? (
          <button 
            onClick={() => actions.toggleTree(kepanNode.id)}
            className="mt-1 text-stone-400 hover:text-teal-600 transition-colors shrink-0"
            title="展開/收合子科判"
          >
            {isTreeExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : mode === 'outline' && (
          <div className="w-[18px] shrink-0" /> // 佔位對齊
        )}

        <div className="flex-1 w-full min-w-0">
          {/* 標題行 */}
          <div className="flex items-center gap-2 mb-1">
            <input
              id={`input-${kepanNode.id}`}
              type="text"
              value={kepanNode.title}
              onChange={(e) => actions.updateKepanNode(kepanNode.id, 'title', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入科判標題..."
              className={`
                font-bold bg-transparent border-b border-transparent focus:border-teal-400 focus:outline-none transition-all w-full
                ${colorClass} 
                ${mode === 'text' ? `${textSizeClass} mb-1 pb-1` : 'text-lg'}
              `}
            />
            
            {/* 科判模式下，若有內文則顯示內文切換按鈕 */}
            {mode === 'outline' && hasContent && (
              <button
                onClick={() => actions.toggleContent(kepanNode.id)}
                className={`p-1 rounded shrink-0 transition-colors ${isContentVisible ? 'bg-teal-100 text-teal-700' : 'text-stone-400 hover:bg-stone-200'}`}
                title={isContentVisible ? "隱藏內文" : "顯示內文"}
              >
                <AlignLeft size={14} />
              </button>
            )}

            {/* 工具列 */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
              <button onClick={() => actions.setFocusId(kepanNode.id)} className="p-1 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded" title="聚焦此節點">
                <Target size={14} />
              </button>
              <button onClick={() => actions.setDeleteMenuId(deleteMenuId === kepanNode.id ? null : kepanNode.id)} className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded" title="刪除選單">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* 原位刪除選單 */}
          {deleteMenuId === kepanNode.id && (
            <div className="bg-white border border-stone-200 shadow-lg rounded-md p-2 mb-2 flex gap-2 items-center text-sm z-10 relative animate-in fade-in slide-in-from-top-2">
              <span className="text-stone-600 font-medium ml-1">刪除選項：</span>
              <button onClick={() => actions.mergeUpKepanNode(kepanNode.id)} className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded transition-colors" title="標題刪除，內文與子節點併入上一段">
                向上合併
              </button>
              <button onClick={() => actions.deleteKepanNode(kepanNode.id)} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors" title="徹底刪除此標題與其下所有內容">
                刪除全部
              </button>
              <button onClick={() => actions.setDeleteMenuId(null)} className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded transition-colors">
                取消
              </button>
            </div>
          )}

          {/* 原文內容區 */}
          {isContentVisible && (
            <div className="relative group/text mb-2">
              <textarea
                ref={textareaRef}
                value={kepanNode.content}
                onChange={handleTextareaInput}
                placeholder={mode === 'text' ? "在此輸入或貼上原文..." : "無內文"}
                className={`
                  w-full bg-transparent resize-none overflow-hidden focus:outline-none transition-all
                  ${mode === 'outline' ? 'text-sm text-stone-500 bg-stone-50/50 p-2 rounded border border-stone-100' : 'text-base text-stone-800 leading-relaxed p-1 hover:bg-stone-50 focus:bg-stone-50 rounded'}
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
                  className="absolute bottom-2 right-2 opacity-0 group-hover/text:opacity-100 bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded shadow flex items-center gap-1 hover:bg-teal-200 transition-all"
                  title="快捷鍵: Ctrl/Cmd + Enter"
                >
                  <SplitSquareHorizontal size={12} /> 游標處拆分
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 遞迴渲染子節點 */}
      {hasChildren && (mode === 'text' || isTreeExpanded) && (
        <div className="mt-1">
          {kepanNode.children.map(childNode => (
            <TreeNode 
              key={childNode.id} kepanNode={childNode} depth={depth + 1} mode={mode}
              expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes}
              deleteMenuId={deleteMenuId} dragInfo={dragInfo} actions={actions} 
            />
          ))}
        </div>
      )}
    </div>
  );
});

// --- 主應用程式 ---
export default function App() {
  const [kepanTree, setKepanTree] = useState(() => {
    try {
      const savedTree = localStorage.getItem('outline_editor_autosave_v2');
      return savedTree ? JSON.parse(savedTree) : INITIAL_EMPTY_KEPAN_TREE;
    } catch (error) {
      console.log("Local Storage 讀取失敗，使用預設模板:", error);
      return INITIAL_EMPTY_KEPAN_TREE;
    }
  });
  const [mode, setMode] = useState('outline'); 
  const [focusId, setFocusId] = useState(null); 
  const [expandedTreeNodes, setExpandedTreeNodes] = useState(new Set(['root-1']));
  const [expandedContentNodes, setExpandedContentNodes] = useState(new Set());
  const [deleteMenuId, setDeleteMenuId] = useState(null);
  
  // 拖曳狀態管理
  const [dragInfo, setDragInfo] = useState({ draggedId: null, overId: null, position: null });

  // 本地端自動存檔
  useEffect(() => {
    try {
      localStorage.setItem('outline_editor_autosave_v2', JSON.stringify(kepanTree));
    } catch (error) {
      console.error("Local Storage 儲存失敗:", error);
    }
  }, [kepanTree]);

  // --- 狀態切換 Actions ---
  const toggleTree = useCallback((id) => {
    setExpandedTreeNodes(prevExpanded => {
      const nextExpanded = new Set(prevExpanded);
      if (nextExpanded.has(id)) nextExpanded.delete(id);
      else nextExpanded.add(id);
      return nextExpanded;
    });
  }, []);

  const toggleContent = useCallback((id) => {
    setExpandedContentNodes(prevExpanded => {
      const nextExpanded = new Set(prevExpanded);
      if (nextExpanded.has(id)) nextExpanded.delete(id);
      else nextExpanded.add(id);
      return nextExpanded;
    });
  }, []);

  // 頂部：一鍵顯示/隱藏全部「原文」
  const toggleAllContent = (show) => {
    if (!show) {
      setExpandedContentNodes(new Set());
      return;
    }
    const allContentIds = new Set();
    const traverseKepanTree = (nodes) => {
      nodes.forEach(node => {
        if (node.content && node.content.trim().length > 0) allContentIds.add(node.id);
        if (node.children) traverseKepanTree(node.children);
      });
    };
    traverseKepanTree(kepanTree);
    setExpandedContentNodes(allContentIds);
  };

  // --- 樹狀資料操作 Actions ---
  const updateKepanNode = useCallback((id, field, value) => {
    setKepanTree(prevTree => {
      const clonedTree = deepCloneKepanTree(prevTree);
      const targetNode = findNodeInKepanTree(clonedTree, id);
      if (targetNode) targetNode[field] = value;
      return clonedTree;
    });
  }, []);

  const addSiblingKepanNode = useCallback((targetId) => {
    setKepanTree(prevTree => {
      const clonedTree = deepCloneKepanTree(prevTree);
      const newNode = { id: generateUniqueId(), title: '', content: '', children: [] };
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
      insertRecursive(clonedTree);
      setTimeout(() => document.getElementById(`input-${newNode.id}`)?.focus(), 50);
      return clonedTree;
    });
  }, []);

  const indentKepanNode = useCallback((targetId) => {
    setKepanTree(prevTree => {
      const clonedTree = deepCloneKepanTree(prevTree);
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
      processIndent(clonedTree);
      setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
      return clonedTree;
    });
  }, []);

  const outdentKepanNode = useCallback((targetId) => {
    setKepanTree(prevTree => {
      const clonedTree = deepCloneKepanTree(prevTree);
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
      processOutdent(clonedTree);
      setTimeout(() => document.getElementById(`input-${targetId}`)?.focus(), 50);
      return clonedTree;
    });
  }, []);

  const splitTextToChildKepanNode = useCallback((nodeId, textareaRef) => {
    if (!textareaRef.current) return;
    const cursorStart = textareaRef.current.selectionStart;
    const currentText = textareaRef.current.value;
    if (cursorStart === 0 || cursorStart === currentText.length) return;

    const textBefore = currentText.substring(0, cursorStart).replace(/\s+$/, '');
    const textAfter = currentText.substring(cursorStart).replace(/^\s+/, '');

    setKepanTree(prevTree => {
      const clonedTree = deepCloneKepanTree(prevTree);
      const targetNode = findNodeInKepanTree(clonedTree, nodeId);
      if (targetNode) {
        targetNode.content = textBefore;
        const newNode = {
          id: generateUniqueId(),
          title: '新子科判',
          content: textAfter,
          children: []
        };
        if (!targetNode.children) targetNode.children = [];
        targetNode.children.unshift(newNode);
        setExpandedTreeNodes(prev => new Set(prev).add(nodeId));
      }
      return clonedTree;
    });
  }, []);

  // --- 刪除與合併邏輯 ---
  const deleteKepanNode = useCallback((id) => {
    setKepanTree(prevTree => {
      const clonedTree = deepCloneKepanTree(prevTree);
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
      removeRecursive(clonedTree);
      if (focusId === id) setFocusId(null);
      setDeleteMenuId(null);
      return clonedTree;
    });
  }, [focusId]);

  const mergeUpKepanNode = useCallback((id) => {
    setKepanTree(prevTree => {
      const clonedTree = deepCloneKepanTree(prevTree);
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
          prevSiblingNode.content = prevSiblingNode.content 
            ? `${prevSiblingNode.content}\n${targetNode.content}` 
            : targetNode.content;
        }
        if (targetNode.children && targetNode.children.length > 0) {
          prevSiblingNode.children = [...(prevSiblingNode.children || []), ...targetNode.children];
        }
      }
      setDeleteMenuId(null);
      return clonedTree;
    });
  }, []);

  // --- 拖曳事件處理 (已修復判定區間與事件冒泡) ---
  const handleDragStart = useCallback((e, id) => {
    e.stopPropagation(); // 阻止事件向上冒泡
    try {
      e.dataTransfer.setData('text/plain', id);
      setDragInfo({ draggedId: id, overId: null, position: null });
    } catch (error) {
      console.log("DragStart 處理發生錯誤:", error);
    }
  }, []);

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();  // 必須阻止預設行為才能允許放置 (Drop)
    e.stopPropagation(); // 阻止冒泡，確保拖曳感應維持在最內層被指向的節點
    
    if (id === dragInfo.draggedId) return;
    
    try {
      const elementRect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - elementRect.top;
      let dragPosition = 'inside';
      
      // 將整個標題行高度切割成上、中、下三個區塊進行判定
      if (relativeY < elementRect.height * 0.25) dragPosition = 'top';
      else if (relativeY > elementRect.height * 0.75) dragPosition = 'bottom';

      // 只有當位置真正改變時才更新狀態，避免頻繁渲染造成效能卡頓
      setDragInfo(prev => {
        if (prev.overId === id && prev.position === dragPosition) return prev;
        return { ...prev, overId: id, position: dragPosition };
      });
    } catch (error) {
      console.log("DragOver 處理發生錯誤:", error);
    }
  }, [dragInfo.draggedId]);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const draggedNodeId = e.dataTransfer.getData('text/plain');
      const { position } = dragInfo;
      
      // 清除拖曳視覺狀態
      setDragInfo({ draggedId: null, overId: null, position: null });

      if (!draggedNodeId || draggedNodeId === targetId) return;

      setKepanTree(prevTree => {
        const clonedTree = deepCloneKepanTree(prevTree);
        let draggedNode = null;
        
        // 1. 從原位置移除拖曳項目
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
        
        if (!draggedNode) return prevTree;

        // 2. 將拖曳項目插入到目標節點的對應位置
        const insertAtTarget = (nodes) => {
          const index = nodes.findIndex(n => n.id === targetId);
          if (index !== -1) {
            if (position === 'top') {
              nodes.splice(index, 0, draggedNode);
            } else if (position === 'bottom') {
              nodes.splice(index + 1, 0, draggedNode);
            } else {
              if (!nodes[index].children) nodes[index].children = [];
              nodes[index].children.unshift(draggedNode); // 改為從最上方插入，更符合子層建立直覺
              setExpandedTreeNodes(prev => new Set(prev).add(targetId));
            }
            return true;
          }
          for (let node of nodes) {
            if (node.children && insertAtTarget(node.children)) return true;
          }
          return false;
        };
        insertAtTarget(clonedTree);
        
        return clonedTree;
      });
    } catch (error) {
      console.error("拖曳排序處理失敗:", error);
      // 若發生錯誤則恢復視覺狀態
      setDragInfo({ draggedId: null, overId: null, position: null });
    }
  }, [dragInfo]);

  // Actions 包裝物件
  const kepanTreeActions = {
    updateKepanNode, addSiblingKepanNode, indentKepanNode, outdentKepanNode,
    deleteKepanNode, mergeUpKepanNode, splitTextToChildKepanNode, setFocusId,
    setDeleteMenuId, toggleTree, toggleContent,
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
    } catch (error) {
      console.error("檔案匯出失敗:", error);
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
          setKepanTree(parsedData);
        } catch (err) {
          console.error("檔案解析失敗:", err);
          alert("檔案格式不正確，請匯入有效的 JSON 檔案。");
        }
      };
      fileReader.readAsText(selectedFile);
    } catch (error) {
      console.error("檔案讀取發生錯誤:", error);
    }
  };

  const currentRenderData = focusId ? [findNodeInKepanTree(kepanTree, focusId)].filter(Boolean) : kepanTree;
  const currentBreadcrumbPath = focusId ? findPathInKepanTree(kepanTree, focusId) : null;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-800">
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-stone-200 px-6 py-3 flex flex-wrap justify-between items-center sticky top-0 z-20 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <ListTree className="text-teal-600" />
            廣論科判編輯器
          </h1>
          
          <div className="flex bg-stone-100 rounded-lg p-1 border border-stone-200">
            <button onClick={() => setMode('text')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'text' ? 'bg-white shadow text-teal-700' : 'text-stone-500 hover:text-stone-700'}`}>
              <FileText size={16} /> 原文模式
            </button>
            <button onClick={() => setMode('outline')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'outline' ? 'bg-white shadow text-teal-700' : 'text-stone-500 hover:text-stone-700'}`}>
              <ListTree size={16} /> 科判模式
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 原文一鍵切換按鈕 */}
          {mode === 'outline' && (
             <div className="flex items-center gap-2 mr-2">
               <button onClick={() => toggleAllContent(true)} className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                 顯示全部原文
               </button>
               <span className="text-stone-300">|</span>
               <button onClick={() => toggleAllContent(false)} className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                 隱藏全部原文
               </button>
             </div>
          )}

          <div className="w-px h-4 bg-stone-300 mx-1"></div>
          
          <label className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded shadow-sm hover:bg-stone-50 cursor-pointer transition-colors">
            <FolderOpen size={16} /> 開啟檔案
            <input type="file" accept=".json" onChange={handleImportFromFile} className="hidden" />
          </label>
          <button onClick={handleExportToFile} className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded shadow-sm hover:bg-teal-700 transition-colors">
            <Save size={16} /> 存檔
          </button>
        </div>
      </header>

      {/* Breadcrumbs */}
      {focusId && currentBreadcrumbPath && (
        <div className="bg-teal-50 border-b border-teal-100 px-6 py-2 flex items-center gap-2 text-sm text-teal-800 sticky top-[60px] z-10">
          <button onClick={() => setFocusId(null)} className="hover:text-teal-600 flex items-center gap-1 font-medium">
            <Home size={14} /> 根目錄
          </button>
          {currentBreadcrumbPath.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight size={14} className="text-teal-400" />
              <button 
                onClick={() => setFocusId(crumb.id)}
                className={`hover:text-teal-600 ${idx === currentBreadcrumbPath.length - 1 ? 'font-bold' : ''}`}
              >
                {crumb.title || '(無標題)'}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Editor Main */}
      <main className="flex-1 overflow-auto p-8 flex justify-center">
        <div className="w-full max-w-4xl bg-white p-8 rounded-lg shadow-sm border border-stone-100 min-h-[80vh]">
          {currentRenderData.map(rootNode => (
            <TreeNode 
              key={rootNode.id} kepanNode={rootNode} depth={0} mode={mode}
              expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes}
              deleteMenuId={deleteMenuId} dragInfo={dragInfo} actions={kepanTreeActions} 
            />
          ))}
        </div>
      </main>
    </div>
  );
}
