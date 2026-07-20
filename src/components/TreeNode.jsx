import React, { memo, useRef, useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, GripVertical, Target, Trash2, AlignLeft, BookOpen, ImageIcon, Wand2, Leaf } from 'lucide-react';
import SmartTextarea from './SmartTextarea';

/* 平滑折疊 — 用 max-height + requestAnimationFrame 實現動畫 */
const Collapsible = ({ isOpen, children }) => {
  const [maxH, setMaxH] = useState(isOpen ? 'none' : '0');
  const innerRef = useRef(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (isOpen) {
      const h = el.scrollHeight;
      setMaxH(`${h + 20}px`);
      const timer = setTimeout(() => setMaxH('none'), 300);
      return () => clearTimeout(timer);
    } else {
      const h = el.scrollHeight;
      if (h > 0) {
        setMaxH(`${h + 20}px`);
        requestAnimationFrame(() => requestAnimationFrame(() => setMaxH('0')));
      } else {
        setMaxH('0');
      }
    }
  }, [isOpen]);

  return (
    <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: maxH }}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
};

const TreeNode = memo(({
  kepanNode, depth, mode, themeConfig, apiKeys,
  expandedTreeNodes, expandedContentNodes, expandedNoteNodes,
  deleteMenuId, dragInfo, isAILoadingId, actions, showToast,
  searchQuery,
}) => {
  const isTreeExpanded = expandedTreeNodes.has(kepanNode.id);
  const isContentVisible = mode === 'text' || mode === 'split' || expandedContentNodes.has(kepanNode.id);
  const isNoteVisible = expandedNoteNodes.has(kepanNode.id);
  const hasChildren = kepanNode.children?.length > 0;
  const hasContent = kepanNode.content?.trim().length > 0;
  const hasNote = kepanNode.note?.trim().length > 0;
  const colorClass = themeConfig.depthColors[depth % themeConfig.depthColors.length];
  const textSizes = ['text-2xl','text-xl','text-lg','text-base','text-sm'];
  const textSizeClass = textSizes[Math.min(depth, textSizes.length - 1)];
  const isDragged = dragInfo.draggedId === kepanNode.id;
  const isDragOver = dragInfo.overId === kepanNode.id;

  let dz = 'border border-transparent';
  if (isDragOver && dragInfo.position === 'top') dz = 'border-t-2 border-t-teal-500 rounded-t';
  if (isDragOver && dragInfo.position === 'bottom') dz = 'border-b-2 border-b-teal-500 rounded-b';
  if (isDragOver && dragInfo.position === 'inside') dz = 'bg-teal-500/10 rounded ring-1 ring-teal-500/50';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); actions.addSiblingKepanNode(kepanNode.id); }
    else if (e.key === 'Tab') { e.preventDefault(); e.shiftKey ? actions.outdentKepanNode(kepanNode.id) : actions.indentKepanNode(kepanNode.id); }
    else if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); actions.moveNode(kepanNode.id, 'up'); }
    else if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); actions.moveNode(kepanNode.id, 'down'); }
  };

  const sp = mode === 'text' ? 'mb-0' : 'mb-2';
  const pl = (mode === 'outline' || mode === 'split') && depth > 0 ? `ml-6 border-l-2 ${themeConfig.border} pl-4` : 'ml-0';
  return (
    <div className={`${sp} ${pl} ${isDragged ? 'opacity-30 scale-[0.98]' : 'opacity-100 scale-100'} transition-all duration-200`}>
      <div onDragOver={e => actions.handleDragOver(e, kepanNode.id)} onDrop={e => actions.handleDrop(e, kepanNode.id)}
        className={`group relative flex items-start gap-1 ${mode === 'text' ? 'p-0 -ml-0' : 'p-1 -ml-1'} transition-colors ${dz}`}
        onClick={() => { if (mode === 'split') { const el = document.getElementById(`split-content-${kepanNode.id}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('ring-2','ring-teal-400','bg-teal-500/10'); setTimeout(() => el.classList.remove('ring-2','ring-teal-400','bg-teal-500/10'), 1500); } } }}>

        {(mode === 'outline' || mode === 'split') && (
          <div draggable onDragStart={e => actions.handleDragStart(e, kepanNode.id)} className="mt-1.5 cursor-grab opacity-30 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-teal-600 shrink-0"><GripVertical size={18} /></div>
        )}

        {(mode === 'outline' || mode === 'split') && hasChildren ? (
          <button onClick={e => { e.stopPropagation(); actions.toggleTree(kepanNode.id); }} className="mt-1 transition-colors shrink-0 text-stone-400 hover:text-teal-600">
            {isTreeExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : (mode === 'outline' || mode === 'split') ? <div className="w-[18px] shrink-0" /> : null}

        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <input id={`input-${kepanNode.id}`} type="text" value={String(kepanNode.title || '')}
              onChange={e => actions.updateKepanNode(kepanNode.id, 'title', e.target.value)} onKeyDown={handleKeyDown}
              placeholder="輸入科判標題..."
              className={`font-bold bg-transparent border-b border-transparent focus:border-teal-500 focus:outline-none transition-all flex-1 min-w-[150px] ${colorClass} ${mode === 'text' ? `${textSizeClass} mt-4 mb-1 pb-0` : 'text-lg mb-1 pb-1'}`} />

            <div className={`flex items-center gap-1 shrink-0 ${mode === 'split' && !hasContent && !hasNote ? 'opacity-0' : ''}`}>
                {mode === 'outline' && hasContent && (
                  <button onClick={e => { e.stopPropagation(); actions.toggleContent(kepanNode.id); }}
                    className={`p-1 rounded transition-colors ${isContentVisible ? 'bg-teal-500/20 text-teal-600' : 'text-stone-400 hover:bg-stone-500/20'}`} title={isContentVisible ? '隱藏內文' : '顯示內文'}><AlignLeft size={14} /></button>
                )}
                {(mode === 'outline' || mode === 'text' || mode === 'split') && (hasNote || isNoteVisible || hasContent) && (
                  <button onClick={e => { e.stopPropagation(); actions.toggleNote(kepanNode.id); }}
                    className={`p-1 rounded transition-colors ${isNoteVisible ? 'bg-amber-500/20 text-amber-600' : hasNote ? 'text-amber-500' : 'text-stone-400 hover:bg-stone-500/20 opacity-0 group-hover:opacity-100'}`} title="修行筆記 / 札記"><BookOpen size={14} /></button>
                )}
                {(hasContent || hasNote) && (
                  <button onClick={e => { e.stopPropagation(); actions.openQuoteCard(kepanNode); }} className="p-1 rounded transition-colors opacity-0 group-hover:opacity-100 text-sky-500 hover:bg-sky-500/20" title="生成金句卡"><ImageIcon size={14} /></button>
                )}
                {hasContent && mode !== 'split' && (
                  <button onClick={e => { e.stopPropagation(); actions.generateAISkeleton(kepanNode.id); }} disabled={isAILoadingId === kepanNode.id}
                    className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 text-purple-500 hover:bg-purple-500/20 ${isAILoadingId === kepanNode.id ? 'animate-pulse' : ''}`} title="AI 輔助骨架生成"><Wand2 size={14} /></button>
                )}
                <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${mode === 'split' ? 'hidden' : ''}`}>
                  <button onClick={e => { e.stopPropagation(); actions.setFocusId(kepanNode.id); }} className="p-1 text-stone-400 hover:text-teal-600 hover:bg-teal-500/20 rounded" title="聚焦此節點"><Target size={14} /></button>
                  <button onClick={e => { e.stopPropagation(); actions.setDeleteMenuId(deleteMenuId === kepanNode.id ? null : kepanNode.id); }} className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-500/20 rounded" title="刪除選單"><Trash2 size={14} /></button>
                </div>
            </div>
          </div>

          {deleteMenuId === kepanNode.id && (
            <div className={`border shadow-lg rounded-md p-2 mb-2 flex gap-2 items-center text-sm z-10 relative animate-in fade-in slide-in-from-top-2 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
              <span className={`font-medium ml-1 ${themeConfig.text}`}>刪除選項：</span>
              <button onClick={() => actions.mergeUpKepanNode(kepanNode.id)} className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 rounded transition-colors" title="刪除此標題，內文與子節點併入上一段">向上合併</button>
              <button onClick={() => actions.deleteKepanNode(kepanNode.id)} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded transition-colors" title="徹底刪除此標題與其下所有內容">刪除全部</button>
              <button onClick={() => actions.setDeleteMenuId(null)} className={`px-3 py-1 rounded transition-colors ${themeConfig.btnHover} ${themeConfig.text}`}>取消</button>
            </div>
          )}

          {isContentVisible && mode !== 'split' && (
            /* 原文模式：若無內文又有子科判，直接跳過空白輸入區，讓子科判緊接標題 */
            (mode === 'text' && !hasContent && hasChildren) ? null : (
            <div className="relative group/text w-full">
              <SmartTextarea value={String(kepanNode.content || '')} onChange={val => actions.updateKepanNode(kepanNode.id, 'content', val)}
                onSplit={(cs, ct, isShift) => { isShift ? actions.splitTextToChildKepanNode(kepanNode.id, cs, ct) : actions.splitTextToSiblingKepanNode(kepanNode.id, cs, ct); }}
                onExplain={(t, c) => actions.explainText(t, c)}
                onCreateNode={(sel) => actions.createNodeFromSelection?.(kepanNode.id, sel)}
                placeholder={mode === 'text' ? '在此輸入或貼上原文...' : '無內文'} themeConfig={themeConfig}
                className={`w-full transition-all ${mode === 'outline' ? `text-sm p-2 rounded border ${themeConfig.outlineTextarea}` : `text-base leading-[1.8] py-1 rounded ${themeConfig.textarea}`}`} />
              {mode === 'text' && kepanNode.content && (
                <div className="absolute bottom-1 right-2 opacity-0 group-hover/text:opacity-100 pointer-events-none transition-all z-0 flex gap-2">
                  <span className="bg-teal-500/20 text-teal-600 text-xs px-2 py-1 rounded shadow backdrop-blur-sm">Ctrl+Enter 同層拆分</span>
                  <span className="bg-teal-500/20 text-teal-600 text-xs px-2 py-1 rounded shadow backdrop-blur-sm">Ctrl+Shift+Enter 子層拆分</span>
                </div>
              )}
            </div>
            )
          )}

          {isNoteVisible && (
            <div className={`mb-2 mt-2 p-3 rounded-lg border-l-4 shadow-sm relative w-full ${themeConfig.noteBg}`}>
              <div className="flex items-center gap-2 mb-1 text-xs font-bold opacity-70 uppercase tracking-widest"><Leaf size={12} /> Dharma Journaling</div>
              <SmartTextarea value={String(kepanNode.note || '')} onChange={val => actions.updateKepanNode(kepanNode.id, 'note', val)}
                placeholder="在此記錄您的修行觀察、心相調伏或疑問 (支援浮動工具列)..." themeConfig={themeConfig} className="w-full bg-transparent text-sm leading-relaxed" />
            </div>
          )}
        </div>
      </div>

      {hasChildren && (
        <Collapsible isOpen={mode === 'text' || mode === 'split' || isTreeExpanded}>
          <div className="mt-0">{kepanNode.children.map(ch => (
            <TreeNode key={ch.id} kepanNode={ch} depth={depth + 1} mode={mode} themeConfig={themeConfig} apiKeys={apiKeys}
              expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes}
              deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={actions} showToast={showToast}
              searchQuery={searchQuery} />
          ))}</div>
        </Collapsible>
      )}
    </div>
  );
});

TreeNode.displayName = 'TreeNode';
export default TreeNode;