import React from 'react';
import {
  FileText,
  ShieldCheck,
  Cookie,
  Scale,
} from 'lucide-react';
import type { LegalTab } from './LegalModal';

interface PreFooterProps {
  onOpenLegal: (tab: LegalTab) => void;
  crabMode?: boolean;
}

const CURRENT_YEAR = 2026;

export const PreFooter: React.FC<PreFooterProps> = ({ onOpenLegal }) => {
  const legalLinks: { id: LegalTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'notice', label: 'Aviso Legal', icon: FileText },
    { id: 'privacy', label: 'Política de Privacidad', icon: ShieldCheck },
    { id: 'cookies', label: 'Cookies y Almacenamiento', icon: Cookie },
    { id: 'terms', label: 'Términos de Uso', icon: Scale },
  ];

  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-900 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xs transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col items-center gap-5 text-center">
        {/* Enlaces Legales: En vertical en móvil, en horizontal en desktop */}
        <nav
          className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-1.5 sm:gap-6 text-xs sm:text-sm"
          aria-label="Páginas legales"
        >
          {legalLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => onOpenLegal(link.id)}
                className="group inline-flex items-center justify-center sm:justify-start gap-2 py-2 px-3 sm:px-1 rounded-lg sm:rounded-none text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100/70 sm:hover:bg-transparent dark:hover:bg-zinc-900/60 transition-colors cursor-pointer sm:underline-offset-4 sm:hover:underline font-light text-center"
              >
                <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Separador sutil */}
        <div className="w-12 h-px bg-zinc-200 dark:border-zinc-800" />

        {/* Créditos y Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 font-light">
          <span>© {CURRENT_YEAR} Scrum Poker</span>
          <span className="hidden sm:inline">·</span>
          <div className="flex items-center gap-1">
            <span>Hecho con</span>
            <span className="text-rose-500 select-none inline-block" role="img" aria-label="corazón">❤️</span>
            <span>por</span>
            <a
              href="https://github.com/FuenRob"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors underline-offset-2 hover:underline"
            >
              Roberto Morais (FuenRob)
            </a>
          </div>
          <span className="hidden sm:inline">·</span>
          <a
            href="https://github.com/FuenRob/scrumpoker/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Licencia MIT
          </a>
        </div>
      </div>
    </footer>
  );
};
