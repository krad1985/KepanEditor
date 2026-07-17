import React from 'react';
import { ChevronRight, Home, ChevronDown } from 'lucide-react';

const Breadcrumbs = ({ path, activeDropdownId, onSetFocus, onToggleDropdown, onClearFocus, themeConfig }) => {
  if (!path?.length) return null;
  return (
    <div className={`border-b px-6 py-2 flex flex-wrap items-center gap-2 text-sm sticky top-[60px] z-10 ${themeConfig.panelBg} ${themeConfig.border}`}>
      <button onClick={onClearFocus} className={`hover:opacity-80 flex items-center gap-1 font-medium ${themeConfig.highlight} bg-opacity-30 px-2 py-1 rounded`}><Home size={14} /> 根目錄</button>
      {path.map((crumb, idx) => {
        const opts = crumb.children || [];
        const open = activeDropdownId === crumb.id;
        const last = idx === path.length - 1;
        return (
          <React.Fragment key={crumb.id}>
            <ChevronRight size={14} className="opacity-40 mx-1" />
            <div className={`relative flex items-center rounded ${themeConfig.highlight} bg-opacity-20`}>
              <button onClick={() => onSetFocus(crumb.id)} className={`hover:opacity-80 px-2 py-1 transition-colors rounded-l ${last ? `font-bold bg-opacity-40 ${themeConfig.highlight}` : ''}`}>{String(crumb.title || '(無標題)')}</button>
              {opts.length > 0 && (
                <button className="p-1 px-1.5 rounded-r transition-colors opacity-70 hover:opacity-100" onClick={e => { e.stopPropagation(); onToggleDropdown(open ? null : crumb.id); }}><ChevronDown size={14} /></button>
              )}
              {open && opts.length > 0 && (
                <div className={`absolute top-full left-0 mt-1 min-w-[200px] rounded-md shadow-lg border py-1 z-50 ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
                  {opts.map(o => (
                    <button key={o.id} className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${themeConfig.btnHover} ${themeConfig.bold}`}
                      onClick={e => { e.stopPropagation(); onSetFocus(o.id); onToggleDropdown(null); }}>{String(o.title || '(無標題)')}</button>
                  ))}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Breadcrumbs;
