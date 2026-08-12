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
        // ── Paleta neon / space. Los DOS colores de marca vienen del .env de cada
        // deploy (ver src/brand.ts → variables --b1/--b2 y sus tonos). Se conservan
        // los NOMBRES de slot (gold = primario, teal = secundario) para no
        // refactorizar cientos de utilities. Formato rgb(triple / <alpha-value>)
        // para que sigan funcionando los modificadores de opacidad (bg-gold/50…).
        base: {
          DEFAULT:  '#0A0A14',   // Azul-negro profundo (página)
          elevated: '#12121F',   // Superficie (cards, nav)
          card:     '#12121F',
          border:   '#26263D',   // Borde sutil
        },
        // `gold` = color primario de marca
        gold: {
          DEFAULT: 'rgb(var(--b1) / <alpha-value>)',
          light:   'rgb(var(--b1-light) / <alpha-value>)',
          dim:     'rgb(var(--b1-dim) / <alpha-value>)',
          deep:    'rgb(var(--b1-deep) / <alpha-value>)',
        },
        ink: {
          DEFAULT: '#ECECFF',    // Casi blanco frío (texto)
          mute:    '#9A9AC0',    // Lavanda apagado (secundario)
          dim:     '#5A5A80',    // Muy tenue
        },
        // `teal` = color secundario de marca
        teal: {
          DEFAULT: 'rgb(var(--b2) / <alpha-value>)',
          light:   'rgb(var(--b2-light) / <alpha-value>)',
          dim:     'rgb(var(--b2-dim) / <alpha-value>)',
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
        gold:         '0 0 18px rgb(var(--b1) / 0.55), 0 0 40px rgb(var(--b1) / 0.25)',
        'gold-sm':    '0 0 10px rgb(var(--b1) / 0.45)',
        'gold-lg':    '0 0 30px rgb(var(--b1) / 0.65), 0 0 70px rgb(var(--b2) / 0.25)',
        'gold-inset': 'inset 0 0 20px rgb(var(--b1) / 0.15)',
        'red-glow':   '0 0 18px rgba(251,44,107,0.55)',
        'teal':       '0 0 18px rgb(var(--b2) / 0.5)',
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(ellipse at top, rgb(var(--b1) / 0.20), transparent 60%)',
        'gradient-gold':    'linear-gradient(120deg, rgb(var(--b1-light)) 0%, rgb(var(--b1)) 45%, rgb(var(--b2)) 100%)',
        'gradient-warmth':  'radial-gradient(ellipse 80% 60% at 50% -20%, rgb(var(--b1) / 0.22), transparent 70%)',
        'gradient-teal':    'linear-gradient(135deg, rgb(var(--b2-light)) 0%, rgb(var(--b2)) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 18px rgb(var(--b1) / 0.45)' },
          '50%':      { boxShadow: '0 0 40px rgb(var(--b1) / 0.85), 0 0 60px rgb(var(--b2) / 0.4)' },
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
