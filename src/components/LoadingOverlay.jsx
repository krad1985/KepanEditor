import React from 'react';
import { Wand2 } from 'lucide-react';

const LoadingOverlay = ({ visible, isDark }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-stone-900/40 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className={`flex flex-col items-center p-8 rounded-2xl shadow-2xl ${isDark ? 'bg-stone-800 text-teal-300 border border-stone-700' : 'bg-white text-teal-700 border border-stone-100'}`}>
        <Wand2 size={40} className="animate-pulse mb-4 text-purple-500" />
        <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-stone-200' : 'text-stone-800'}`}>魔法棒運作中</h3>
        <p className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>AI 正在深入解析文義並為您拆分科判骨架，請稍候...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
