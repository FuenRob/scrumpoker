export const STORAGE_KEYS = {
  USERNAME: 'scrumpoker_username',
  AVATAR_COLOR: 'scrumpoker_avatar_color',
  IS_SPECTATOR: 'scrumpoker_is_spectator',
  RECENT_ROOMS: 'scrumpoker_recent_rooms',
  CRAB_MODE: 'scrumpoker_crab_mode',
};

/**
 * Persistencia mediante localStorage:
 * Es la opción óptima para esta aplicación ya que es una SPA que se comunica
 * por WebSockets y no requiere enviar cabeceras Cookie en cada petición HTTP,
 * evitando sobrecarga innecesaria de red y problemas de expiración.
 */
export function getStoredUserName(): string {
  try {
    return (localStorage.getItem(STORAGE_KEYS.USERNAME) || '').trim();
  } catch {
    return '';
  }
}

export function setStoredUserName(name: string): void {
  const clean = name.trim();
  try {
    if (clean) {
      localStorage.setItem(STORAGE_KEYS.USERNAME, clean);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USERNAME);
    }

    // Limpieza de cookie residual si existiese previamente
    if (typeof document !== 'undefined' && document.cookie.includes('scrumpoker_username=')) {
      document.cookie = 'scrumpoker_username=; path=/; max-age=0; SameSite=Lax';
    }
  } catch {
    // Manejo de restricciones en navegadores (modo incógnito estricto, etc.)
  }
}

export function getStoredCrabMode(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('crab') === '1' || params.get('crab') === 'true') {
        localStorage.setItem(STORAGE_KEYS.CRAB_MODE, 'true');
        return true;
      }
    }
    return localStorage.getItem(STORAGE_KEYS.CRAB_MODE) === 'true';
  } catch {
    return false;
  }
}

export function setStoredCrabMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(STORAGE_KEYS.CRAB_MODE, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.CRAB_MODE);
    }
  } catch {
    // Ignore storage restrictions
  }
}
