import React, { useState } from 'react';
import { User, Eye, Sparkles, Check } from 'lucide-react';
import { AVATAR_COLORS } from '../utils/stats';

interface NameModalProps {
  isOpen: boolean;
  initialName?: string;
  initialColor?: string;
  initialIsSpectator?: boolean;
  isClosable?: boolean;
  onSave: (name: string, color: string, isSpectator: boolean) => void;
  onClose?: () => void;
}

export const NameModal: React.FC<NameModalProps> = ({
  isOpen,
  initialName = '',
  initialColor = AVATAR_COLORS[5],
  initialIsSpectator = false,
  isClosable = false,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [isSpectator, setIsSpectator] = useState(initialIsSpectator);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Por favor, introduce tu nombre o alias para continuar');
      return;
    }
    if (cleanName.length > 25) {
      setError('El nombre no puede tener más de 25 caracteres');
      return;
    }
    onSave(cleanName, color, isSpectator);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">¿Cómo te llamas?</h2>
            <p className="text-xs text-slate-400">
              Tu equipo verá tu nombre y avatar durante la estimación
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Nombre o Alias <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ej. Carlos Dev, Lucía QA, etc."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <User className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Color de tu ficha
            </label>
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Role selection */}
          <div className="pt-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Rol en la sesión
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsSpectator(false)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center ${
                  !isSpectator
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-2xl mb-1">🃏</span>
                <span className="text-sm font-semibold">Participante</span>
                <span className="text-[11px] text-slate-400">Voto y estimo</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSpectator(true)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center ${
                  isSpectator
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Eye className="w-6 h-6 mb-1 text-slate-300" />
                <span className="text-sm font-semibold">Observador</span>
                <span className="text-[11px] text-slate-400">PO, Scrum Master</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            {isClosable && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 px-4 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 px-5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              Comenzar a estimar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
