import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && <div className="text-gold/60 mb-4 text-4xl">{icon}</div>}
      <h3 className="text-lg font-display text-ink mb-1">{title}</h3>
      {description && <p className="text-ink-mute text-sm max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}
