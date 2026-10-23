import React from 'react';
import { Sparkles, AlertCircle, TrendingUp, BarChart2, Award } from 'lucide-react';
import type { Participant, VoteStats } from '../types';
import { calculateVoteStats } from '../utils/stats';

interface StatsPanelProps {
  participants: Participant[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ participants }) => {
  const stats: VoteStats = calculateVoteStats(participants);

  if (stats.totalVoted === 0) return null;

  const isConsensus = stats.agreementPercentage === 100 && stats.totalVoted > 1;
  const hasDivergence = stats.min !== null && stats.max !== null && stats.max - stats.min > 3;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white/80 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 space-y-5 backdrop-blur-sm shadow-sm dark:shadow-none transition-colors duration-150">
        
        {/* Consensus or Divergence notice */}
        {isConsensus ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-zinc-900/70 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold">Consenso absoluto ({stats.mode} pt)</span>
              <span className="text-zinc-600 dark:text-zinc-400 font-light ml-1.5 hidden sm:inline">
                Todos los participantes han estimado el mismo valor.
              </span>
            </div>
          </div>
        ) : hasDivergence ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-zinc-900/70 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold">Divergencia ({stats.min} pt vs {stats.max} pt)</span>
              <span className="text-zinc-600 dark:text-zinc-400 font-light ml-1.5 hidden sm:inline">
                Diferencia apreciable de criterio. Momento para intercambiar argumentos.
              </span>
            </div>
          </div>
        ) : null}

        {/* Minimalist 4 Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Average */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/70 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider">Promedio</span>
              <TrendingUp className="w-3.5 h-3.5 stroke-[1.5]" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.average !== null ? `${stats.average}` : '—'}
            </div>
            <span className="text-[10px] text-zinc-500 font-light mt-0.5">Media aritmética</span>
          </div>

          {/* Median */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/70 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider">Mediana</span>
              <BarChart2 className="w-3.5 h-3.5 stroke-[1.5]" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.median !== null ? `${stats.median}` : '—'}
            </div>
            <span className="text-[10px] text-zinc-500 font-light mt-0.5">Punto central</span>
          </div>

          {/* Mode */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/70 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider">Moda</span>
              <Award className="w-3.5 h-3.5 stroke-[1.5]" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.mode || '—'}
            </div>
            <span className="text-[10px] text-zinc-500 font-light mt-0.5">Más frecuente</span>
          </div>

          {/* Agreement % */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/70 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider">Acuerdo</span>
              <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.agreementPercentage}%
            </div>
            <span className="text-[10px] text-zinc-500 font-light mt-0.5">{stats.totalVoted} votos</span>
          </div>
        </div>

        {/* Minimalist Distribution */}
        <div className="space-y-2.5 pt-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block">
            Distribución de estimaciones
          </span>
          <div className="space-y-2">
            {Object.entries(stats.distribution).map(([vote, count]) => {
              const pct = Math.round((count / stats.totalVoted) * 100);
              const isMode = vote === stats.mode;

              return (
                <div key={vote} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-light text-zinc-700 dark:text-zinc-300">
                    <span className="flex items-center gap-2">
                      <span className={`w-6 text-center py-0.5 rounded font-mono text-[11px] ${
                        isMode
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                      }`}>
                        {vote}
                      </span>
                      <span>
                        {count} {count === 1 ? 'voto' : 'votos'}
                      </span>
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500 text-[11px]">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-950 overflow-hidden border border-zinc-200/80 dark:border-zinc-800/40">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isMode ? 'bg-zinc-900 dark:bg-zinc-200' : 'bg-zinc-400 dark:bg-zinc-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
