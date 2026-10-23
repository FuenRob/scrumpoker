import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Shield,
  EyeOff,
  Zap,
  BarChart3,
  Layers,
  Users,
} from 'lucide-react';
import { DECKS, type DeckType } from '../types';
import { generateRoomId } from '../utils/stats';

interface LobbyProps {
  onCreateRoom: (roomId: string, roomName: string, deckType: DeckType) => void;
  onJoinRoom: (roomId: string) => void;
  onDemoWithBots: () => void;
  userName: string;
  onOpenNameModal: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  onDemoWithBots,
  userName,
  onOpenNameModal,
}) => {
  const [roomName, setRoomName] = useState('');
  const [deckType, setDeckType] = useState<DeckType>('modified-fibonacci');
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState('');

  // Retrieve recent rooms
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
      setError('Por favor introduce un enlace o código de sala');
      return;
    }

    // Handle full URLs like http://localhost:5173/?room=xyz or /room/xyz
    if (clean.includes('room=')) {
      const match = clean.match(/room=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        clean = match[1];
      }
    } else if (clean.includes('/room/')) {
      const parts = clean.split('/room/');
      clean = parts[parts.length - 1].split('?')[0];
    }

    // Remove hash or query params
    clean = clean.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

    if (!clean) {
      setError('Código de sala no válido');
      return;
    }

    onJoinRoom(clean);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Lobby Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="text-xl">🃏</span>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              Scrum<span className="text-indigo-400">Poker</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
              Tiempo Real
            </span>
          </div>
        </div>

        {/* Profile Pill */}
        <button
          onClick={onOpenNameModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-all cursor-pointer"
        >
          <span className="text-slate-400">Tu nombre:</span>
          <strong className="text-white font-semibold">
            {userName || 'Configurar'}
          </strong>
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Estimaciones ágiles sencillas, rápidas y privadas</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Estima con tu equipo sin sesgos ni presiones.
          </h1>
          <p className="text-sm sm:text-base text-slate-400">
            Crea una sala privada, comparte el enlace con tus compañeros y revelad las cartas simultáneamente para encontrar consenso.
          </p>
        </div>

        {/* Cards Grid: Create Room & Join Room */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* Card 1: Create Room */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Crear Sala Privada</h2>
              <p className="text-xs text-slate-400 mb-6">
                Genera un espacio exclusivo al que solo se puede acceder mediante enlace directo.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Nombre de la sala
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ej. Sprint 42 - Refinamiento"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tipo de Baraja
                  </label>
                  <div className="relative">
                    <select
                      value={deckType}
                      onChange={(e) => setDeckType(e.target.value as DeckType)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {Object.entries(DECKS).map(([key, deck]) => (
                        <option key={key} value={key}>
                          {deck.name} ({deck.cards.slice(0, 5).join(', ')}...)
                        </option>
                      ))}
                    </select>
                    <Layers className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Crear Sala y Empezar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Join Existing Room & Quick Demo */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Join Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Unirse a una Sala</h2>
              <p className="text-xs text-slate-400 mb-6">
                Pega el enlace que te compartió un compañero o escribe el código de la sala.
              </p>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Enlace o código
                  </label>
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => {
                      setJoinInput(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Ej. https://.../?room=xyz123 o xyz123"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Entrar a la Sala</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Recent Rooms */}
              {recentRooms.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Salas recientes:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recentRooms.map((r) => (
                      <button
                        key={r}
                        onClick={() => onJoinRoom(r)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-indigo-300 transition-colors"
                      >
                        #{r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Demo with Bots Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/20 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-purple-300">¿Estás probando en solitario?</h3>
                <p className="text-[11px] text-slate-400">
                  Entra en una sala interactiva con 3 compañeros bots para probar el flujo.
                </p>
              </div>
              <button
                onClick={onDemoWithBots}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-md shadow-purple-500/20"
              >
                Probar Demo
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto w-full">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 space-y-1.5">
            <Shield className="w-5 h-5 text-indigo-400 mb-2" />
            <h4 className="text-xs font-bold text-white">100% Privado</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Solo quienes tengan el enlace pueden entrar a la sesión.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 space-y-1.5">
            <EyeOff className="w-5 h-5 text-purple-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Votos Ocultos</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Nadie ve los votos hasta pulsar Revelar para evitar sesgos cognitivos.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 space-y-1.5">
            <Zap className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Tiempo Real</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sincronizado al milisegundo mediante WebSockets sin recargar.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 space-y-1.5">
            <BarChart3 className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-xs font-bold text-white">Estadísticas Ágiles</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Promedio, mediana, nivel de consenso y exportación a Jira/Notion.
            </p>
          </div>
        </div>
      </main>

      {/* Lobby Footer */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-500 border-t border-slate-800/50">
        <p>Herramienta colaborativa de estimación Scrum Poker con ReactJS & pnpm.</p>
      </footer>
    </div>
  );
};
