import React, { useState, useEffect, useRef } from 'react';
import { Highlighter, Bold, Sparkles } from 'lucide-react';
import { formatRichText } from '../utils/formatUtils';

const SmartTextarea = ({ value, onChange, onSplit, onExplain, placeholder, className, themeConfig }) => {
  const [isEditing, setIsEditing] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
      ref.current.focus();
    }
  }, [isEditing]);

  const applyFormat = (prefix, suffix) => {
    if (!ref.current) return;
    const start = ref.current.selectionStart, end = ref.current.selectionEnd;
    const v = value || '', before = v.substring(0, start), sel = v.substring(start, end), after = v.substring(end);
    const nv = before + prefix + sel + suffix + after;
    ref.current.style.height = 'auto'; ref.current.style.height = `${ref.current.scrollHeight}px`;
    onChange(nv);
    setTimeout(() => { ref.current?.focus(); ref.current?.setSelectionRange(start + prefix.length, end + prefix.length); }, 0);
  };

  const handleExplain = (e) => {
    e.preventDefault();
    if (!ref.current || !onExplain) return;
    const start = ref.current.selectionStart, end = ref.current.selectionEnd;
    const sel = (value || '').substring(start, end).trim();
    if (sel) onExplain(sel, value);
  };

  const handleClick = () => {
    if (window.getSelection()?.toString().length > 0) return;
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="relative group/editor w-full">
        <div className={`absolute -top-8 right-0 flex gap-1 p-1 rounded shadow-md border opacity-0 group-hover/editor:opacity-100 transition-opacity z-10 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
          <button onMouseDown={e => { e.preventDefault(); applyFormat('==', '=='); }} className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${themeConfig.btnHover} text-yellow-600 dark:text-yellow-400`} title="標記重點"><Highlighter size={12} className="mr-1"/> 重點</button>
          <button onMouseDown={e => { e.preventDefault(); applyFormat('**', '**'); }} className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${themeConfig.btnHover} text-teal-600 dark:text-teal-400`} title="標記粗體"><Bold size={12} className="mr-1"/> 粗體</button>
          <button onMouseDown={handleExplain} className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${themeConfig.btnHover} text-purple-600 dark:text-purple-400`} title="AI 智慧對話消文"><Sparkles size={12} className="mr-1"/> 消文</button>
        </div>
        <textarea ref={ref} value={value} onChange={e => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; onChange(e.target.value); }} onBlur={() => setIsEditing(false)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onSplit?.(ref.current.selectionStart, e.target.value, e.shiftKey); setIsEditing(false); } }} className={`${className} resize-none overflow-hidden outline-none block w-full bg-transparent`} placeholder={placeholder} />
      </div>
    );
  }

  return (
    <div onClick={handleClick} className={`${className} cursor-text whitespace-pre-wrap block w-full ${value ? 'min-h-[1.5rem]' : 'min-h-[1rem]'}`}
      dangerouslySetInnerHTML={{ __html: value ? formatRichText(value, themeConfig) : `<div class="opacity-0 hover:opacity-50 transition-opacity italic text-sm select-none py-0.5 ${themeConfig.placeholder}">點擊新增內容...</div>` }} />
  );
};

export default SmartTextarea;
