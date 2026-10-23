import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none font-sans">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-200 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 transition-colors duration-150"
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[1.8]" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 stroke-[1.8]" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 stroke-[1.8]" />}
            <span className="text-xs font-light">{toast.text}</span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
