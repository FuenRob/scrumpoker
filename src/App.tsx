import { useState, useEffect, useCallback } from 'react';
import { useScrumPoker } from './hooks/useScrumPoker';
import { useTheme } from './hooks/useTheme';
import { getStoredUserName } from './utils/storage';
import { Lobby } from './components/Lobby';
import { Header } from './components/Header';
import { PokerTable } from './components/PokerTable';
import { CardDeck } from './components/CardDeck';
import { StatsPanel } from './components/StatsPanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { NameModal } from './components/NameModal';
import { Toast, type ToastMessage } from './components/Toast';
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

  const [urlRoomId, setUrlRoomId] = useState<string | null>(getRoomIdFromUrl);
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(() => !getStoredUserName());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const {
    roomId,
    roomState,
    isConnected,
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
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [roomId, joinRoom, leaveRoom]);

  // If user arrives directly via a shared link (urlRoomId exists)
  useEffect(() => {
    if (urlRoomId && !roomId) {
      if (!userName) {
        // Name not set: prompt name modal first!
        setIsNameModalOpen(true);
      } else {
        joinRoom(urlRoomId);
      }
    }
  }, [urlRoomId, roomId, userName, joinRoom]);

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

    // If waiting to join a room, join now
    if (urlRoomId && !roomId) {
      updateUrl(urlRoomId);
      joinRoom(urlRoomId);
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

  // If in room, render active room view
  if (roomId && roomState) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-white font-sans transition-colors duration-150">
        {/* Header */}
        <Header
          roomState={roomState}
          userName={userName}
          avatarColor={avatarColor}
          isSpectator={isSpectator}
          isConnected={isConnected}
          theme={theme}
          onToggleTheme={toggleTheme}
          onCopyLink={handleCopyLink}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenProfile={() => setIsNameModalOpen(true)}
          onLeaveRoom={handleLeaveRoom}
          onChangeDeck={changeDeck}
          onUpdateStory={updateStory}
          onAddBots={addDemoBots}
          isSimulated={isSimulated}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-center items-center py-4 w-full">
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
          onSelectCard={castVote}
          onToggleSpectator={toggleSpectator}
        />

        {/* Name Modal */}
        <NameModal
          isOpen={isNameModalOpen}
          initialName={userName}
          initialColor={avatarColor}
          initialIsSpectator={isSpectator}
          isClosable={!!userName}
          onSave={handleSaveProfile}
          onClose={() => setIsNameModalOpen(false)}
        />

        {/* History Drawer */}
        <HistoryDrawer
          isOpen={isHistoryOpen}
          history={roomState.history}
          onClose={() => setIsHistoryOpen(false)}
        />

        {/* Floating Toasts */}
        <Toast toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  // Otherwise, render Lobby
  return (
    <>
      <Lobby
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onDemoWithBots={handleDemoWithBots}
        userName={userName}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenNameModal={() => setIsNameModalOpen(true)}
      />

      <NameModal
        isOpen={isNameModalOpen}
        initialName={userName}
        initialColor={avatarColor}
        initialIsSpectator={isSpectator}
        isClosable={!!userName}
        onSave={handleSaveProfile}
        onClose={() => setIsNameModalOpen(false)}
      />

      <Toast toasts={toasts} onDismiss={removeToast} />
    </>
  );
}

export default App;
