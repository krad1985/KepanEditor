import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ListTree, Wand2 } from 'lucide-react';

/* ---- 常數 ---- */
import { THEMES, getTheme } from './constants/themes';
import { DEFAULT_SETTINGS, STORAGE_KEYS, FONT_STYLES } from './constants/settings';
import { INITIAL_EMPTY_KEPAN_TREE } from './constants/defaults';
import { EXPLAIN_SYSTEM_PROMPT, EXPLAIN_FOLLOWUP_PROMPT, FULL_ANALYSIS_SYSTEM_PROMPT } from './constants/prompts';

/* ---- 工具 ---- */
import {
  deepCloneKepanTree,
  findNodeInKepanTree,
  findPathInKepanTree,
  generateUniqueId,
  searchTreeNodes,
  flattenTreeIds,
} from './utils/treeUtils';
import {
  treeToMarkdown,
  convertToBulletMarkdown,
  markdownToTree,
} from './utils/markdownUtils';
import { callAIChat, callImagenAPI } from './utils/aiUtils';
import { formatRichText } from './utils/formatUtils';

/* ---- Hooks ---- */
import { useUndoRedo } from './hooks/useUndoRedo';
import { useAutoSave } from './hooks/useAutoSave';

/* ---- 元件 ---- */
import Header from './components/Header';
import Breadcrumbs from './components/Breadcrumbs';
import TreeNode from './components/TreeNode';
import MapMode from './components/MapMode';
import SettingsPanel from './components/SettingsPanel';
import ExplainModal from './components/ExplainModal';
import QuoteCardModal from './components/QuoteCardModal';
import Toast from './components/Toast';
import LoadingOverlay from './components/LoadingOverlay';
import ShortcutModal from './components/ShortcutModal';

const envApiKey = '';

/* ---- 共用輔助：從 AI 回覆中萃取出 JSON（bracket-balancing） ——— */
const extractJsonFromText = (text) => {
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // 找第一個 { 或 [
  let startIdx = -1, openCh = '', closeCh = '';
  const fb = clean.indexOf('{'), fa = clean.indexOf('[');
  if (fb !== -1 && (fa === -1 || fb < fa)) { startIdx = fb; openCh = '{'; closeCh = '}'; }
  else if (fa !== -1) { startIdx = fa; openCh = '['; closeCh = ']'; }
  if (startIdx === -1) return clean;
  // 逐字元平衡括號，正確找到對應的結束位置
  let depth = 0, inStr = false, esc = false;
  for (let i = startIdx; i < clean.length; i++) {
    const ch = clean[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === openCh) depth++;
    else if (ch === closeCh) { depth--; if (depth === 0) return clean.slice(startIdx, i + 1); }
  }
  return clean;
};

/* ---- 共用輔助：模糊比對金句（忽略空白/標點） ——— */
const _norm = (s) => s.replace(/[\s\u3000，。、；：！？「」『』【】（）《》…—\-.,;:!?()\[\]{}"'"]/g, '');
const findAndMarkSentence = (content, sentence) => {
  if (!content || !sentence) return content;
  // 1. 精確 regex 匹配
  const esc = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(esc).test(content)) {
    return content.replace(new RegExp(esc, 'g'), `==${sentence}==`);
  }
  // 2. 忽略空白/標點的模糊匹配
  const nc = _norm(content), ns = _norm(sentence);
  if (!ns || !nc.includes(ns)) return content;
  // 從 norm 對應回原文位置，找到對應的原文片段來標記
  let origIdx = 0, normIdx = 0, startOrig = -1;
  while (origIdx < content.length && normIdx < ns.length) {
    const ch = content[origIdx];
    const nch = _norm(ch);
    if (nch.length === 0) { origIdx++; continue; }
    if (startOrig === -1) startOrig = origIdx;
    if (nch === ns[normIdx]) { normIdx++; origIdx++; }
    else { normIdx = 0; startOrig = -1; }
  }
  if (startOrig !== -1 && normIdx >= ns.length) {
    const matched = content.slice(startOrig, origIdx);
    return content.slice(0, startOrig) + `==${matched}==` + content.slice(origIdx);
  }
  return content;
};

