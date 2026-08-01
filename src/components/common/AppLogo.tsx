interface Props {
  size?: number;
  className?: string;
  /** Halo neon detrás del logo (para heroes). */
  glow?: boolean;
}

/**
 * Logo de ROCOLA — vinilo neon con ecualizador, render inline en SVG.
 * Gradiente violeta → cian. Sin assets externos.
 */
export function AppLogo({ size = 64, className = '', glow = false }: Props) {
  const id = `rocola-${size}`;
  return (
    <div
      className={['relative inline-block shrink-0', className].join(' ')}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-70 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(168,85,247,0.7) 0%, rgba(34,211,238,0.3) 45%, transparent 72%)',
          }}
        />
      )}
      <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" className="relative w-full h-full">
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="55%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <radialGradient id={`c-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#12121F" />
            <stop offset="100%" stopColor="#0A0A14" />
          </radialGradient>
        </defs>

        {/* Disco */}
        <circle cx="32" cy="32" r="30" fill={`url(#c-${id})`} stroke={`url(#g-${id})`} strokeWidth="2" />
        {/* Surcos */}
        <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(168,85,247,0.25)" strokeWidth="1" />
        <circle cx="32" cy="32" r="19" fill="none" stroke="rgba(34,211,238,0.20)" strokeWidth="1" />

        {/* Ecualizador central */}
        <g strokeLinecap="round" strokeWidth="3.4" stroke={`url(#g-${id})`}>
          <line x1="24" y1="36" x2="24" y2="28" />
          <line x1="29" y1="40" x2="29" y2="22" />
          <line x1="34.5" y1="38" x2="34.5" y2="25" />
          <line x1="40" y1="42" x2="40" y2="20" />
        </g>

        {/* Centro del vinilo */}
        <circle cx="32" cy="32" r="4.5" fill={`url(#g-${id})`} />
        <circle cx="32" cy="32" r="1.6" fill="#0A0A14" />
      </svg>
    </div>
  );
}
