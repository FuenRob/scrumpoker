import React, { useState } from 'react';
import {
  Copy,
  Check,
  Share2,
  History,
  LogOut,
  Edit2,
  Layers,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { DECKS, type RoomState, type DeckType } from '../types';

interface HeaderProps {
  roomState: RoomState;
  userName: string;
  avatarColor: string;
  isSpectator: boolean;
  isConnected: boolean;
  onCopyLink: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onLeaveRoom: () => void;
  onChangeDeck: (deck: DeckType) => void;
  onUpdateStory: (story: string) => void;
  onAddBots: () => void;
  isSimulated: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomState,
  userName,
  avatarColor,
  isSpectator,
  isConnected,
  onCopyLink,
  onOpenHistory,
  onOpenProfile,
  onLeaveRoom,
  onChangeDeck,
  onUpdateStory,
  onAddBots,
  isSimulated,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [storyInput, setStoryInput] = useState(roomState.storyTitle);

  // Sync storyInput when roomState.storyTitle changes remotely
  React.useEffect(() => {
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
    <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Room Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onLeaveRoom}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <span className="text-lg">🃏</span>
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white hidden md:inline">
              Scrum<span className="text-indigo-400">Poker</span>
            </span>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Room Name & Code */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[140px] sm:max-w-[220px]">
              {roomState.roomName || 'Sala'}
            </h1>
            <button
              onClick={handleCopy}
              title="Copiar código de sala"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-mono transition-colors shrink-0"
            >
              <span>#{roomState.roomId}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Connection status */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-800 text-[11px] font-medium"
            title={isConnected ? 'Conectado al servidor en tiempo real' : 'Sin conexión al servidor'}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 hidden xl:inline">En línea</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 hidden xl:inline">Desconectado</span>
              </>
            )}
          </div>

          {/* Deck selector */}
          <div className="relative hidden lg:flex items-center">
            <select
              value={roomState.deckType}
              onChange={(e) => onChangeDeck(e.target.value as DeckType)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {Object.entries(DECKS).map(([key, deck]) => (
                <option key={key} value={key}>
                  {deck.name}
                </option>
              ))}
            </select>
            <Layers className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Demo Bots button */}
          {!isSimulated && roomState.participants.length <= 1 && (
            <button
              onClick={onAddBots}
              title="Añadir compañeros bots para probar la votación y el consenso"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-medium transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Probar con bots</span>
            </button>
          )}

          {/* Copy Share Link button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Invitar equipo</span>
                <span className="sm:hidden">Enlace</span>
              </>
            )}
          </button>

          {/* History drawer trigger */}
          <button
            onClick={onOpenHistory}
            title="Ver historial de historias estimadas"
            className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          >
            <History className="w-4 h-4" />
            {roomState.history.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center">
                {roomState.history.length}
              </span>
            )}
          </button>

          {/* User profile badge */}
          <button
            onClick={onOpenProfile}
            title="Editar mi nombre o avatar"
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 transition-all text-left"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-inner"
              style={{ backgroundColor: avatarColor }}
            >
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-white leading-tight max-w-[90px] truncate">
                {userName || 'Tú'}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {isSpectator ? 'Observador' : 'Votante'}
              </span>
            </div>
            <Edit2 className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </button>

          {/* Leave room */}
          <button
            onClick={onLeaveRoom}
            title="Salir de la sala"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800 text-slate-400 border border-slate-700/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Story / Topic Bar */}
      <div className="bg-slate-950/50 border-t border-slate-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 shrink-0">
              Estimando:
            </span>

            {isEditingStory ? (
              <form onSubmit={handleStorySubmit} className="flex items-center gap-2 flex-1 max-w-xl">
                <input
                  type="text"
                  autoFocus
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="Ej. US-104: Sistema de login con Google y autenticación 2FA"
                  className="w-full px-3 py-1 bg-slate-900 border border-indigo-500 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingStory(false)}
                  className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div
                onClick={() => setIsEditingStory(true)}
                className="flex items-center gap-2 group cursor-pointer min-w-0"
                title="Haz clic para editar la tarea a estimar"
              >
                <span className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                  {roomState.storyTitle || (
                    <span className="text-slate-500 italic">
                      Haz clic aquí para añadir el título de la tarea o historia de usuario...
                    </span>
                  )}
                </span>
                <Edit2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 shrink-0 hidden sm:block">
            {roomState.participants.filter((p) => !p.isSpectator).length} votantes activos
          </div>
        </div>
      </div>
    </header>
  );
};
