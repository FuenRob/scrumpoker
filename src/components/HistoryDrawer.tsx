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

    let md = '# Resumen de Sesión de Scrum Poker\n\n';
    md += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    md += '| Tarea / Historia | Promedio | Consenso | Votos |\n';
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Historial de Sesión</h2>
              <p className="text-xs text-slate-400">{history.length} estimaciones realizadas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Action */}
        {history.length > 0 && (
          <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Exportar estimaciones:</span>
            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado en Markdown</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar para Jira / Notion</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <History className="w-12 h-12 stroke-[1.5] mb-3 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">Aún no hay historias estimadas</p>
              <p className="text-xs mt-1 max-w-xs">
                Cuando todos voten y pulses en "Revelar Cartas", se guardará un registro de cada estimación aquí.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white line-clamp-2">
                    {item.storyTitle}
                  </h3>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-sm font-black text-indigo-400">
                      {item.average !== null ? `${item.average} pt` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.agreementPercentage}% acuerdo
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.votes.map((v, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300"
                    >
                      <span className="text-slate-400">{v.name}:</span>
                      <strong className="text-white font-mono">{v.vote}</strong>
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>{item.votes.length} participantes</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
