import React from 'react';

const MapMode = ({ nodes, themeConfig }) => {
  const render = (items) => (
    <div className="flex flex-col gap-2">
      {items.map(node => (
        <div key={`map-${node.id}`} className="flex flex-col">
          <div className={`py-1 px-2 rounded font-medium flex items-center gap-2 ${themeConfig.panelBg} ${themeConfig.bold}`}>
            <div className={`w-2 h-2 rounded-full ${themeConfig.bold.split(' ')[0].replace('text-', 'bg-')}`}></div>
            {String(node.title || '(未命名節點)')}
          </div>
          {node.children?.length > 0 && <div className={`ml-4 pl-4 border-l ${themeConfig.border} mt-2`}>{render(node.children)}</div>}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`w-full max-w-4xl p-8 rounded-lg shadow-sm border min-h-[80vh] ${themeConfig.panelBg} ${themeConfig.panelBorder}`}>
      <h2 className={`text-2xl font-bold mb-8 text-center tracking-widest ${themeConfig.bold}`}>總體骨架鳥瞰圖</h2>
      {render(nodes)}
    </div>
  );
};

export default MapMode;
