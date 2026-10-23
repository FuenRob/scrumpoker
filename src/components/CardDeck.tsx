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
      <div className="w-full bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-md py-3 px-4 sticky bottom-0 z-30 font-sans">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Eye className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-200">
                Modo observador activo
              </p>
              <p className="text-[11px] text-zinc-500 font-light">
                Puedes ver las cartas cuando se revelen
              </p>
            </div>
          </div>
          <button
            onClick={() => onToggleSpectator(false)}
            className="px-3 py-1 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            Votar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-md py-3 px-2 sm:px-6 sticky bottom-0 z-30 font-sans">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-2">
        {/* Minimalist status bar */}
        <div className="w-full flex items-center justify-between text-xs px-2 font-light">
          <span className="text-zinc-400">
            {isRevealed
              ? 'Ronda finalizada. Inicia una nueva votación para cambiar estimación.'
              : 'Elige tu carta de estimación:'}
          </span>
          {selectedCard ? (
            <span className="text-zinc-200 flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2]" />
              <span>Tu voto:</span>
              <strong className="px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-white font-mono text-xs">
                {selectedCard}
              </strong>
            </span>
          ) : (
            <span className="text-zinc-500 text-[11px]">Sin voto seleccionado</span>
          )}
        </div>

        {/* Minimalist Cards row */}
        <div className="w-full flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1.5 pt-1 px-1">
          {cards.map((card) => {
            const isSelected = selectedCard === card;

            return (
              <button
                key={card}
                type="button"
                disabled={isRevealed}
                onClick={() => onSelectCard(card)}
                className={`relative shrink-0 w-11 h-16 sm:w-13 sm:h-20 rounded-xl flex flex-col items-center justify-between p-1.5 transition-all duration-150 select-none cursor-pointer ${
                  isRevealed
                    ? 'opacity-30 cursor-not-allowed bg-zinc-900 border border-zinc-800 text-zinc-600'
                    : isSelected
                    ? 'bg-white text-zinc-950 -translate-y-2 border-white shadow-sm font-bold'
                    : 'bg-zinc-900 hover:bg-zinc-800/90 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:-translate-y-0.5'
                }`}
              >
                {/* Top Corner */}
                <span className="w-full text-left text-[9px] sm:text-[10px] font-medium opacity-70 leading-none">
                  {card}
                </span>

                {/* Center Value */}
                <div className="text-base sm:text-lg font-bold tracking-tight">
                  {card === '☕' ? (
                    <Coffee className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? 'text-zinc-950' : 'text-amber-400'}`} />
                  ) : card === '?' ? (
                    <HelpCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? 'text-zinc-950' : 'text-zinc-400'}`} />
                  ) : (
                    card
                  )}
                </div>

                {/* Bottom Corner */}
                <span className="w-full text-right text-[9px] sm:text-[10px] font-medium opacity-70 leading-none rotate-180">
                  {card}
                </span>

                {/* Active dot */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-zinc-950" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
