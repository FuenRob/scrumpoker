import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Share2,
  History,
  LogOut,
  Edit2,
  Layers,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { DECKS, type RoomState, type DeckType } from '../types';
import type { Theme } from '../hooks/useTheme';
import { CrabIcon } from './CrabIcon';

interface HeaderProps {
  roomState: RoomState;
  userName: string;
  avatarColor: string;
  isSpectator: boolean;
  isConnected: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onCopyLink: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onLeaveRoom: () => void;
  onChangeDeck: (deck: DeckType) => void;
  onUpdateStory: (story: string) => void;
  onAddBots: () => void;
  isSimulated: boolean;
  crabMode?: boolean;
  onToggleCrabMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomState,
  userName,
  avatarColor,
  isSpectator,
  isConnected,
  theme,
  onToggleTheme,
  onCopyLink,
  onOpenHistory,
  onOpenProfile,
  onLeaveRoom,
  onChangeDeck,
  onUpdateStory,
  onAddBots,
  isSimulated,
  crabMode = false,
  onToggleCrabMode,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [storyInput, setStoryInput] = useState(roomState.storyTitle);
  const logoClicksRef = React.useRef<number[]>([]);

  const handleLogoBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    logoClicksRef.current = [...logoClicksRef.current.filter((t) => now - t < 2500), now];
    if (logoClicksRef.current.length >= 5) {
      logoClicksRef.current = [];
      onToggleCrabMode?.();
    }
  };

  useEffect(() => {
    setStoryInput(roomState.storyTitle);
  }, [roomState.storyTitle]);

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStory(storyInput);
    setIsEditingStory(false);
  };

  return (
    <header className="w-full bg-white/80 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 sticky top-0 z-40 font-sans transition-colors duration-150">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: Brand & Room name */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onLeaveRoom}
            title="Volver al inicio"
          >
            <div
              onClick={handleLogoBadgeClick}
              className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-200 select-none hover:scale-105 active:scale-95 transition-transform"
              title={crabMode ? '🦀 Modo cangrejo activo' : 'Scrum Poker'}
            >
              {crabMode ? <CrabIcon className="w-4 h-4" /> : '♠'}
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 hidden sm:inline">
              Scrum Poker
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Room Name & Code */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[140px] sm:max-w-[200px]">
              {roomState.roomName || 'Sala'}
            </span>
            <button
              onClick={handleCopy}
              title="Copiar código de sala"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono transition-colors shrink-0 cursor-pointer"
            >
              <span>#{roomState.roomId}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-2">
          {/* Connection status dot */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/70 text-[11px] text-zinc-600 dark:text-zinc-400"
            title={isConnected ? 'Conectado al servidor' : 'Sin conexión'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
            <span className="hidden md:inline">{isConnected ? 'En línea' : 'Desconectado'}</span>
          </div>

          {/* Minimalist Deck selector */}
          <div className="relative hidden lg:flex items-center">
            <select
              value={roomState.deckType}
              onChange={(e) => onChangeDeck(e.target.value as DeckType)}
              className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg px-2.5 py-1 pr-6 appearance-none focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 cursor-pointer"
            >
              {Object.entries(DECKS).map(([key, deck]) => (
                <option key={key} value={key} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300">
                  {deck.name}
                </option>
              ))}
            </select>
            <Layers className="w-3 h-3 text-zinc-400 dark:text-zinc-500 absolute right-2 pointer-events-none" />
          </div>

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

          {/* Demo Bots button */}
          {!isSimulated && roomState.participants.length <= 1 && (
            <button
              onClick={onAddBots}
              title="Añadir compañeros bots para probar"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
              <span>Bots de prueba</span>
            </button>
          )}

          {/* Copy Share Link button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium transition-colors cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 stroke-[1.8]" />
                <span className="hidden sm:inline">Invitar</span>
              </>
            )}
          </button>

          {/* History drawer trigger */}
          <button
            onClick={onOpenHistory}
            title="Ver historial de estimaciones"
            className="relative p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <History className="w-4 h-4 stroke-[1.5]" />
            {roomState.history.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 text-[9px] font-bold flex items-center justify-center">
                {roomState.history.length}
              </span>
            )}
          </button>

          {/* User profile badge */}
          <button
            onClick={onOpenProfile}
            title="Editar mi perfil"
            className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-lg bg-zinc-100/80 hover:bg-zinc-200 dark:bg-zinc-900/60 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors text-left cursor-pointer"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
              style={{ backgroundColor: avatarColor }}
            >
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 hidden sm:inline max-w-[140px] truncate">
              {userName || 'Tú'}
              {isSpectator && <span className="text-[10px] text-zinc-500 ml-1 font-light">(Obs)</span>}
            </span>
            <Edit2 className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500 hidden sm:inline" />
          </button>

          {/* Leave room */}
          <button
            onClick={onLeaveRoom}
            title="Salir de la sala"
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* Story / Topic Bar */}
      <div className="bg-zinc-50/80 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 px-4 sm:px-6 py-2 transition-colors duration-150">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">
              Tarea:
            </span>

            {isEditingStory ? (
              <form onSubmit={handleStorySubmit} className="flex items-center gap-2 flex-1 max-w-lg">
                <input
                  type="text"
                  autoFocus
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="Ej. US-104: Sistema de login y autenticación con OAuth"
                  className="w-full px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 rounded-md text-[11px] font-medium"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingStory(false)}
                  className="px-2 py-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 text-[11px]"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div
                onClick={() => setIsEditingStory(true)}
                className="flex items-center gap-2 group cursor-pointer min-w-0"
                title="Haz clic para definir o editar la tarea a estimar"
              >
                <span className="text-xs text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-zinc-100 truncate font-light">
                  {roomState.storyTitle || (
                    <span className="text-zinc-400 dark:text-zinc-500 italic">
                      Haz clic aquí para escribir el título de la tarea a estimar...
                    </span>
                  )}
                </span>
                <Edit2 className="w-3 h-3 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 shrink-0 transition-colors" />
              </div>
            )}
          </div>

          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0 hidden sm:block font-light">
            {roomState.participants.filter((p) => !p.isSpectator).length} participantes
          </div>
        </div>
      </div>
    </header>
  );
};
