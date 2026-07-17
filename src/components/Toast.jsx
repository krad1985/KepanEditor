import React from 'react';
import { X } from 'lucide-react';

const Toast = ({ message, onClose, isDark }) => {
  if (!message) return null;
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded shadow-lg z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in ${isDark ? 'bg-stone-200 text-stone-900' : 'bg-stone-800 text-white'}`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100"><X size={16}/></button>
    </div>
  );
};

export default Toast;
