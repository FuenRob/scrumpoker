import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Cookie,
  Scale,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { STORAGE_KEYS } from '../utils/storage';

export type LegalTab = 'notice' | 'privacy' | 'cookies' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  onDataCleared?: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'notice',
  onClose,
  onDataCleared,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
    setConfirmClear(false);
    setClearSuccess(false);
  }

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClearLocalData = () => {
    try {
      Object.values(STORAGE_KEYS).forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      });
      // Clear legacy/cookie remnants
      if (typeof document !== 'undefined') {
        document.cookie = 'scrumpoker_username=; path=/; max-age=0; SameSite=Lax';
      }
      setClearSuccess(true);
      setConfirmClear(false);
      setTimeout(() => {
        setClearSuccess(false);
        onDataCleared?.();
      }, 1500);
    } catch (err) {
      console.error('Error al limpiar datos locales:', err);
    }
  };

  const tabs: { id: LegalTab; label: string; shortLabel: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'notice', label: 'Aviso Legal', shortLabel: 'Aviso', icon: FileText },
    { id: 'privacy', label: 'Privacidad (RGPD)', shortLabel: 'Privacidad', icon: ShieldCheck },
    { id: 'cookies', label: 'Cookies y Almacenamiento', shortLabel: 'Cookies', icon: Cookie },
    { id: 'terms', label: 'Términos de Uso', shortLabel: 'Términos', icon: Scale },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 id="legal-modal-title" className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                Información Legal y Cumplimiento Normativo
              </h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 font-light truncate">
                RGPD · LOPDGDD · LSSI-CE · Directiva ePrivacy (UE)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal de información legal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation (Responsive con scroll táctil) */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 bg-zinc-50/30 dark:bg-zinc-900/20 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-light leading-relaxed max-h-[calc(90vh-140px)]">
          {/* TAB 1: AVISO LEGAL */}
          {activeTab === 'notice' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Aviso Legal (LSSI-CE)
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                  v2026.11
                </span>
              </div>

              <div className="space-y-4">
                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5 flex items-center gap-1.5">
                    <span>1. Datos del Responsable del Sitio Web</span>
                  </h4>
                  <p>
                    En cumplimiento de las obligaciones de información dispuestas en el artículo 10 de la Ley 34/2002 (LSSI-CE), se hace constar que el presente sitio web es un proyecto de software libre de estimación colaborativa desarrollado por:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <li><strong className="text-zinc-800 dark:text-zinc-200">Denominación del proyecto:</strong> Scrum Poker</li>
                    <li><strong className="text-zinc-800 dark:text-zinc-200">Titular y mantenedor:</strong> Roberto Morais ("FuenRob")</li>
                    <li><strong className="text-zinc-800 dark:text-zinc-200">Naturaleza:</strong> Proyecto de código abierto, gratuito, sin fines comerciales de intermediación.</li>
                    <li>
                      <strong className="text-zinc-800 dark:text-zinc-200">Repositorio y contacto:</strong>{' '}
                      <a
                        href="https://github.com/FuenRob/scrumpoker"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-900 dark:text-zinc-100 underline hover:text-rose-500 inline-flex items-center gap-1"
                      >
                        github.com/FuenRob/scrumpoker <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    2. Objeto y Funcionamiento
                  </h4>
                  <p>
                    Scrum Poker proporciona a profesionales y equipos ágiles una interfaz interactiva en tiempo real para estimar el esfuerzo de historias de usuario mediante barajas de póker (Scrum, Fibonacci, Tallas de camiseta, etc.). El servicio funciona tanto con servidor centralizado de WebSockets como mediante conexión serverless Peer-to-Peer (WebRTC).
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    3. Propiedad Intelectual y Licencia
                  </h4>
                  <p>
                    El código fuente, arquitectura y recursos originales de la aplicación se distribuyen bajo los términos de la <strong className="text-zinc-800 dark:text-zinc-200">Licencia de Código Abierto MIT</strong>. Se autoriza expresamente su inspección, auditoría y clonación con arreglo a dicha licencia.
                  </p>
                  <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-xs">
                    Las referencias a marcas como Scrum, Jira, Notion, Slack o GitHub se realizan exclusivamente a título descriptivo e identificativo de integraciones, perteneciendo todos los derechos a sus legítimos propietarios.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    4. Exclusión de Garantías y Responsabilidad
                  </h4>
                  <p>
                    El servicio se suministra <em>"tal cual"</em> (as is), sin garantías expresas o implícitas sobre disponibilidad ininterrumpida o infalibilidad técnica de las redes de telecomunicaciones. Dado que las salas de estimación operan de manera efímera en memoria volátil, no se asume responsabilidad por la pérdida de datos de votación no exportados o interrupciones imprevistas de red.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACIDAD (RGPD) */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Política de Privacidad
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Reglamento (UE) 2016/679 (RGPD) y Ley Orgánica 3/2018 (LOPDGDD)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium">
                  <Lock className="w-3 h-3" /> Privacidad por Diseño
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
                <strong>Garantía de Privacidad Absoluta:</strong> Scrum Poker no recopila correos electrónicos, no solicita contraseñas, no tiene formularios de registro y no indexa las salas de votación en bases de datos relacionales persistentes.
              </div>

              <div className="space-y-4">
                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    1. Datos Personales Tratados y Finalidades
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium">
                          <th className="py-2 pr-3">Dato</th>
                          <th className="py-2 px-3">Finalidad</th>
                          <th className="py-2 px-3">Base Legal (RGPD)</th>
                          <th className="py-2 pl-3">Almacenamiento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-zinc-600 dark:text-zinc-400">
                        <tr>
                          <td className="py-2.5 pr-3 font-medium text-zinc-800 dark:text-zinc-200">Nombre / Alias</td>
                          <td className="py-2.5 px-3">Identificar al usuario en la mesa virtual</td>
                          <td className="py-2.5 px-3">Consentimiento (Art. 6.1.a)</td>
                          <td className="py-2.5 pl-3">Local en tu navegador (localStorage)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pr-3 font-medium text-zinc-800 dark:text-zinc-200">Color y Rol</td>
                          <td className="py-2.5 px-3">Diferenciar fichas de participantes y observadores</td>
                          <td className="py-2.5 px-3">Ejecución del servicio (Art. 6.1.b)</td>
                          <td className="py-2.5 pl-3">Local en tu navegador (localStorage)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pr-3 font-medium text-zinc-800 dark:text-zinc-200">ID seudónimo (<code className="text-[10px]">usr_...</code>)</td>
                          <td className="py-2.5 px-3">Mantener voto y rol si refrescas la pestaña</td>
                          <td className="py-2.5 px-3">Interés legítimo técnico (Art. 6.1.f)</td>
                          <td className="py-2.5 pl-3">Local en tu navegador (localStorage)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pr-3 font-medium text-zinc-800 dark:text-zinc-200">Votos y estimaciones</td>
                          <td className="py-2.5 px-3">Calcular media, mediana y consenso en la sala</td>
                          <td className="py-2.5 px-3">Ejecución del servicio (Art. 6.1.b)</td>
                          <td className="py-2.5 pl-3">Memoria volátil de la sesión activa</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pr-3 font-medium text-zinc-800 dark:text-zinc-200">Dirección IP</td>
                          <td className="py-2.5 px-3">Enrutamiento de paquetes WebSockets y WebRTC/STUN</td>
                          <td className="py-2.5 px-3">Necesidad técnica de red (Art. 6.1.f)</td>
                          <td className="py-2.5 pl-3">No persistente (memoria de socket)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    2. Votación Secreta Criptográfica en Servidor
                  </h4>
                  <p>
                    Para garantizar la imparcialidad del proceso de estimación, el servidor enmascara los votos recibidos. Ningún participante (ni siquiera mediante herramientas de inspección del tráfico de red) puede conocer las cartas seleccionadas por sus compañeros hasta que se pulse expresamente el comando "Revelar Cartas".
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    3. Ejercicio de Derechos (ARCO-POL)
                  </h4>
                  <p>
                    Puedes ejercer tus derechos de acceso, rectificación, supresión ("derecho al olvido"), oposición y limitación del tratamiento. Dado que no almacenamos cuentas de usuario ni perfiles identificables en ningún servidor externo:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <li>Puedes modificar tu alias y color en cualquier momento haciendo clic en tu perfil.</li>
                    <li>Puedes eliminar todos tus datos locales instantáneamente pulsando el botón de borrado de datos en la pestaña de <em>Cookies y Almacenamiento</em>.</li>
                    <li>Tienes derecho a interponer una reclamación ante la <strong className="text-zinc-800 dark:text-zinc-200">Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-950 dark:hover:text-white">www.aepd.es</a>.</li>
                  </ul>
                </section>
              </div>
            </div>
          )}

          {/* TAB 3: COOKIES Y ALMACENAMIENTO */}
          {activeTab === 'cookies' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Política de Cookies y Almacenamiento Local
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Art. 22.2 LSSI-CE y Directiva 2002/58/CE (ePrivacy)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-medium">
                  Zero Tracking Cookies
                </div>
              </div>

              <div className="space-y-3">
                <p>
                  Scrum Poker <strong>no utiliza cookies publicitarias, analíticas ni de seguimiento de terceros</strong>. Empleamos exclusivamente almacenamiento local (<code>localStorage</code>) estrictamente necesario para que la herramienta funcione de forma óptima sin sobrecargar la red ni perder tus preferencias al recargar.
                </p>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Exención Legal de Banner Intrusivo</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                    Conforme al Art. 22.2 de la LSSI-CE y las directrices de la Agencia Española de Protección de Datos (AEPD), el almacenamiento puramente técnico destinado a mantener la sesión solicitada por el usuario está exento de requerir consentimiento previo mediante banner bloqueante.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Claves de Almacenamiento Utilizadas en este Sitio:
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium">
                          <th className="py-2 pr-3">Clave de almacenamiento</th>
                          <th className="py-2 px-3">Tipo / Finalidad</th>
                          <th className="py-2 pl-3">Persistencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                        <tr>
                          <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-200">scrumpoker_username</td>
                          <td className="py-2 px-3 font-sans">Alias elegido por el usuario</td>
                          <td className="py-2 pl-3 font-sans">Hasta borrado por el usuario</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-200">scrumpoker_user_id</td>
                          <td className="py-2 px-3 font-sans">Identificador seudónimo técnico de sesión</td>
                          <td className="py-2 pl-3 font-sans">Hasta borrado por el usuario</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-200">scrumpoker_avatar_color</td>
                          <td className="py-2 px-3 font-sans">Color de avatar personalizado</td>
                          <td className="py-2 pl-3 font-sans">Hasta borrado por el usuario</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-200">scrumpoker_is_spectator</td>
                          <td className="py-2 px-3 font-sans">Preferencia de rol (votante u observador)</td>
                          <td className="py-2 pl-3 font-sans">Hasta borrado por el usuario</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-200">scrumpoker_recent_rooms</td>
                          <td className="py-2 px-3 font-sans">Códigos de salas visitadas para acceso rápido</td>
                          <td className="py-2 pl-3 font-sans">Hasta borrado por el usuario</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-200">scrumpoker_theme</td>
                          <td className="py-2 px-3 font-sans">Preferencia visual de interfaz (modo claro u oscuro)</td>
                          <td className="py-2 pl-3 font-sans">Hasta borrado por el usuario</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-zinc-900 dark:text-zinc-200">scrumpoker_crab_mode</td>
                          <td className="py-2 px-3 font-sans">Preferencia del modo lúdico</td>
                          <td className="py-2 pl-3 font-sans">Hasta borrado por el usuario</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Interactive Data Clear Tool */}
                <div className="mt-5 p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
                  <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 text-xs font-semibold">
                    <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Control Directo: Borrado de Datos Locales</span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300 font-light">
                    Puedes purgar en cualquier momento todas las claves locales de Scrum Poker en este navegador. Al hacerlo, se restablecerá tu perfil y tu configuración.
                  </p>

                  {clearSuccess ? (
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-medium py-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>¡Todos los datos locales han sido eliminados correctamente!</span>
                    </div>
                  ) : confirmClear ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <button
                        onClick={handleClearLocalData}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer text-center"
                      >
                        Confirmar y borrar ahora
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer text-center"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 text-xs font-medium transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar mis datos de almacenamiento local</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TÉRMINOS Y CONDICIONES */}
          {activeTab === 'terms' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Términos y Condiciones de Uso
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Condiciones aplicables al acceso y uso de las salas de estimación
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                  v2026.11
                </span>
              </div>

              <div className="space-y-4">
                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    1. Aceptación y Ámbito
                  </h4>
                  <p>
                    El uso de Scrum Poker implica la total conformidad del usuario con estos términos. Si no estuviera conforme, debe abstenerse de utilizar el servicio.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    2. Normas de Conducta y Uso Aceptable
                  </h4>
                  <p>
                    Las salas de estimación son espacios de trabajo creados por los propios usuarios. Queda expresamente prohibido:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-600 dark:text-zinc-400">
                    <li>Utilizar alias o descripciones de tareas con lenguaje vejatorio, violento o difamatorio.</li>
                    <li>Ejecutar scripts automatizados de sobrecarga de mensajes que saturen los servidores o las conexiones de otros usuarios (DoS).</li>
                    <li>Intentar vulnerar los mecanismos de voto secreto o manipular los paquetes WebSocket/WebRTC.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    3. Servicio Gratuito y Disponibilidad
                  </h4>
                  <p>
                    Scrum Poker es un servicio libre y abierto. No existe un Acuerdo de Nivel de Servicio (SLA) con garantías de tiempo de actividad del 100%. El titular se reserva el derecho de efectuar tareas de mantenimiento o actualizar el software en cualquier momento.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                    4. Legislación Aplicable
                  </h4>
                  <p>
                    Las presentes condiciones se rigen en todos sus extremos por la legislación española y la normativa comunitaria europea aplicable.
                  </p>
                </section>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Scrum Poker Open Source</span>
            <span>·</span>
            <a
              href="https://github.com/FuenRob/scrumpoker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline-offset-2 hover:underline inline-flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-medium transition-colors cursor-pointer text-center"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
