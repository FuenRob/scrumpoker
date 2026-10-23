export const STORAGE_KEYS = {
  USERNAME: 'scrumpoker_username',
  AVATAR_COLOR: 'scrumpoker_avatar_color',
  IS_SPECTATOR: 'scrumpoker_is_spectator',
  RECENT_ROOMS: 'scrumpoker_recent_rooms',
};

export function getStoredUserName(): string {
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEYS.USERNAME);
    if (fromLocal && fromLocal.trim()) return fromLocal.trim();

    // Cookie fallback
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )scrumpoker_username=([^;]*)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]).trim();
        if (decoded) {
          localStorage.setItem(STORAGE_KEYS.USERNAME, decoded);
          return decoded;
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
  return '';
}

export function setStoredUserName(name: string): void {
  const clean = name.trim();
  try {
    localStorage.setItem(STORAGE_KEYS.USERNAME, clean);
    if (typeof document !== 'undefined') {
      // 1 year persistent cookie
      const maxAge = 365 * 24 * 60 * 60;
      document.cookie = `scrumpoker_username=${encodeURIComponent(clean)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  } catch {
    // Ignore storage errors
  }
}
