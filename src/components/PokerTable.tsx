import React from 'react';
import { Eye, RotateCcw, Crown, CheckCircle2, Coffee, HelpCircle, Loader2 } from 'lucide-react';
import type { RoomState } from '../types';

interface PokerTableProps {
  roomState: RoomState;
  currentUserId?: string;
  onRevealVotes: () => void;
  onResetVotes: () => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  roomState,
  onRevealVotes,
  onResetVotes,
}) => {
  const voters = roomState.participants.filter((p) => !p.isSpectator);
  const votedCount = voters.filter((p) => p.hasVoted).length;
  const allVoted = voters.length > 0 && votedCount === voters.length;

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-4">
      {/* The Table Outer Container */}
      <div className="w-full max-w-5xl relative">
        {/* The Poker Felt Oval Surface */}
        <div className="w-full min-h-[380px] sm:min-h-[420px] rounded-[2.5rem] bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 border-2 border-indigo-500/20 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] backdrop-blur-xl p-6 sm:p-10 flex flex-col items-center justify-between relative overflow-hidden">
          
          {/* Subtle agile table watermark / grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent pointer-events-none" />

          {/* Table Center: Status & Primary Reveal/Reset Actions */}
          <div className="my-auto z-10 flex flex-col items-center text-center max-w-md py-4">
            {!roomState.isRevealed ? (
              <div className="flex flex-col items-center gap-3">
                {/* Vote Counter Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-300 shadow-inner">
                  {voters.length === 0 ? (
                    <span>Esperando votantes...</span>
                  ) : allVoted ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ¡Todos han votado ({votedCount}/{voters.length})!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Han votado {votedCount} de {voters.length}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {allVoted ? '¿Listos para desvelar?' : 'Votaciones en curso'}
                </h2>
                <p className="text-xs text-slate-400 max-w-xs">
                  Las estimaciones se mantienen ocultas hasta que alguien pulse revelar.
                </p>

                {/* Big Reveal Button */}
                <button
                  onClick={onRevealVotes}
                  disabled={votedCount === 0}
                  className={`mt-2 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all shadow-xl cursor-pointer ${
                    votedCount > 0
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600 text-white shadow-indigo-500/30 hover:scale-105 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  <span>Revelar Cartas</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cartas desveladas</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Resultados de la estimación
                </h2>
                <p className="text-xs text-slate-400 max-w-xs">
                  Revisa las estadísticas abajo y comienza una nueva ronda cuando estéis listos.
                </p>

                {/* Big Reset Button */}
                <button
                  onClick={onResetVotes}
                  className="mt-2 flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Nueva Votación</span>
                </button>
              </div>
            )}
          </div>

          {/* Participants Seats Grid around the table */}
          <div className="w-full z-10 pt-4">
            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7">
              {roomState.participants.map((participant) => {
                const isHost = participant.id === roomState.hostId;

                return (
                  <div
                    key={participant.id}
                    className="flex flex-col items-center gap-2 transition-transform duration-300 hover:scale-105"
                  >
                    {/* The Card Component */}
                    <div className="perspective-1000">
                      {participant.isSpectator ? (
                        /* Spectator Slot */
                        <div className="w-16 h-24 sm:w-18 sm:h-28 rounded-2xl border-2 border-dashed border-slate-700/60 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500">
                          <Eye className="w-5 h-5 mb-1" />
                          <span className="text-[10px] uppercase font-semibold">Mira</span>
                        </div>
                      ) : !participant.hasVoted ? (
                        /* Has Not Voted Yet Slot */
                        <div className="w-16 h-24 sm:w-18 sm:h-28 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 gap-1.5 shadow-inner">
                          <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                          <span className="text-[10px] font-medium tracking-tight">Pensando</span>
                        </div>
                      ) : !roomState.isRevealed ? (
                        /* Voted but HIDDEN: Card Face Down */
                        <div className="w-16 h-24 sm:w-18 sm:h-28 rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-900 to-purple-950 border-2 border-indigo-400/50 shadow-lg shadow-indigo-500/20 flex flex-col items-center justify-between p-2 relative overflow-hidden group">
                          {/* Card pattern */}
                          <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:10px_10px] opacity-30" />
                          <div className="w-full flex justify-between text-[10px] font-bold text-indigo-300">
                            <span>SP</span>
                            <span>SP</span>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200 text-xs font-black shadow-inner">
                            ✓
                          </div>
                          <div className="w-full flex justify-between text-[10px] font-bold text-indigo-300 rotate-180">
                            <span>SP</span>
                            <span>SP</span>
                          </div>
                        </div>
                      ) : (
                        /* Voted and REVEALED: Card Face UP */
                        <div className="w-16 h-24 sm:w-18 sm:h-28 rounded-2xl bg-gradient-to-b from-white to-slate-100 text-slate-900 border-2 border-indigo-400 shadow-xl shadow-indigo-500/20 flex flex-col items-center justify-between p-2 animate-in flip-in-y duration-500">
                          <div className="w-full flex justify-start text-[11px] font-black text-indigo-600">
                            {participant.vote}
                          </div>
                          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">
                            {participant.vote === '☕' ? (
                              <Coffee className="w-7 h-7 text-amber-600" />
                            ) : participant.vote === '?' ? (
                              <HelpCircle className="w-7 h-7 text-slate-600" />
                            ) : (
                              participant.vote
                            )}
                          </div>
                          <div className="w-full flex justify-end text-[11px] font-black text-indigo-600 rotate-180">
                            {participant.vote}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Participant Avatar & Name */}
                    <div className="flex flex-col items-center text-center max-w-[90px]">
                      <div className="relative">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-slate-900"
                          style={{ backgroundColor: participant.avatarColor }}
                        >
                          {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        {isHost && (
                          <div
                            title="Anfitrión de la sala"
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow"
                          >
                            <Crown className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-200 truncate w-full mt-1">
                        {participant.name}
                      </span>
                      {participant.isSpectator && (
                        <span className="text-[10px] text-slate-500 font-medium leading-none">
                          Observador
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
