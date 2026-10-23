import React from 'react';
import { Sparkles, AlertTriangle, TrendingUp, BarChart2, Award } from 'lucide-react';
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
    <div className="w-full max-w-4xl mx-auto px-4 py-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md space-y-6">
        
        {/* Consensus / Divergence banner */}
        {isConsensus ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-600/40 text-emerald-200 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-emerald-300">
                ¡Consenso Unánime ({stats.mode} pt)!
              </h3>
              <p className="text-xs text-emerald-400/80">
                Todos los miembros del equipo han votado exactamente lo mismo. ¡Excelente alineación!
              </p>
            </div>
          </div>
        ) : hasDivergence ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-950/50 border border-amber-600/40 text-amber-200 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-300">
                Divergencia detectada ({stats.min} pt vs {stats.max} pt)
              </h3>
              <p className="text-xs text-amber-400/80">
                Hay una diferencia notable de criterios. Es buen momento para que los votos extremos expliquen qué complejidad o simplicidad ven.
              </p>
            </div>
          </div>
        ) : null}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Average */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Promedio</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.average !== null ? `${stats.average}` : '—'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1">Media aritmética</span>
          </div>

          {/* Median */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Mediana</span>
              <BarChart2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.median !== null ? `${stats.median}` : '—'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1">Punto intermedio</span>
          </div>

          {/* Mode */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Moda</span>
              <Award className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.mode || '—'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1">Valor más frecuente</span>
          </div>

          {/* Agreement % */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Consenso</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {stats.agreementPercentage}%
            </div>
            <span className="text-[11px] text-slate-500 mt-1">{stats.totalVoted} votos emitidos</span>
          </div>
        </div>

        {/* Vote Distribution Bars */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Distribución de Votos
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.distribution).map(([vote, count]) => {
              const pct = Math.round((count / stats.totalVoted) * 100);
              const isMode = vote === stats.mode;

              return (
                <div key={vote} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className={`w-7 text-center px-1.5 py-0.5 rounded-md font-mono ${isMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        {vote}
                      </span>
                      <span>
                        {count} {count === 1 ? 'voto' : 'votos'}
                      </span>
                    </span>
                    <span className="text-slate-400">{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isMode
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                          : 'bg-slate-600'
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
