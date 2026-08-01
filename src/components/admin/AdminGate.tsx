import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import anime from 'animejs';
import { AppLogo } from '../common/AppLogo';
import { NeonButton } from '../common/NeonButton';

const ADMIN_PASSWORD = '5500';

interface Props {
  children: ReactNode;
}

/**
 * Gate de acceso admin. SIEMPRE pide la clave al montarse — sin persistencia,
 * sin localStorage. Eso garantiza que back/forward/recarga vuelven a pedirla.
 * La clave está hardcoded para MVP (no es seguridad real, solo evita acceso
 * accidental desde el QR del bar).
 */
export function AdminGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      anime({
        targets: cardRef.current,
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutCubic',
      });
    }
    inputRef.current?.focus();
  }, []);

  // Animación shake cuando la clave es incorrecta
  useEffect(() => {
    if (shake > 0 && cardRef.current) {
      anime({
        targets: cardRef.current,
        translateX: [
          { value: -10, duration: 60 },
          { value: 10, duration: 60 },
          { value: -8, duration: 60 },
          { value: 8, duration: 60 },
          { value: 0, duration: 60 },
        ],
        easing: 'easeInOutSine',
      });
    }
  }, [shake]);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === ADMIN_PASSWORD) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setShake((s) => s + 1);
      setPass('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6 relative overflow-hidden">
      {/* Glow ornamentales */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.22) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,59,92,0.12) 0%, transparent 70%)' }}
      />

      <div
        ref={cardRef}
        className="relative w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: 'rgba(18,18,31, 0.92)',
          border: '1px solid rgba(168,85,247, 0.35)',
          boxShadow: '0 0 30px rgba(168,85,247, 0.18), 0 20px 60px rgba(0, 0, 0, 0.60)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex justify-center mb-5">
          <AppLogo size={96} glow />
        </div>

        <p className="text-gold font-heading uppercase tracking-[0.22em] text-[11px] mb-2">
          Zona de personal
        </p>
        <h1 className="font-display italic text-2xl text-ink mb-2">
          Acceso restringido
        </h1>
        <p className="text-ink-mute text-sm mb-6">
          Ingresa la clave para entrar al panel del local.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pass}
            onChange={(e) => { setPass(e.target.value); setError(false); }}
            placeholder="Clave"
            className="w-full text-center text-2xl tracking-[0.5em] font-heading rounded-xl px-4 py-3 outline-none transition-all"
            style={{
              background: 'rgba(10, 10, 15, 0.75)',
              border: error
                ? '1px solid rgba(182, 40, 40, 0.70)'
                : '1px solid rgba(168,85,247, 0.35)',
              color: '#ECECFF',
              boxShadow: error
                ? '0 0 14px rgba(182, 40, 40, 0.35)'
                : 'inset 0 0 8px rgba(168,85,247, 0.10)',
            }}
          />

          {error && (
            <p className="text-danger text-xs font-heading uppercase tracking-wider">
              Clave incorrecta
            </p>
          )}

          <NeonButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={pass.length === 0}
          >
            Entrar
          </NeonButton>
        </form>

        <Link
          to="/"
          className="inline-block mt-6 text-ink-dim hover:text-gold text-[11px] uppercase tracking-widest font-heading transition"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
