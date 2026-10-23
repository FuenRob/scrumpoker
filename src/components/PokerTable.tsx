import React from 'react';
import { Eye, RotateCcw, Crown, CheckCircle2, Coffee, HelpCircle, Loader2, Lock } from 'lucide-react';
import type { RoomState } from '../types';

interface PokerTableProps {
  roomState: RoomState;
  currentUserId?: string;
  currentUserName?: string;
  selectedCard?: string | null;
  onRevealVotes: () => void;
  onResetVotes: () => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({
  roomState,
  currentUserId,
  currentUserName,
  selectedCard,
  onRevealVotes,
  onResetVotes,
}) => {
  const voters = roomState.participants.filter((p) => !p.isSpectator);
  const votedCount = voters.filter((p) => p.hasVoted).length;
  const allVoted = voters.length > 0 && votedCount === voters.length;

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-4 font-sans">
      <div className="w-full max-w-4xl relative">
        {/* Minimalist Felt Table */}
        <div className="w-full min-h-[360px] sm:min-h-[400px] rounded-3xl bg-white/70 dark:bg-zinc-900/30 border border-zinc-200/90 dark:border-zinc-800/80 p-6 sm:p-10 flex flex-col items-center justify-between relative overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none transition-colors duration-150">
          
          {/* Subtle minimal center accent */}
          <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-44 rounded-full border border-zinc-200/80 dark:border-zinc-800/40 pointer-events-none" />

          {/* Table Center: Actions & Status */}
          <div className="my-auto z-10 flex flex-col items-center text-center max-w-md py-4">
            {!roomState.isRevealed ? (
              <div className="flex flex-col items-center gap-2.5">
                {/* Counter status pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  {voters.length === 0 ? (
                    <span>Esperando participantes...</span>
                  ) : allVoted ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[1.8]" />
                      Todos han votado ({votedCount}/{voters.length})
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Han votado {votedCount} de {voters.length}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-normal text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {allVoted ? '¿Revelar estimaciones?' : 'Votación en curso'}
                </h2>
                <p className="text-xs text-zinc-500 font-light max-w-xs">
                  {selectedCard
                    ? 'Tu carta está registrada. Pulsa en Revelar cuando todos hayan votado.'
                    : 'Selecciona una carta en la barra inferior para registrar tu estimación.'}
                </p>

                {/* Primary Action Button */}
                <button
                  onClick={onRevealVotes}
                  disabled={votedCount === 0}
                  className={`mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-sm ${
                    votedCount > 0
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 active:scale-95'
                      : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Eye className="w-4 h-4 stroke-[1.8]" />
                  <span>Revelar cartas</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 animate-in fade-in duration-200">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[1.8]" />
                  <span>Cartas desveladas</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-normal text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Resultado de la ronda
                </h2>
                <p className="text-xs text-zinc-500 font-light max-w-xs">
                  Revisa las estadísticas abajo e inicia una nueva votación cuando queráis.
                </p>

                {/* Reset Button */}
                <button
                  onClick={onResetVotes}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-4 h-4 stroke-[1.8]" />
                  <span>Nueva votación</span>
                </button>
              </div>
            )}
          </div>

          {/* Participants Seats */}
          <div className="w-full z-10 pt-4">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {roomState.participants.map((participant) => {
                const isHost = participant.id === roomState.hostId;
                const isCurrentPlayer =
                  (currentUserId && participant.id === currentUserId) ||
                  participant.name === currentUserName ||
                  participant.id === 'user-self';

                const displayVote = participant.vote || (isCurrentPlayer ? selectedCard : null);
                const hasVoted = participant.hasVoted || (isCurrentPlayer && !!selectedCard);

                return (
                  <div
                    key={participant.id}
                    className="flex flex-col items-center gap-2 transition-transform duration-200 hover:scale-[1.02]"
                  >
                    {/* Card container */}
                    <div className="perspective-1000">
                      {participant.isSpectator ? (
                        /* Spectator Slot */
                        <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-950/40 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
                          <Eye className="w-4 h-4 mb-0.5 stroke-[1.5]" />
                          <span className="text-[9px] uppercase tracking-wider font-medium">Mira</span>
                        </div>
                      ) : !hasVoted ? (
                        /* Empty Slot (Waiting) */
                        <div
                          className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                            isCurrentPlayer
                              ? 'border-zinc-400 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
                              : 'border-zinc-300 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/30 text-zinc-400 dark:text-zinc-600'
                          }`}
                        >
                          {isCurrentPlayer ? (
                            <>
                              <span className="text-sm">👇</span>
                              <span className="text-[9px] font-medium text-center px-1 text-zinc-600 dark:text-zinc-400">
                                Tu carta
                              </span>
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-400 dark:text-zinc-700" />
                              <span className="text-[9px] font-light text-zinc-400 dark:text-zinc-500">Pensando</span>
                            </>
                          )}
                        </div>
                      ) : !roomState.isRevealed ? (
                        /* Voted but HIDDEN */
                        isCurrentPlayer ? (
                          /* Current Player: Face-up to user with lock */
                          <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-between p-2 shadow-sm animate-in zoom-in-95 duration-150">
                            <div className="w-full flex justify-between items-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                              <span>{displayVote}</span>
                              <Lock className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500 stroke-[1.8]" />
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                              {displayVote === '☕' ? (
                                <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              ) : displayVote === '?' ? (
                                <HelpCircle className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                              ) : (
                                displayVote
                              )}
                            </div>
                            <span className="text-[8px] font-medium tracking-tight text-emerald-600 dark:text-emerald-400 uppercase">
                              Listo
                            </span>
                          </div>
                        ) : (
                          /* Other Players: Card Face Down (minimalist back) */
                          <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex flex-col items-center justify-between p-2 relative shadow-sm">
                            <div className="w-full flex justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-600">
                              <span>•</span>
                              <span>•</span>
                            </div>
                            <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700/60 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-[10px] font-medium">
                              ✓
                            </div>
                            <div className="w-full flex justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-600">
                              <span>•</span>
                              <span>•</span>
                            </div>
                          </div>
                        )
                      ) : (
                        /* Revealed for ALL */
                        <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-white text-zinc-950 border border-zinc-200 shadow-sm flex flex-col items-center justify-between p-2 animate-in flip-in-y duration-300">
                          <div className="w-full flex justify-start text-[10px] font-bold text-zinc-500">
                            {displayVote}
                          </div>
                          <div className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                            {displayVote === '☕' ? (
                              <Coffee className="w-5 h-5 text-amber-600" />
                            ) : displayVote === '?' ? (
                              <HelpCircle className="w-5 h-5 text-zinc-600" />
                            ) : (
                              displayVote
                            )}
                          </div>
                          <div className="w-full flex justify-end text-[10px] font-bold text-zinc-500 rotate-180">
                            {displayVote}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Participant Avatar & Name */}
                    <div className="flex flex-col items-center text-center w-20 sm:w-24 max-w-[96px]">
                      <div className="relative">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] shadow-sm"
                          style={{ backgroundColor: participant.avatarColor }}
                        >
                          {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        {isHost && (
                          <div
                            title="Anfitrión de la sala"
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-amber-500 flex items-center justify-center"
                          >
                            <Crown className="w-2 h-2" />
                          </div>
                        )}
                      </div>
                      <span
                        title={isCurrentPlayer ? `${participant.name} (Tú)` : participant.name}
                        className="text-[11px] font-medium text-zinc-800 dark:text-zinc-300 line-clamp-2 break-words leading-tight w-full mt-1 min-h-[2.2em] flex items-center justify-center"
                      >
                        {isCurrentPlayer ? `${participant.name} (Tú)` : participant.name}
                      </span>
                      {participant.isSpectator && (
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-light leading-none">
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
