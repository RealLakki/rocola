interface Props<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}

export function Tabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div
      className="flex gap-1 rounded-xl p-1"
      style={{
        background: 'rgba(18,18,31, 0.80)',
        border: '1px solid rgba(168,85,247, 0.22)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-heading uppercase tracking-wider transition-all"
            style={
              active
                ? {
                    background: 'linear-gradient(135deg, #C084FC 0%, #A855F7 50%, #7C3AED 100%)',
                    color: '#0A0A14',
                    fontWeight: 700,
                    boxShadow: '0 0 14px rgba(168,85,247, 0.55)',
                  }
                : { color: '#8A7A60', fontWeight: 500 }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
