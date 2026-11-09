import { useState, useEffect, useCallback } from 'react';
import { useScrumPoker } from './hooks/useScrumPoker';
import { useTheme } from './hooks/useTheme';
import { getStoredUserName, getStoredCrabMode, setStoredCrabMode } from './utils/storage';
import { Lobby } from './components/Lobby';
import { Header } from './components/Header';
import { PokerTable } from './components/PokerTable';
import { CardDeck } from './components/CardDeck';
import { StatsPanel } from './components/StatsPanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { NameModal } from './components/NameModal';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { Toast, type ToastMessage } from './components/Toast';
import { CrabSwarm } from './components/CrabSwarm';
import type { DeckType } from './types';

export function App() {
  const { theme, toggleTheme } = useTheme();
  // Extract roomId from URL (?room=xyz or hash /#/room/xyz)
  const getRoomIdFromUrl = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    const queryRoom = params.get('room');
    if (queryRoom) return queryRoom.toLowerCase();

    const hash = window.location.hash;
    if (hash.includes('/room/')) {
      return hash.split('/room/')[1].split('?')[0].toLowerCase();
    }
    return null;
  };

  const getLegalTabFromUrl = (): LegalTab | null => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const legalParam = params.get('legal')?.toLowerCase();

    if (legalParam === 'privacy' || legalParam === 'privacidad') return 'privacy';
    if (legalParam === 'cookies') return 'cookies';
    if (legalParam === 'terms' || legalParam === 'terminos') return 'terms';
    if (legalParam === 'notice' || legalParam === 'aviso' || legalParam === 'legal') return 'notice';

    if (hash.includes('privacidad') || hash.includes('privacy')) return 'privacy';
    if (hash.includes('cookies') || hash.includes('cookie')) return 'cookies';
    if (hash.includes('terminos') || hash.includes('terms')) return 'terms';
    if (hash.includes('aviso') || hash.includes('legal-notice') || hash.includes('aviso-legal')) return 'notice';

    return null;
  };

  const [urlRoomId, setUrlRoomId] = useState<string | null>(getRoomIdFromUrl);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(getLegalTabFromUrl);
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(() => !getStoredUserName());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [crabMode, setCrabMode] = useState<boolean>(getStoredCrabMode);

  const addToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const toggleCrabMode = useCallback(() => {
    setCrabMode((prev) => {
      const next = !prev;
      setStoredCrabMode(next);
      if (next) {
        addToast('success', '🦀 ¡Modo cangrejo activado! Tu carta de café ahora es un cangrejo.');
      } else {
        addToast('info', '☕ Modo cangrejo desactivado. Has vuelto al café tradicional.');
      }
      return next;
    });
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const {
    roomId,
    roomState,
    isConnected,
    connectionMode,
    socketId,
    userName,
    avatarColor,
    isSpectator,
    selectedCard,
    joinRoom,
    leaveRoom,
    castVote,
    revealVotes,
    resetVotes,
    updateStory,
    changeDeck,
    toggleSpectator,
    saveUserName,
    addDemoBots,
    isSimulated,
    showCrabSwarm,
    closeCrabSwarm,
  } = useScrumPoker({ initialRoomId: urlRoomId });

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const current = getRoomIdFromUrl();
      setUrlRoomId(current);
      if (current && current !== roomId) {
        joinRoom(current);
      } else if (!current && roomId) {
        leaveRoom();
      }
      setLegalTab(getLegalTabFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [roomId, joinRoom, leaveRoom]);

  // If user arrives directly via a shared link and already has a name, enter immediately
  useEffect(() => {
    if (urlRoomId && userName && (!roomState || roomId !== urlRoomId)) {
      joinRoom(urlRoomId);
    }
  }, [urlRoomId, roomId, roomState, userName, joinRoom]);

  // Sync URL when roomId changes
  const updateUrl = useCallback((newRoomId: string | null) => {
    const url = new URL(window.location.href);
    if (newRoomId) {
      url.searchParams.set('room', newRoomId);
      window.history.pushState({}, '', url.toString());
    } else {
      url.searchParams.delete('room');
      window.history.pushState({}, '', url.pathname);
    }
  }, []);

  const handleCreateRoom = (newRoomId: string, roomName: string, deckType: DeckType) => {
    if (!userName) {
      setUrlRoomId(newRoomId);
      setIsNameModalOpen(true);
      return;
    }
    updateUrl(newRoomId);
    joinRoom(newRoomId, roomName, deckType);
    addToast('success', '¡Sala privada creada! Comparte el enlace con tu equipo.');
  };

  const handleJoinRoom = (targetRoomId: string) => {
    if (!userName) {
      setUrlRoomId(targetRoomId);
      setIsNameModalOpen(true);
      return;
    }
    updateUrl(targetRoomId);
    joinRoom(targetRoomId);
  };

  const handleLeaveRoom = () => {
    updateUrl(null);
    leaveRoom();
    setUrlRoomId(null);
    addToast('info', 'Has salido de la sala.');
  };

  const handleCopyLink = () => {
    if (!roomId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('success', '¡Enlace copiado al portapapeles! Compártelo con tu equipo.');
    }).catch(() => {
      addToast('info', `Enlace de la sala: ${shareUrl}`);
    });
  };

  const handleSaveProfile = (name: string, color: string, spectator: boolean) => {
    saveUserName(name, color, spectator);
    setIsNameModalOpen(false);
    addToast('success', `Perfil actualizado: ¡Hola, ${name}!`);

    // If joining a room via link or pending room, join immediately "de golpe"
    const targetRoom = urlRoomId || roomId;
    if (targetRoom) {
      updateUrl(targetRoom);
      joinRoom(targetRoom, undefined, undefined, name);
    }
  };

  const handleDemoWithBots = () => {
    if (!userName) {
      saveUserName('Tú (Scrum Master)', '#6366f1', false);
    }
    const demoId = 'demo-' + Math.random().toString(36).substring(2, 6);
    updateUrl(demoId);
    joinRoom(demoId, 'Sprint 42 - Sala de Demostración');
    setTimeout(() => {
      addDemoBots();
      addToast('info', '¡Modo de demostración activado con 3 compañeros bots!');
    }, 200);
  };

  const handleDataCleared = () => {
    setIsNameModalOpen(true);
    addToast('info', 'Se han restablecido y eliminado todos los datos de almacenamiento local.');
  };

  const isActiveRoom = Boolean(roomId && roomState);

  return (
    <>
      {isActiveRoom && roomState ? (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-white font-sans transition-colors duration-150 overflow-x-hidden">
          {/* Header */}
          <Header
            roomState={roomState}
            userName={userName}
            avatarColor={avatarColor}
            isSpectator={isSpectator}
            isConnected={isConnected}
            connectionMode={connectionMode}
            theme={theme}
            crabMode={crabMode}
            onToggleTheme={toggleTheme}
            onCopyLink={handleCopyLink}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenProfile={() => setIsNameModalOpen(true)}
            onLeaveRoom={handleLeaveRoom}
            onChangeDeck={changeDeck}
            onUpdateStory={updateStory}
            onAddBots={addDemoBots}
            isSimulated={isSimulated}
            onToggleCrabMode={toggleCrabMode}
            onOpenLegal={(tab) => setLegalTab(tab)}
          />

          {/* Main Content Area */}
          <main
            className={`flex-1 flex flex-col justify-center items-center py-4 w-full transition-[padding] duration-500 ease-in-out ${
              roomState.isRevealed ? 'pb-8' : 'pb-36 sm:pb-44'
            }`}
          >
            {/* Poker Table */}
            <PokerTable
              roomState={roomState}
              currentUserId={socketId}
              currentUserName={userName}
              selectedCard={selectedCard}
              onRevealVotes={revealVotes}
              onResetVotes={resetVotes}
            />

            {/* Stats Panel (when revealed) */}
            {roomState.isRevealed && (
              <StatsPanel participants={roomState.participants} />
            )}
          </main>

          {/* Card Deck Tray */}
          <CardDeck
            deckType={roomState.deckType}
            selectedCard={selectedCard}
            isRevealed={roomState.isRevealed}
            isSpectator={isSpectator}
            crabMode={crabMode}
            onSelectCard={castVote}
            onToggleSpectator={toggleSpectator}
          />

          {/* History Drawer */}
          <HistoryDrawer
            isOpen={isHistoryOpen}
            history={roomState.history}
            onClose={() => setIsHistoryOpen(false)}
          />
        </div>
      ) : (
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onDemoWithBots={handleDemoWithBots}
          userName={userName}
          theme={theme}
          crabMode={crabMode}
          onToggleTheme={toggleTheme}
          onOpenNameModal={() => setIsNameModalOpen(true)}
          onToggleCrabMode={toggleCrabMode}
          onOpenLegal={(tab) => setLegalTab(tab)}
        />
      )}

      {/* Name Modal */}
      {isNameModalOpen && (
        <NameModal
          isOpen={isNameModalOpen}
          initialName={userName}
          initialColor={avatarColor}
          initialIsSpectator={isSpectator}
          isClosable={!!userName}
          targetRoomId={urlRoomId || (!roomState ? roomId : null)}
          onSave={handleSaveProfile}
          onClose={() => setIsNameModalOpen(false)}
        />
      )}

      {/* Legal & Compliance Modal */}
      {legalTab && (
        <LegalModal
          isOpen={Boolean(legalTab)}
          initialTab={legalTab}
          onClose={() => setLegalTab(null)}
          onDataCleared={handleDataCleared}
        />
      )}

      {/* Crab Easter Egg Swarm */}
      <CrabSwarm
        active={showCrabSwarm}
        onComplete={closeCrabSwarm}
      />

      {/* Floating Toasts */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </>
  );
}

export default App;
