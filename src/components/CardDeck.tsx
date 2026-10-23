import React from 'react';
import { Coffee, HelpCircle, Check, Eye } from 'lucide-react';
import { DECKS, type DeckType } from '../types';

interface CardDeckProps {
  deckType: DeckType;
  selectedCard: string | null;
  isRevealed: boolean;
  isSpectator: boolean;
  onSelectCard: (card: string) => void;
  onToggleSpectator: (isSpectator: boolean) => void;
}

export const CardDeck: React.FC<CardDeckProps> = ({
  deckType,
  selectedCard,
  isRevealed,
  isSpectator,
  onSelectCard,
  onToggleSpectator,
}) => {
  const cards = DECKS[deckType]?.cards || DECKS['modified-fibonacci'].cards;

  if (isSpectator) {
    return (
      <div className="w-full bg-slate-950/90 border-t border-slate-800 backdrop-blur-md py-4 px-4 sticky bottom-0 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-200">
                Estás como observador
              </p>
              <p className="text-[11px] text-slate-400">
                Puedes ver las cartas de los demás cuando se revelen
              </p>
            </div>
          </div>
          <button
            onClick={() => onToggleSpectator(false)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            Quiero votar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl py-3 sm:py-4 px-2 sm:px-6 sticky bottom-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-2 sm:gap-3">
        {/* Header / Instructions */}
        <div className="w-full flex items-center justify-between text-xs font-semibold px-2">
          <span className="text-slate-400">
            {isRevealed
              ? 'Ronda finalizada. Inicia una nueva votación para volver a estimar.'
              : 'Selecciona tu carta de estimación:'}
          </span>
          {selectedCard ? (
            <span className="text-indigo-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Tu voto: <strong className="text-white text-sm">{selectedCard}</strong>
            </span>
          ) : (
            <span className="text-amber-400/80">Aún no has votado</span>
          )}
        </div>

        {/* Cards Carousel / Grid */}
        <div className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto pb-2 pt-1 px-2 no-scrollbar">
          {cards.map((card) => {
            const isSelected = selectedCard === card;

            return (
              <button
                key={card}
                type="button"
                disabled={isRevealed}
                onClick={() => onSelectCard(card)}
                className={`relative shrink-0 w-12 h-18 sm:w-14 sm:h-22 rounded-xl sm:rounded-2xl flex flex-col items-center justify-between p-1.5 sm:p-2 transition-all duration-200 select-none cursor-pointer ${
                  isRevealed
                    ? 'opacity-40 cursor-not-allowed bg-slate-900 border border-slate-800 text-slate-500'
                    : isSelected
                    ? 'bg-gradient-to-b from-indigo-500 to-purple-600 text-white -translate-y-2.5 shadow-lg shadow-indigo-500/40 ring-2 ring-white border-transparent'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-indigo-500/50 hover:-translate-y-1 shadow-md'
                }`}
              >
                {/* Top value */}
                <span className="w-full text-left text-[10px] sm:text-[11px] font-bold opacity-80 leading-none">
                  {card}
                </span>

                {/* Center icon / value */}
                <div className="text-base sm:text-xl font-extrabold tracking-tight">
                  {card === '☕' ? (
                    <Coffee className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                  ) : card === '?' ? (
                    <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300" />
                  ) : (
                    card
                  )}
                </div>

                {/* Bottom value */}
                <span className="w-full text-right text-[10px] sm:text-[11px] font-bold opacity-80 leading-none rotate-180">
                  {card}
                </span>

                {/* Selected Indicator Check */}
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
