import React, { useState } from 'react';
import {
  ArrowRight,
  Layers,
  Sun,
  Moon,
} from 'lucide-react';
import { DECKS, type DeckType } from '../types';
import type { Theme } from '../hooks/useTheme';
import { generateRoomId } from '../utils/stats';
import { CrabIcon } from './CrabIcon';

interface LobbyProps {
  onCreateRoom: (roomId: string, roomName: string, deckType: DeckType) => void;
  onJoinRoom: (roomId: string) => void;
  onDemoWithBots: () => void;
  userName: string;
  theme: Theme;
  crabMode?: boolean;
  onToggleTheme: () => void;
  onOpenNameModal: () => void;
  onToggleCrabMode?: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  onDemoWithBots,
  userName,
  theme,
  crabMode = false,
  onToggleTheme,
  onOpenNameModal,
  onToggleCrabMode,
}) => {
  const [roomName, setRoomName] = useState('');
  const [deckType, setDeckType] = useState<DeckType>('modified-fibonacci');
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState('');
  const logoClicksRef = React.useRef<number[]>([]);

  const handleLogoBadgeClick = () => {
    const now = Date.now();
    logoClicksRef.current = [...logoClicksRef.current.filter((t) => now - t < 2500), now];
    if (logoClicksRef.current.length >= 5) {
      logoClicksRef.current = [];
      onToggleCrabMode?.();
    }
  };

  const recentRooms: string[] = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('scrumpoker_recent_rooms') || '[]');
    } catch {
      return [];
    }
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoomId = generateRoomId();
    const cleanRoomName = roomName.trim() || `Sala ${newRoomId.toUpperCase()}`;
    onCreateRoom(newRoomId, cleanRoomName, deckType);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = joinInput.trim();
    if (!clean) {
      setError('Introduce un enlace o código de sala');
      return;
    }

    if (clean.includes('room=')) {
      const match = clean.match(/room=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        clean = match[1];
      }
    } else if (clean.includes('/room/')) {
      const parts = clean.split('/room/');
      clean = parts[parts.length - 1].split('?')[0];
    }

    clean = clean.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    if (!clean) {
      setError('Código no válido');
      return;
    }

    onJoinRoom(clean);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between font-sans transition-colors duration-150">
      {/* Top minimalist header */}
      <header className="max-w-5xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900">
        <div className="flex items-center gap-2.5">
          <div
            onClick={handleLogoBadgeClick}
            className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-800 dark:text-zinc-200 select-none cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            title={crabMode ? '🦀 Modo cangrejo activo' : 'Scrum Poker'}
          >
            {crabMode ? <CrabIcon className="w-5 h-5" /> : '♠'}
          </div>
          <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Scrum Poker
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 stroke-[1.8]" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600 stroke-[1.8]" />
            )}
          </button>

          <button
            onClick={onOpenNameModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <span>Nombre:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 font-medium">
              {userName || 'Configurar'}
            </strong>
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Estimaciones ágiles en tiempo real</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
            Estimación de esfuerzo simple y privada.
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-light">
            Crea una sala, comparte el enlace directo con tu equipo y votad simultáneamente con cartas ocultas para evitar sesgos.
          </p>
        </div>

        {/* 2-Column Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {/* Card: Create Room */}
          <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-sm dark:shadow-none">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Crear nueva sala</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 font-light">
                Espacio privado accesible únicamente mediante enlace directo.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Nombre de la sala
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ej. Sprint Planning 34"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Baraja de estimación
                  </label>
                  <div className="relative">
                    <select
                      value={deckType}
                      onChange={(e) => setDeckType(e.target.value as DeckType)}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-200 appearance-none focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 cursor-pointer"
                    >
                      {Object.entries(DECKS).map(([key, deck]) => (
                        <option key={key} value={key} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">
                          {deck.name} ({deck.cards.slice(0, 4).join(', ')}...)
                        </option>
                      ))}
                    </select>
                    <Layers className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-sm text-white dark:text-zinc-950 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Crear sala</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Card: Join Room & Demo */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-7 shadow-sm dark:shadow-none">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Unirse a una sala</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 font-light">
                Pega el enlace compartido o escribe el código de la sala.
              </p>

              <form onSubmit={handleJoin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Código o enlace
                  </label>
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => {
                      setJoinInput(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Ej. ?room=xyz123 o código xyz123"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
                  />
                  {error && <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{error}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-zinc-800 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {recentRooms.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1.5 font-medium">
                    Salas recientes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {recentRooms.map((r) => (
                      <button
                        key={r}
                        onClick={() => onJoinRoom(r)}
                        className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      >
                        #{r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Demo Option */}
            <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-medium text-zinc-800 dark:text-zinc-300">¿Quieres probar en solitario?</h3>
                <p className="text-[11px] text-zinc-500 font-light">
                  Genera una sala con 3 compañeros simulados.
                </p>
              </div>
              <button
                onClick={onDemoWithBots}
                className="px-3 py-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                Modo Demo
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl w-full mx-auto px-6 py-6 text-center text-xs text-zinc-500 dark:text-zinc-500 border-t border-zinc-200 dark:border-zinc-900 font-light flex items-center justify-center gap-1 flex-wrap">
        <span>Hecho con</span>
        <span className="text-rose-500 mx-0.5 inline-block select-none" role="img" aria-label="corazón">❤️</span>
        <span>por</span>
        <a
          href="https://github.com/FuenRob"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors underline-offset-2 hover:underline"
        >
          Roberto Morais (FuenRob)
        </a>
      </footer>
    </div>
  );
};