export default function App() {
  /* ===== 初始化 ===== */
  const [initialTree] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEYS.AUTOSAVE); return s ? JSON.parse(s) : INITIAL_EMPTY_KEPAN_TREE; }
    catch { return INITIAL_EMPTY_KEPAN_TREE; }
  });
  const [initialSettings] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEYS.SETTINGS); return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS; }
    catch { return DEFAULT_SETTINGS; }
  });

  const { present: kepanTree, commitChange, undo, redo, canUndo, canRedo, reset } = useUndoRedo(initialTree);
  const [settings, setSettings] = useState(initialSettings);
  const [mode, setMode] = useState('text');
  const [focusId, setFocusId] = useState(null);
  const [expandedTreeNodes, setExpandedTreeNodes] = useState(() => new Set([initialTree[0]?.id].filter(Boolean)));
  const [expandedContentNodes, setExpandedContentNodes] = useState(new Set());
  const [expandedNoteNodes, setExpandedNoteNodes] = useState(new Set());
  const [deleteMenuId, setDeleteMenuId] = useState(null);
  const [dragInfo, setDragInfo] = useState({ draggedId: null, overId: null, position: null });
  const [activeBreadcrumbDropdown, setActiveBreadcrumbDropdown] = useState(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quoteCardNode, setQuoteCardNode] = useState(null);
  const [aiBgImage, setAiBgImage] = useState(null);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [explainData, setExplainData] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isAILoadingId, setIsAILoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const toastTimer = useRef(null);

  const themeConfig = getTheme(settings.themeKey);
  const isDark = themeConfig.isDark;
  const currentRenderData = focusId ? [findNodeInKepanTree(kepanTree, focusId)].filter(Boolean) : kepanTree;
  const currentBreadcrumbPath = focusId ? findPathInKepanTree(kepanTree, focusId) : null;

  /* ===== 自動儲存 ===== */
  useAutoSave(kepanTree, settings);

  /* ===== html2canvas 載入 ===== */
  useEffect(() => {
    if (!document.getElementById('html2canvas-script')) {
      const s = document.createElement('script');
      s.id = 'html2canvas-script';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      document.body.appendChild(s);
    }
  }, []);

  /* ===== 全域快捷鍵 ===== */
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.target.closest('textarea') && !e.target.closest('input')) {
        setShowShortcuts(p => !p);
      }
      if (e.key === 'Escape') {
        if (focusId) { setFocusId(null); setActiveBreadcrumbDropdown(null); }
        if (showShortcuts) setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo, redo, focusId, showShortcuts]);

  /* ===== Toast ===== */
  const showToast = useCallback((msg, dur = 5000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), dur);
  }, []);

  /* ===== UI 操作 ===== */
  const toggleTree = useCallback(id => setExpandedTreeNodes(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleContent = useCallback(id => setExpandedContentNodes(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const toggleNote = useCallback(id => setExpandedNoteNodes(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const handleClearFocus = useCallback(() => { setFocusId(null); setActiveBreadcrumbDropdown(null); }, []);

  /* ===== 節點 CRUD ===== */
  const updateKepanNode = useCallback((id, f, v) => commitChange(t => { const c = deepCloneKepanTree(t); const n = findNodeInKepanTree(c, id); if (n && n[f] !== v) { n[f] = v; return c; } return t; }), [commitChange]);

  const addSiblingKepanNode = useCallback((tid) => {
    const nn = { id: generateUniqueId(), title: '', content: '', note: '', children: [] };
    commitChange(t => { const c = deepCloneKepanTree(t); const ins = (ns) => { const i = ns.findIndex(n => n.id === tid); if (i !== -1) { ns.splice(i + 1, 0, nn); return true; } for (const n of ns) { if (n.children && ins(n.children)) return true; } return false; }; return ins(c) ? c : t; });
    setTimeout(() => document.getElementById(`input-${nn.id}`)?.focus(), 50);
  }, [commitChange]);

  const indentKepanNode = useCallback((tid) => {
    let eid = null;
    commitChange(t => { const c = deepCloneKepanTree(t); const p = (ns) => { const i = ns.findIndex(n => n.id === tid); if (i > 0) { const n = ns.splice(i, 1)[0]; const pv = ns[i - 1]; if (!pv.children) pv.children = []; pv.children.push(n); eid = pv.id; return true; } for (const n of ns) { if (n.children && p(n.children)) return true; } return false; }; return p(c) ? c : t; });
    if (eid) setExpandedTreeNodes(p => new Set(p).add(eid));
    setTimeout(() => document.getElementById(`input-${tid}`)?.focus(), 50);
  }, [commitChange]);

  const outdentKepanNode = useCallback((tid) => {
    commitChange(t => { const c = deepCloneKepanTree(t); const p = (ns, pa = null, pi = -1) => { const i = ns.findIndex(n => n.id === tid); if (i !== -1 && pa) { const n = ns.splice(i, 1)[0]; pa.splice(pi + 1, 0, n); return true; } for (let j = 0; j < ns.length; j++) { if (ns[j].children && p(ns[j].children, ns, j)) return true; } return false; }; return p(c) ? c : t; });
    setTimeout(() => document.getElementById(`input-${tid}`)?.focus(), 50);
  }, [commitChange]);

  const moveNode = useCallback((tid, dir) => {
    commitChange(t => { const c = deepCloneKepanTree(t); const p = (ns) => { const i = ns.findIndex(n => n.id === tid); if (i !== -1) { if (dir === 'up' && i > 0) { [ns[i - 1], ns[i]] = [ns[i], ns[i - 1]]; return true; } if (dir === 'down' && i < ns.length - 1) { [ns[i], ns[i + 1]] = [ns[i + 1], ns[i]]; return true; } return false; } for (const n of ns) { if (n.children && p(n.children)) return true; } return false; }; return p(c) ? c : t; });
    setTimeout(() => document.getElementById(`input-${tid}`)?.focus(), 50);
  }, [commitChange]);

  const splitTextToSiblingKepanNode = useCallback((nid, cs, ct) => {
    const before = ct.substring(0, cs).replace(/\s+$/, ''), after = ct.substring(cs).replace(/^\s+/, '');
    commitChange(t => { const c = deepCloneKepanTree(t); let tn, pa, ti; const f = (ns) => { for (let i = 0; i < ns.length; i++) { if (ns[i].id === nid) { tn = ns[i]; pa = ns; ti = i; return true; } if (ns[i].children && f(ns[i].children)) return true; } return false; }; if (f(c)) { tn.content = before; pa.splice(ti + 1, 0, { id: generateUniqueId(), title: '新科判', content: after, note: '', children: [] }); return c; } return t; });
  }, [commitChange]);

  const splitTextToChildKepanNode = useCallback((nid, cs, ct) => {
    const before = ct.substring(0, cs).replace(/\s+$/, ''), after = ct.substring(cs).replace(/^\s+/, '');
    commitChange(t => { const c = deepCloneKepanTree(t); const n = findNodeInKepanTree(c, nid); if (n) { n.content = before; if (!n.children) n.children = []; n.children.unshift({ id: generateUniqueId(), title: '新科判', content: after, note: '', children: [] }); return c; } return t; });
    setExpandedTreeNodes(p => new Set(p).add(nid));
  }, [commitChange]);

  const deleteKepanNode = useCallback((id) => {
    commitChange(t => { const c = deepCloneKepanTree(t); const r = (ns) => { const i = ns.findIndex(n => n.id === id); if (i !== -1) { ns.splice(i, 1); return true; } for (const n of ns) { if (n.children && r(n.children)) return true; } return false; }; return r(c) ? c : t; });
    if (focusId === id) setFocusId(null);
    setDeleteMenuId(null);
  }, [commitChange, focusId]);

  const mergeUpKepanNode = useCallback((id) => {
    let top = false;
    commitChange(t => { const c = deepCloneKepanTree(t); let tn, psn, tpn; const f = (ns, pn = null) => { const i = ns.findIndex(n => n.id === id); if (i !== -1) { tn = ns.splice(i, 1)[0]; if (i > 0) psn = ns[i - 1]; else tpn = pn; return true; } for (const n of ns) { if (n.children && f(n.children, n)) return true; } return false; }; if (f(c)) { const mt = psn || tpn; if (mt) { const ac = (tn.content || '').trim(); if (ac) mt.content = mt.content ? `${mt.content}\n${ac}` : ac; if (tn.note) mt.note = mt.note ? `${mt.note}\n${tn.note}` : tn.note; if (tn.children?.length) mt.children = [...(mt.children || []), ...tn.children]; return c; } top = true; } return t; });
    if (top) showToast('此節點已是最頂層，無法再向上合併。');
    else setDeleteMenuId(null);
  }, [commitChange, showToast]);

  /* ===== 拖曳 ===== */
  const handleDragStart = useCallback((e, id) => { e.stopPropagation(); try { e.dataTransfer.setData('text/plain', id); setDragInfo({ draggedId: id, overId: null, position: null }); } catch {} }, []);
  const handleDragOver = useCallback((e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (id === dragInfo.draggedId) return;
    try { const r = e.currentTarget.getBoundingClientRect(); const y = e.clientY - r.top; let p = 'inside'; if (y < r.height * 0.25) p = 'top'; else if (y > r.height * 0.75) p = 'bottom'; setDragInfo(pr => pr.overId === id && pr.position === p ? pr : { ...pr, overId: id, position: p }); } catch {}
  }, [dragInfo.draggedId]);
  const handleDrop = useCallback((e, tid) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const did = e.dataTransfer.getData('text/plain'); const { position } = dragInfo;
      setDragInfo({ draggedId: null, overId: null, position: null });
      if (!did || did === tid) return;
      let eid = null;
      commitChange(t => { const c = deepCloneKepanTree(t); let dn; const rm = (ns) => { const i = ns.findIndex(n => n.id === did); if (i !== -1) { dn = ns.splice(i, 1)[0]; return true; } for (const n of ns) { if (n.children && rm(n.children)) return true; } return false; }; if (!rm(c) || !dn) return t; const ins = (ns) => { const i = ns.findIndex(n => n.id === tid); if (i !== -1) { if (position === 'top') ns.splice(i, 0, dn); else if (position === 'bottom') ns.splice(i + 1, 0, dn); else { if (!ns[i].children) ns[i].children = []; ns[i].children.unshift(dn); eid = tid; } return true; } for (const n of ns) { if (n.children && ins(n.children)) return true; } return false; }; return ins(c) ? c : t; });
      if (eid) setExpandedTreeNodes(p => new Set(p).add(eid));
    } catch { setDragInfo({ draggedId: null, overId: null, position: null }); }
  }, [dragInfo, commitChange]);

  /* ===== AI 功能 ===== */
  const generateAISkeleton = useCallback(async (nid) => {
    const node = findNodeInKepanTree(kepanTree, nid);
    if (!node?.content) return;
    setIsAILoadingId(nid);
    const msgs = [{ role: 'user', parts: [{ text: `原文內容：\n${node.content}` }] }];
    const text = await callAIChat(msgs, settings.aiPrompt, settings, envApiKey);
    if (text) {
      try {
        const clean = extractJsonFromText(text);
        const gen = JSON.parse(clean);
        if (!Array.isArray(gen)) throw new Error('非陣列');
        commitChange(t => { const c = deepCloneKepanTree(t); const n = findNodeInKepanTree(c, nid); if (n) { n.content = ''; n.children = [...gen.map(g => ({ id: generateUniqueId(), title: String(g.title || '新科判'), content: String(g.content || ''), note: String(g.note || ''), children: [] })), ...(n.children || [])]; return c; } return t; });
        setExpandedTreeNodes(p => new Set(p).add(nid));
        showToast('AI 拆分完成！');
      } catch (e) {
        showToast(`AI 回傳格式解析失敗：${e.message}。摘要：${text.substring(0, 120)}`);
      }
    }
    setIsAILoadingId(null);
  }, [kepanTree, settings, commitChange, showToast]);

  const explainText = useCallback(async (sel, ctx) => {
    const prompt = `請用淺顯易懂的現代白話文進行「消文解義」。\n\n【原文段落脈絡】：\n${ctx}\n\n【使用者欲請教的字句】：\n「${sel}」\n\n請先給出「白話直譯」，再用一個「現代生活中的簡單例子」輔助說明。請確保解釋符合上下文的語境。`;
    setExplainData({ contextText: sel, fullContext: ctx, messages: [{ role: 'user', parts: [{ text: prompt }] }], loading: true });
    const r = await callAIChat([{ role: 'user', parts: [{ text: prompt }] }], EXPLAIN_SYSTEM_PROMPT, settings, envApiKey);
    if (r) setExplainData(p => ({ ...p, messages: [...p.messages, { role: 'model', parts: [{ text: r }] }], loading: false }));
    else { setExplainData(null); showToast('呼叫 AI 失敗，請檢查 API 金鑰設定。'); }
  }, [settings, showToast]);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || !explainData || explainData.loading) return;
    const um = { role: 'user', parts: [{ text: chatInput }] };
    const up = [...explainData.messages, um];
    setExplainData(p => ({ ...p, messages: up, loading: true })); setChatInput('');
    const r = await callAIChat(up, EXPLAIN_FOLLOWUP_PROMPT, settings, envApiKey);
    if (r) setExplainData(p => ({ ...p, messages: [...p.messages, { role: 'model', parts: [{ text: r }] }], loading: false }));
    else setExplainData(p => ({ ...p, loading: false }));
  }, [chatInput, explainData, settings]);

  const openQuoteCard = useCallback(n => { setQuoteCardNode(n); setAiBgImage(null); }, []);
  const generateCardBackground = useCallback(async () => {
    if (!quoteCardNode) return; setIsGeneratingBg(true);
    try {
      const concept = quoteCardNode.content || quoteCardNode.title || 'Zen';
      const img = await callImagenAPI(`A highly aesthetic, serene, minimalist background for a spiritual quote card. Soft lighting, empty space, elegant texture. Concept: ${concept.substring(0, 300)}`, settings, envApiKey);
      if (img) { setAiBgImage(img); showToast('意境背景繪製完成！'); }
    } catch (e) { showToast(`背景生成失敗: ${e.message}`); } finally { setIsGeneratingBg(false); }
  }, [quoteCardNode, settings, showToast]);
  const downloadQuoteCard = useCallback(async () => {
    const el = document.getElementById('quote-card-element'); if (!el) return;
    try { const h2c = window.html2canvas; if (!h2c) { showToast('圖片渲染引擎載入中，請稍候...'); return; } const cv = await h2c(el, { scale: 2, backgroundColor: null, useCORS: true }); const a = document.createElement('a'); a.download = `法語金句_${Date.now()}.png`; a.href = cv.toDataURL('image/png'); a.click(); showToast('圖片已成功下載至您的裝置！'); } catch { showToast('圖片生成失敗，建議使用系統截圖功能。'); }
  }, [showToast]);

  /* ===== 檔案操作 ===== */
  const handleNewFile = useCallback(() => {
    if (window.confirm('確定要建立新檔案嗎？目前未存檔的變更將會遺失。')) {
      reset(INITIAL_EMPTY_KEPAN_TREE); setFocusId(null); setExpandedTreeNodes(new Set(['root-1'])); setExpandedContentNodes(new Set()); setExpandedNoteNodes(new Set()); showToast('已建立乾淨的新檔案。');
    }
  }, [reset, showToast]);

  const handleExportJSON = useCallback(() => {
    try { const t = kepanTree[0]?.title || '科判資料'; const b = new Blob([JSON.stringify(kepanTree, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${t}.json`; a.click(); URL.revokeObjectURL(u); } catch { showToast('匯出 JSON 失敗'); }
  }, [kepanTree, showToast]);

  const handleExportMarkdown = useCallback(() => {
    try { const t = kepanTree[0]?.title || '科判筆記'; const md = treeToMarkdown(kepanTree, { includeFrontmatter: true, rootTitle: t }); const b = new Blob([md], { type: 'text/markdown;charset=utf-8' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${t}.md`; a.click(); URL.revokeObjectURL(u); showToast('Markdown 已匯出，可拖入 Obsidian 使用！'); } catch { showToast('匯出 Markdown 失敗'); }
  }, [kepanTree, showToast]);

  const handleCopyMarkdown = useCallback(async () => {
    const md = convertToBulletMarkdown(kepanTree);
    try { await navigator.clipboard.writeText(md); } catch { const ta = document.createElement('textarea'); ta.value = md; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    showToast('Markdown 已複製到剪貼簿，請至 Notion 貼上！');
  }, [kepanTree, showToast]);

  const handleImportFile = useCallback((e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target.result;
        if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
          const parsed = markdownToTree(content);
          if (parsed.length > 0) { reset(parsed); setFocusId(null); setExpandedTreeNodes(new Set([parsed[0]?.id].filter(Boolean))); showToast('Markdown 檔案匯入成功！'); }
          else showToast('無法從 Markdown 解析出科判結構，請確認格式。');
        } else {
          const data = JSON.parse(content);
          if (!Array.isArray(data)) throw new Error('無效');
          reset(data); setFocusId(null); setExpandedTreeNodes(new Set([data[0]?.id].filter(Boolean))); showToast('JSON 檔案匯入成功！');
        }
      } catch { showToast('檔案格式不正確，請匯入有效的 JSON 或 Markdown 檔案。'); }
    };
    reader.readAsText(file); e.target.value = '';
  }, [reset, showToast]);

  const handleSettingsChange = useCallback(p => setSettings(pr => ({ ...pr, ...p })), []);
  const saveSettingsForm = useCallback(() => { setShowSettings(false); showToast('設定已儲存'); }, [showToast]);
  const handleSelectTheme = useCallback(k => { setSettings(pr => ({ ...pr, themeKey: k })); showToast(`主題切換：${THEMES[k].name}`); }, [showToast]);

  /* ===== 新功能：搜尋、展開/收合、閱讀模式、選取建節點 ===== */
  const handleSearchChange = useCallback((q) => {
    setSearchQuery(q);
    if (q.trim()) {
      const results = searchTreeNodes(kepanTree, q.trim());
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [kepanTree]);
  const [searchResults, setSearchResults] = useState([]);

  const handleSearchSelect = useCallback((nodeId) => {
    setFocusId(nodeId);
    // 展開路徑上的所有節點
    const path = findPathInKepanTree(kepanTree, nodeId);
    if (path) {
      setExpandedTreeNodes(prev => {
        const next = new Set(prev);
        path.forEach(p => next.add(p.id));
        return next;
      });
    }
  }, [kepanTree]);

  const expandAll = useCallback(() => {
    setExpandedTreeNodes(flattenTreeIds(kepanTree));
  }, [kepanTree]);

  const collapseAll = useCallback(() => {
    setExpandedTreeNodes(new Set());
  }, []);

  const createNodeFromSelection = useCallback((parentId, selectedText) => {
    if (!selectedText.trim()) return;
    const nn = { id: generateUniqueId(), title: '選取片段', content: selectedText, note: '', children: [] };
    commitChange(t => {
      const c = deepCloneKepanTree(t);
      const n = findNodeInKepanTree(c, parentId);
      if (n) {
        if (!n.children) n.children = [];
        n.children.unshift(nn);
        return c;
      }
      return t;
    });
    setExpandedTreeNodes(p => new Set(p).add(parentId));
    showToast('已從選取文字建立子節點');
  }, [commitChange, showToast]);

  /* ===== AI 整文分析 ===== */
  const collectAllText = useCallback((nodes) => {
    let parts = [];
    for (const n of nodes) {
      const t = (n.title || '').trim();
      const c = (n.content || '').trim();
      if (t || c) parts.push({ title: t, content: c || t });
      if (n.children?.length) parts = parts.concat(collectAllText(n.children));
    }
    return parts;
  }, []);

  const handleFullAnalysis = useCallback(async () => {
    const sections = collectAllText(kepanTree);
    if (sections.length === 0) { showToast('檔案中無內容可供分析'); return; }

    const documentText = sections.map(s =>
      s.title ? `【${s.title}】\n${s.content || ''}` : s.content
    ).join('\n\n').substring(0, 15000);

    setIsAILoadingId('__full_analysis__');

    const msgs = [{ role: 'user', parts: [{ text: documentText }] }];
    const text = await callAIChat(msgs, FULL_ANALYSIS_SYSTEM_PROMPT, settings, envApiKey);
    if (text) {
      try {
        const clean = extractJsonFromText(text);
        const parsed = JSON.parse(clean);
        if (parsed.summary || parsed.goldenSentences || parsed.tags) {
          // 建立分析節點（摘要＋標籤）
          const analysisId = generateUniqueId();
          const analysisNode = {
            id: analysisId, title: '📋 AI 整文分析', content: '', note: '',
            children: [
              { id: generateUniqueId(), title: '📝 全文摘要', content: parsed.summary || '', note: '', children: [] },
            ],
          };
          if (parsed.tags?.length > 0) {
            analysisNode.children.push({
              id: generateUniqueId(), title: '🏷 建議標籤',
              content: parsed.tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' '),
              note: '', children: [],
            });
          }

          // 在同一筆 commitChange 中：插入分析節點 + 金句標底線
          commitChange(t => {
            const c = deepCloneKepanTree(t);
            if (!c[0]) return t;

            // ——— 金句標底線：在原文中以 ==…== 標記（模糊匹配） ———
            if (parsed.goldenSentences?.length > 0) {
              const visit = (nodes) => {
                for (const n of nodes) {
                  if (n.content) {
                    for (const gs of parsed.goldenSentences) {
                      if (!gs.text) continue;
                      n.content = findAndMarkSentence(n.content, gs.text);
                    }
                  }
                  if (n.children) visit(n.children);
                }
              };
              visit(c);
            }

            // ——— 插入分析節點至根節點 siblings 的最前方（全文開頭） ———
            c.unshift(analysisNode);
            return c;
          });

          setExpandedTreeNodes(p => new Set(p).add(analysisId));
          const gsCount = parsed.goldenSentences?.length || 0;
          showToast(`AI 分析完成！摘要＋標籤已置頂，${gsCount} 句金句已標示。`);
        } else throw new Error('缺少必要欄位');
      } catch (e) {
        showToast(`AI 分析格式解析失敗：${e.message}。原始回覆：${text.substring(0, 150)}`);
      }
    } else {
      showToast('AI 無回應，請檢查 API 金鑰設定。');
    }
    setIsAILoadingId(null);
  }, [kepanTree, settings, collectAllText, commitChange, showToast]);

  const commonActions = {
    updateKepanNode, addSiblingKepanNode, indentKepanNode, outdentKepanNode,
    moveNode, deleteKepanNode, mergeUpKepanNode, splitTextToSiblingKepanNode,
    splitTextToChildKepanNode, setFocusId, setDeleteMenuId, toggleTree,
    toggleContent, toggleNote, generateAISkeleton, handleDragStart,
    handleDragOver, handleDrop, openQuoteCard, explainText,
    createNodeFromSelection,
  };

  const splitContentRender = (nodes) => nodes?.map(n => (
    <div key={`split-${n.id}`} id={`split-content-${n.id}`} className="mb-6 group transition-colors duration-500 rounded p-2">
      <h3 className={`font-bold text-lg mb-2 ${themeConfig.bold}`}>{String(n.title || '')}</h3>
      {n.content && <div className={`leading-relaxed whitespace-pre-wrap ${themeConfig.text}`} dangerouslySetInnerHTML={{ __html: formatRichText(n.content, themeConfig) }} />}
      {n.note && <div className={`mt-2 p-3 text-sm rounded-lg border-l-4 shadow-sm ${themeConfig.noteBg}`}><div className="font-bold opacity-70 mb-1 flex items-center gap-1">📖 札記</div><div dangerouslySetInnerHTML={{ __html: formatRichText(n.note, themeConfig) }} /></div>}
      {n.children?.length > 0 && <div className={`mt-4 pl-4 border-l-2 ${themeConfig.border}`}>{splitContentRender(n.children)}</div>}
    </div>
  ));

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeConfig.bg} ${themeConfig.text}`} style={{ fontFamily: FONT_STYLES[settings.fontFamily] || FONT_STYLES['font-sans'] }}>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} isDark={isDark} />
      <LoadingOverlay visible={!!isAILoadingId} isDark={isDark} />
      <Header mode={mode} onModeChange={setMode} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} onOpenSettings={() => setShowSettings(true)} onNewFile={handleNewFile} onImportFile={handleImportFile} onCopyMarkdown={handleCopyMarkdown} onExportJSON={handleExportJSON} onExportMarkdown={handleExportMarkdown} isDark={isDark} themeConfig={themeConfig} isThemeMenuOpen={isThemeMenuOpen} onToggleThemeMenu={() => setIsThemeMenuOpen(v => !v)} onSelectTheme={handleSelectTheme} THEMES={THEMES} activeThemeKey={settings.themeKey} onExpandAll={expandAll} onCollapseAll={collapseAll} onOpenShortcuts={() => setShowShortcuts(true)} searchQuery={searchQuery} onSearchChange={handleSearchChange} searchResults={searchResults} onSearchSelect={handleSearchSelect} onAnalyze={handleFullAnalysis} />
      <Breadcrumbs path={currentBreadcrumbPath} activeDropdownId={activeBreadcrumbDropdown} onSetFocus={setFocusId} onToggleDropdown={setActiveBreadcrumbDropdown} onClearFocus={handleClearFocus} themeConfig={themeConfig} />
      <main className="flex-1 overflow-auto p-4 md:p-8 flex justify-center" onClick={() => { setActiveBreadcrumbDropdown(null); setIsThemeMenuOpen(false); }}>
        {mode === 'map' ? (
          <MapMode nodes={currentRenderData} themeConfig={themeConfig} />
        ) : mode === 'split' ? (
          <div className="w-full max-w-7xl flex gap-6 h-[80vh]">
            <div className={`w-1/3 overflow-y-auto p-6 rounded-lg shadow-sm border ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
              {currentRenderData.map(rn => <TreeNode key={rn.id} kepanNode={rn} depth={0} mode={mode} themeConfig={themeConfig} apiKeys={settings.apiKeys} expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes} deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={commonActions} showToast={showToast} searchQuery={searchQuery} />)}
            </div>
            <div className={`w-2/3 overflow-y-auto p-8 rounded-lg shadow-sm border ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>{splitContentRender(currentRenderData)}</div>
          </div>
        ) : (
          <div className={`w-full max-w-4xl p-8 rounded-lg shadow-sm border min-h-[80vh] ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
            {currentRenderData.map(rn => <TreeNode key={rn.id} kepanNode={rn} depth={0} mode={mode} themeConfig={themeConfig} apiKeys={settings.apiKeys} expandedTreeNodes={expandedTreeNodes} expandedContentNodes={expandedContentNodes} expandedNoteNodes={expandedNoteNodes} deleteMenuId={deleteMenuId} dragInfo={dragInfo} isAILoadingId={isAILoadingId} actions={commonActions} showToast={showToast} />)}
          </div>
        )}
      </main>
      <SettingsPanel visible={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSettingsChange={handleSettingsChange} onSave={saveSettingsForm} themeConfig={themeConfig} isDark={isDark} />
      <ExplainModal explainData={explainData} onClose={() => setExplainData(null)} chatInput={chatInput} onChatInputChange={setChatInput} onSendChat={handleSendChat} isDark={isDark} themeConfig={themeConfig} />
      <QuoteCardModal quoteCardNode={quoteCardNode} aiBgImage={aiBgImage} isGeneratingBg={isGeneratingBg} onClose={() => { setQuoteCardNode(null); setAiBgImage(null); }} onDownload={downloadQuoteCard} onGenerateBg={generateCardBackground} themeConfig={themeConfig} settingsThemeKey={settings.themeKey} />
      <ShortcutModal visible={showShortcuts} onClose={() => setShowShortcuts(false)} themeConfig={themeConfig} isDark={isDark} />
    </div>
  );
}
