import { useRef, type ButtonHTMLAttributes, type MouseEvent, forwardRef } from 'react';
import anime from 'animejs';

type Variant = 'primary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const PRIMARY_BG = 'bg-[linear-gradient(135deg,#C084FC_0%,#A855F7_55%,#7C3AED_100%)]';

const variantClasses: Record<Variant, string> = {
  primary:
    `${PRIMARY_BG} text-[#0A0A14] font-bold border border-[#A855F7] shadow-gold hover:shadow-gold-lg hover:brightness-110 active:scale-[0.97]`,
  ghost:
    'bg-[rgba(18,18,31,0.60)] text-ink border border-[rgba(58,42,24,0.55)] hover:border-gold hover:text-gold hover:shadow-gold-sm active:scale-[0.97]',
  danger:
    'bg-[rgba(182,40,40,0.12)] text-danger border border-[rgba(182,40,40,0.45)] hover:bg-[rgba(182,40,40,0.22)] hover:shadow-[0_0_15px_rgba(182,40,40,0.50)] active:scale-[0.97]',
  success:
    'bg-[rgba(63,184,122,0.12)] text-success border border-[rgba(63,184,122,0.45)] hover:bg-[rgba(63,184,122,0.22)] active:scale-[0.97]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export const NeonButton = forwardRef<HTMLButtonElement, Props>(function NeonButton(
  { variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, onClick, ...rest },
  ref,
) {
  const localRef = useRef<HTMLButtonElement | null>(null);
  const setRefs = (el: HTMLButtonElement | null) => {
    localRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    if (localRef.current) {
      const rect = localRef.current.getBoundingClientRect();
      const ripple = document.createElement('span');
      const sz = Math.max(rect.width, rect.height) * 1.6;
      ripple.style.cssText = `
        position: absolute; left: ${e.clientX - rect.left - sz / 2}px;
        top: ${e.clientY - rect.top - sz / 2}px;
        width: ${sz}px; height: ${sz}px; border-radius: 9999px;
        background: radial-gradient(circle, rgba(255,214,51,0.55) 0%, rgba(168,85,247,0) 70%);
        pointer-events: none; transform: scale(0); opacity: 0.9;
      `;
      localRef.current.appendChild(ripple);
      anime({
        targets: ripple,
        scale: [0, 1],
        opacity: [0.9, 0],
        duration: 600,
        easing: 'easeOutQuad',
        complete: () => ripple.remove(),
      });
    }
    onClick?.(e);
  };

  return (
    <button
      ref={setRefs}
      disabled={disabled || loading}
      onClick={handleClick}
      className={[
        'relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl font-heading tracking-wide',
        'transition-all duration-200 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span className="relative z-10">{children}</span>
    </button>
  );
});

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
