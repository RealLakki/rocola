import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, placeholder, autoFocus }: Props) {
  const ringRef     = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Glow ring responde al contenido
  useEffect(() => {
    if (!ringRef.current) return;
    gsap.to(ringRef.current, {
      opacity: value.length > 0 ? 0.9 : 0.3,
      duration: 0.35,
      ease: 'power2.out',
    });
  }, [value]);

  // Foco: pulso de entrada en el container
  const handleFocus = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, { scale: 1.015, duration: 0.2, ease: 'power2.out' });
    gsap.to(ringRef.current, { opacity: 0.75, duration: 0.25 });
  };

  const handleBlur = () => {
    if (!containerRef.current) return;
    gsap.to(containerRef.current, { scale: 1, duration: 0.25, ease: 'power2.inOut' });
    gsap.to(ringRef.current, {
      opacity: value.length > 0 ? 0.9 : 0.3, duration: 0.3,
    });
  };

  return (
    <div className="relative">
      <div
        ref={ringRef}
        className="absolute -inset-px rounded-2xl bg-gradient-gold blur-md opacity-30 pointer-events-none"
      />
      <div
        ref={containerRef}
        className="relative flex items-center gap-3 glass rounded-2xl px-5 py-4 gold-border"
      >
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder ?? 'Busca tu canción...'}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-base"
        />
        {value.length > 0 && (
          <button
            onClick={() => onChange('')}
            className="text-ink-dim hover:text-ink transition"
            aria-label="Limpiar"
          >
            <XIcon />
          </button>
        )}
      </div>
    </div>
  );
}

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gold shrink-0">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
