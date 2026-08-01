import { useState } from 'react';
import { updateVenue } from '../../lib/api';
import { GlowCard } from '../common/GlowCard';
import { NeonButton } from '../common/NeonButton';
import type { Venue } from '../../lib/types';

interface Props {
  venue: Venue;
  onUpdate: (patch: Partial<Venue>) => void;
}

export function VenueSettings({ venue, onUpdate }: Props) {
  const [cooldown, setCooldown] = useState(venue.requestCooldownSec);
  const [tipPrice, setTipPrice] = useState(venue.tipPriceCop);
  const [allowExplicit, setAllowExplicit] = useState(venue.allowExplicit);
  const [tipEnabled, setTipEnabled] = useState(venue.tipEnabled);
  const [saving, setSaving] = useState(false);

  const dirty =
    cooldown !== venue.requestCooldownSec ||
    tipPrice !== venue.tipPriceCop ||
    allowExplicit !== venue.allowExplicit ||
    tipEnabled !== venue.tipEnabled;

  const save = async () => {
    setSaving(true);
    try {
      const patch = {
        requestCooldownSec: cooldown,
        tipPriceCop: tipPrice,
        allowExplicit,
        tipEnabled,
      };
      await updateVenue(venue.id, patch);
      onUpdate(patch);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlowCard>
      <h3 className="font-heading text-gold uppercase tracking-widest text-xs mb-4">
        Configuración
      </h3>
      <div className="space-y-4">
        <Field label="Cooldown entre pedidos (seg)">
          <input
            type="number"
            min={0}
            max={1800}
            value={cooldown}
            onChange={(e) => setCooldown(parseInt(e.target.value || '0', 10))}
            className="bg-base-card border border-base-border rounded-lg px-3 py-2 w-24 text-ink text-sm outline-none focus:border-gold/50"
          />
        </Field>
        <Field label="Precio tip-to-skip (COP)">
          <input
            type="number"
            min={0}
            step={1000}
            value={tipPrice}
            onChange={(e) => setTipPrice(parseInt(e.target.value || '0', 10))}
            disabled={!tipEnabled}
            className="bg-base-card border border-base-border rounded-lg px-3 py-2 w-32 text-ink text-sm outline-none focus:border-gold/50 disabled:opacity-50"
          />
        </Field>
        <Toggle label="Permitir tip-to-skip" value={tipEnabled} onChange={setTipEnabled} />
        <Toggle label="Permitir explicit content" value={allowExplicit} onChange={setAllowExplicit} />
      </div>
      {dirty && (
        <div className="mt-5 flex justify-end">
          <NeonButton size="sm" variant="primary" loading={saving} onClick={save}>
            Guardar
          </NeonButton>
        </div>
      )}
    </GlowCard>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <label className="text-ink-mute text-sm">{label}</label>
    {children}
  </div>
);

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <label className="text-ink-mute text-sm">{label}</label>
    <button
      onClick={() => onChange(!value)}
      className={[
        'relative w-11 h-6 rounded-full transition-all',
        value ? 'bg-gradient-gold shadow-gold-sm' : 'bg-base-elevated',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-base shadow transition-all',
          value ? 'translate-x-5' : '',
        ].join(' ')}
      />
    </button>
  </div>
);
