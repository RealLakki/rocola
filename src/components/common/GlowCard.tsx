import type { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: boolean;
}

export function GlowCard({ children, glow = false, className = '', ...rest }: Props) {
  return (
    <div
      className={[
        'rounded-2xl glass p-4 transition-all',
        glow ? 'gold-border' : 'hover:border-gold/30',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
