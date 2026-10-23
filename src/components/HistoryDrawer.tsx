import { useState } from 'react';
import { X, History, Copy, Check, Calendar } from 'lucide-react';
import type { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  history: HistoryItem[];
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  history,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleExportMarkdown = () => {
    if (history.length === 0) return;

    let md = '# Resumen de Sesión - Scrum Poker\n\n';
    md += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    md += '| Tarea / Historia | Promedio | Acuerdo | Votos |\n';
    md += '| :--- | :--- | :--- | :--- |\n';

    for (const item of history) {
      const votesStr = item.votes.map((v) => `${v.name}: ${v.vote}`).join(', ');
      md += `| ${item.storyTitle} | ${item.average !== null ? item.average + ' pt' : '—'} | ${item.agreementPercentage}% | ${votesStr} |\n`;
    }

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-sm bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400 stroke-[1.5]" />
            <h2 className="text-sm font-semibold text-zinc-100">Historial de estimaciones</h2>
            <span className="text-[11px] text-zinc-500 font-light">({history.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Action */}
        {history.length > 0 && (
          <div className="px-4 py-2.5 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-light">Exportar resumen:</span>
            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 stroke-[1.5]" />
                  <span>Copiar Markdown</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <History className="w-8 h-8 stroke-[1.2] mb-2 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-400">Sin estimaciones todavía</p>
              <p className="text-[11px] text-zinc-600 font-light mt-0.5 max-w-xs">
                Al desvelar las cartas de cada ronda se añadirá un registro aquí.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-medium text-zinc-200 line-clamp-2">
                    {item.storyTitle}
                  </h3>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-bold text-zinc-100">
                      {item.average !== null ? `${item.average} pt` : '—'}
                    </span>
                    <span className="text-[9px] text-zinc-500">
                      {item.agreementPercentage}% acuerdo
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {item.votes.map((v, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400"
                    >
                      <span>{v.name}:</span>
                      <strong className="text-zinc-200 font-mono">{v.vote}</strong>
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-900 font-light">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>{item.votes.length} votos</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
