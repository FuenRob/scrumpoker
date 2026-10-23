import React, { useState } from 'react';
import { User, Eye, Check } from 'lucide-react';
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
      setError('Introduce tu nombre o alias para continuar');
      return;
    }
    if (cleanName.length > 25) {
      setError('El nombre no puede tener más de 25 caracteres');
      return;
    }
    onSave(cleanName, color, isSpectator);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm font-sans">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-zinc-100">Configura tu perfil</h2>
          <p className="text-xs text-zinc-400 font-light mt-0.5">
            Tu equipo verá tu nombre y color durante la estimación.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
              Tu nombre o alias <span className="text-rose-400">*</span>
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
                placeholder="Ej. Carlos Dev, Laura QA"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <User className="absolute right-3 top-3 w-4 h-4 text-zinc-500 pointer-events-none stroke-[1.5]" />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
              Color de ficha
            </label>
            <div className="flex items-center justify-between gap-1 p-2 bg-zinc-950 rounded-xl border border-zinc-800">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {color === c && <Check className="w-3 h-3 text-white drop-shadow stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Role selection */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
              Rol en la sala
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSpectator(false)}
                className={`p-2.5 rounded-xl border transition-all text-center ${
                  !isSpectator
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-sm font-medium">Participante</div>
                <div className="text-[10px] text-zinc-400 font-light">Vota estimaciones</div>
              </button>

              <button
                type="button"
                onClick={() => setIsSpectator(true)}
                className={`p-2.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center ${
                  isSpectator
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-sm font-medium flex items-center gap-1">
                  <Eye className="w-3 h-3 stroke-[1.8]" />
                  <span>Observador</span>
                </div>
                <div className="text-[10px] text-zinc-400 font-light">Solo visualiza</div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {isClosable && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 px-3 rounded-xl font-medium text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm text-zinc-950 bg-white hover:bg-zinc-200 active:scale-[0.99] transition-all cursor-pointer"
            >
              Guardar y continuar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
