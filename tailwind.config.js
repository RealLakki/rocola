/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    'bg-gradient-gold',
    'bg-gradient-radial',
    'bg-gradient-warmth',
    'shadow-gold',
    'shadow-gold-sm',
    'shadow-gold-lg',
    'gold-text',
    'gold-border',
  ],
  theme: {
    extend: {
      colors: {
        // ── Paleta ROCOLA — neon / space (violeta eléctrico + cian + rosa) ──
        // Nota: se conservan los NOMBRES de slot (gold/base/ink/teal) para no
        // refactorizar cientos de utilities; solo cambia el hex de cada uno.
        base: {
          DEFAULT:  '#0A0A14',   // Azul-negro profundo (página)
          elevated: '#12121F',   // Superficie (cards, nav)
          card:     '#12121F',
          border:   '#26263D',   // Borde sutil
        },
        // `gold` = violeta eléctrico (CTA, glow, brand)
        gold: {
          DEFAULT: '#A855F7',
          light:   '#C084FC',
          dim:     '#7C3AED',
          deep:    '#4C1D95',
        },
        ink: {
          DEFAULT: '#ECECFF',    // Casi blanco frío (texto)
          mute:    '#9A9AC0',    // Lavanda apagado (secundario)
          dim:     '#5A5A80',    // Muy tenue
        },
        // `teal` = cian eléctrico (acento secundario)
        teal: {
          DEFAULT: '#22D3EE',
          light:   '#67E8F9',
          dim:     '#0891B2',
        },
        // Stub compat
        peach: '#12121F',
        mint:  '#0B2A24',
        cream: '#ECECFF',

        danger:  '#FB2C6B',      // Rosa-rojo neon
        success: '#34D399',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Playfair Display"', 'sans-serif'],
        heading: ['"Space Grotesk"', 'Oswald', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold:         '0 0 18px rgba(168,85,247,0.55), 0 0 40px rgba(168,85,247,0.25)',
        'gold-sm':    '0 0 10px rgba(168,85,247,0.45)',
        'gold-lg':    '0 0 30px rgba(168,85,247,0.65), 0 0 70px rgba(34,211,238,0.25)',
        'gold-inset': 'inset 0 0 20px rgba(168,85,247,0.15)',
        'red-glow':   '0 0 18px rgba(251,44,107,0.55)',
        'teal':       '0 0 18px rgba(34,211,238,0.5)',
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(ellipse at top, rgba(168,85,247,0.20), transparent 60%)',
        'gradient-gold':    'linear-gradient(120deg, #C084FC 0%, #A855F7 45%, #22D3EE 100%)',
        'gradient-warmth':  'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(168,85,247,0.22), transparent 70%)',
        'gradient-teal':    'linear-gradient(135deg, #67E8F9 0%, #22D3EE 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 18px rgba(168,85,247,0.45)' },
          '50%':      { boxShadow: '0 0 40px rgba(168,85,247,0.85), 0 0 60px rgba(34,211,238,0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
