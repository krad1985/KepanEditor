import React, { useState, useEffect, useRef } from 'react';
import { Highlighter, Bold, Sparkles, MessageSquarePlus, Link2, ListChecks, Lightbulb } from 'lucide-react';
import { formatRichText } from '../utils/formatUtils';

const SLASH_MENU_ITEMS = [
  { id: 'reflection', label: '修行反思', icon: MessageSquarePlus, template: '\n\n> 💭 **反思：** ' },
  { id: 'question', label: '提出提問', icon: Lightbulb, template: '\n\n> ❓ **提問：** ' },
  { id: 'summary', label: '重點摘要', icon: ListChecks, template: '\n\n> 📌 **要點：** ' },
  { id: 'link', label: '插入連結', icon: Link2, template: '\n\n> 🔗 **相關連結：** ' },
];

const SmartTextarea = ({ value, onChange, onSplit, onExplain, onCreateNode, placeholder, className, themeConfig }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(-1);
  const ref = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
      ref.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setSlashOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyFormat = (prefix, suffix) => {
    if (!ref.current) return;
    const start = ref.current.selectionStart, end = ref.current.selectionEnd;
    const v = value || '', before = v.substring(0, start), sel = v.substring(start, end), after = v.substring(end);
    const nv = before + prefix + sel + suffix + after;
    ref.current.style.height = 'auto'; ref.current.style.height = `${ref.current.scrollHeight}px`;
    onChange(nv);
    setTimeout(() => { ref.current?.focus(); ref.current?.setSelectionRange(start + prefix.length, end + prefix.length); }, 0);
  };

  const insertSlashTemplate = (item) => {
    const ta = ref.current;
    if (!ta) return;
    const cursorPos = slashIndex >= 0 ? slashIndex : ta.selectionStart;
    const v = value || '';
    // 移除觸發的 / 字元，插入模板
    const before = v.substring(0, cursorPos - 1);
    const after = v.substring(cursorPos);
    const nv = before + item.template + after;
    ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`;
    onChange(nv);
    setSlashOpen(false);
    setSlashIndex(-1);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(cursorPos - 1 + item.template.length, cursorPos - 1 + item.template.length); }, 0);
  };

  const handleExplain = (e) => {
    e.preventDefault();
    if (!ref.current || !onExplain) return;
    const start = ref.current.selectionStart, end = ref.current.selectionEnd;
    const sel = (value || '').substring(start, end).trim();
    if (sel) onExplain(sel, value);
  };

  const handleKeyDown = (e) => {
    const ta = ref.current;
    if (!ta) return;

    // Ctrl+Enter / Ctrl+Shift+Enter 拆分
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (slashOpen) { setSlashOpen(false); return; }
      onSplit?.(ta.selectionStart, e.target.value, e.shiftKey);
      setIsEditing(false);
      return;
    }

    // / 選單導航
    if (slashOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, SLASH_MENU_ITEMS.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (slashIndex >= 0) insertSlashTemplate(SLASH_MENU_ITEMS[slashIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setSlashOpen(false); return; }
    }

    // Ctrl+Shift+N 從選取文字建立子節點
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      const start = ta.selectionStart, end = ta.selectionEnd;
      const sel = (value || '').substring(start, end).trim();
      if (sel && onCreateNode) { onCreateNode(sel, start, end, value); setIsEditing(false); }
      return;
    }
  };

  const handleChange = (e) => {
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
    const v = e.target.value;
    onChange(v);

    // 偵測 / 觸發快速選單
    const cursorPos = ta.selectionStart;
    const charBefore = cursorPos > 0 ? v[cursorPos - 1] : '';
    if (charBefore === '/' && (cursorPos === 1 || /[\s(（]/.test(v[cursorPos - 2] || ''))) {
      setSlashOpen(true);
      setSlashIndex(0);
    } else if (!v.includes('/', Math.max(0, cursorPos - 2))) {
      // 如果 / 被刪除了就關閉
    }
  };

  const handleClick = () => {
    if (window.getSelection()?.toString().length > 0) return;
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="relative group/editor w-full">
        {/* 浮動工具列 */}
        <div className={`absolute -top-8 right-0 flex gap-1 p-1 rounded shadow-md border transition-opacity z-10 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
          <button onMouseDown={e => { e.preventDefault(); applyFormat('==', '=='); }} className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${themeConfig.btnHover} text-yellow-600 dark:text-yellow-400`} title="標記重點"><Highlighter size={12} className="mr-1"/> 重點</button>
          <button onMouseDown={e => { e.preventDefault(); applyFormat('**', '**'); }} className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${themeConfig.btnHover} text-teal-600 dark:text-teal-400`} title="標記粗體"><Bold size={12} className="mr-1"/> 粗體</button>
          <button onMouseDown={handleExplain} className={`flex items-center px-2 py-1 text-xs rounded font-medium transition-colors ${themeConfig.btnHover} text-purple-600 dark:text-purple-400`} title="消文研討"><Sparkles size={12} className="mr-1"/> 消文</button>
        </div>

        {/* / 快速插入選單 */}
        {slashOpen && (
          <div ref={menuRef} className={`absolute -top-36 left-0 w-56 rounded-lg shadow-xl border z-20 overflow-hidden ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
            <div className={`px-3 py-2 text-xs font-bold opacity-60 uppercase tracking-wider border-b ${themeConfig.border}`}>快速插入模板</div>
            {SLASH_MENU_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onMouseDown={e => { e.preventDefault(); insertSlashTemplate(item); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 text-sm transition-colors ${idx === slashIndex ? (themeConfig.isDark ? 'bg-stone-700' : 'bg-stone-100') : ''} ${themeConfig.btnHover}`}>
                  <Icon size={16} className="opacity-70 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <textarea ref={ref} value={value} onChange={handleChange} onBlur={() => { if (!slashOpen) setIsEditing(false); }} onKeyDown={handleKeyDown}
          className={`${className} resize-none overflow-hidden outline-none block w-full bg-transparent`} placeholder={placeholder} />
      </div>
    );
  }

  return (
    <div onClick={handleClick} className={`${className} cursor-text whitespace-pre-wrap block w-full ${value ? 'min-h-[1.5rem]' : 'min-h-[1rem]'}`}
      dangerouslySetInnerHTML={{ __html: value ? formatRichText(value, themeConfig) : `<div class="opacity-0 hover:opacity-50 transition-opacity italic text-sm select-none py-0.5 ${themeConfig.placeholder}">點擊新增內容...</div>` }} />
  );
};

export default SmartTextarea;
