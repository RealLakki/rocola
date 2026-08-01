# MEMORY · Branding de La Cantina Plus

Snapshot completo del aspecto y configuración que tenía el proyecto antes de
generalizarlo para demos a clientes. Si en algún momento se quiere restaurar
la versión personalizada para el local "La Cantina Plus · Cartagena", todo lo
que sigue debe replicarse.

> Generado: mayo 2026, antes del commit que generaliza el proyecto.

---

## 1. Identidad

- **Nombre comercial:** La Cantina Plus
- **Tagline / slug usado en URLs:** `la-cantina-plus`
- **Localidad mostrada en footer:** `Cartagena`
- **Subtítulo de splash y badge:** `CARTAGENA · DESPECHO & POPULAR`
- **Slogan principal (hero Landing):** `La música la pones tú.`
- **Subtexto hero:** "Escanea el QR de tu mesa, busca lo que quieras escuchar
  y agrégalo a la rocola digital de la cantina. Sin levantarte, sin esperas,
  sin que el DJ te ignore."
- **CTA Landing:** `🎵 Entrar a la cantina` / `Panel del local`
- **Botón nav admin:** `Soy un bar →`
- **Features grid (Landing):**
  - 📲 "Escanea el QR — Sin app. Solo cámara y a pedir."
  - 🎶 "Tu cancha musical — Vallenato, popular, despecho, lo que mande la mesa."
  - ⚡ "Pasa al frente — Propina al mesero y tu canción suena ya."
- **Estado vacío de cola (QueueList):** "La cantina te escucha" + "Nadie ha
  pedido música todavía. Busca tu canción arriba y sé tú el que rompa el silencio."
- **Footer CustomerView:** `Sonando en La Cantina Plus · Cartagena`
- **Footer Landing:** `La Cantina Plus · Cartagena` con enlaces
  `@lacantinaplusctg` (Instagram) y `lacantinaplus.com`
- **Card customer "Las de siempre"** (HouseArtistsCard): título
  `Las de siempre`, subtítulo `Artistas de la casa`

---

## 2. Paleta de colores (Tailwind `theme.extend.colors`)

```js
base: {
  DEFAULT: '#0F0D0A',   // Negro Cantina (fondo)
  elevated: '#1C1712',  // Oscuro Cálido (cards, nav)
  card:     '#1C1712',
  border:   '#2C2418',  // Borde sutil
},
gold: {
  DEFAULT: '#C89B3C',   // Dorado principal
  light:   '#F0C060',   // Hover / activo
  dim:     '#9A7728',   // shade más oscuro
  deep:    '#7A5C1A',   // gradient end
},
ink: {
  DEFAULT: '#F5F0E8',   // Crema texto
  mute:    '#8A7A60',   // Barro muted
  dim:     '#5C4F3C',   // muy tenue
},
danger:  '#B91C1C',     // Rojo Despecho
success: '#5C8A3C',     // verde tierra
```

### Gradients
```js
'gradient-radial':  'radial-gradient(ellipse at top, rgba(200,155,60,0.14), transparent 60%)',
'gradient-gold':    'linear-gradient(135deg, #F0C060 0%, #C89B3C 50%, #7A5C1A 100%)',
'gradient-warmth':  'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(200,155,60,0.18), transparent 70%)',
```

### Shadows
```js
'gold':       '0 0 18px rgba(200,155,60,0.45), 0 0 36px rgba(200,155,60,0.18)',
'gold-sm':    '0 0 8px rgba(200,155,60,0.35)',
'gold-lg':    '0 0 28px rgba(200,155,60,0.55), 0 0 56px rgba(200,155,60,0.25)',
'gold-inset': 'inset 0 0 18px rgba(200,155,60,0.12)',
'red-glow':   '0 0 18px rgba(185,28,28,0.5)',
```

### Body background (en `src/index.css`)
```css
background-image:
  radial-gradient(ellipse 80% 50% at 50% -20%, rgba(200,155,60,0.16), transparent 70%),
  radial-gradient(ellipse 60% 50% at 100% 100%, rgba(185,28,28,0.08), transparent 70%);
```

### Scrollbar / selection
- Scrollbar: `rgba(200,155,60,0.30)` (hover `0.55`)
- Selection: `rgba(200,155,60,0.40)` con texto `#F5F0E8`

### `meta theme-color` (index.html)
`#0F0D0A`

---

## 3. Tipografías (Google Fonts)

```js
display: ['"Playfair Display"', 'Georgia', 'serif'],   // títulos italic
heading: ['Oswald', '"Arial Narrow"', 'sans-serif'],   // labels uppercase
body:    ['Inter', 'system-ui', 'sans-serif'],
sans:    ['Inter', 'system-ui', 'sans-serif'],
```

Pesos cargados: Playfair Display 700i / 900i, Oswald 400/500/600, Inter 300/400/500/600.

---

## 4. Logo

**Concepto:** medallón vintage con letra **C** y sombrero de cowboy encima,
sobre patrón de 12 triángulos rotados (anillo decorativo) en dorado
`#C89B3C` sobre fondo oscuro.

- Archivos: `public/logo.png` y `public/logo.webp` (versión raster con glow).
- Favicon SVG: `public/favicon.svg` (versión vectorial inline del medallón).
- Componente: `src/components/common/CantinaLogo.tsx` — renderiza un
  `<picture>` con WebP+PNG fallback, recorte circular vía `clipPath:
  circle(48%)`, opcional `glow` (halo dorado detrás).
- En componentes se referencia como:
  - Splash de intro: `size=240`
  - Hero Landing: `size=220 glow`
  - AdminGate: `size=96 glow`
  - Nav: `size=42`
  - Footer customer: `size=36`
  - Reproductor TV overlay: `size=200 glow`

`AnimatedLogo` (spinner de carga) usa 4 barras tipo equalizer en gradient
`#F0C060 → #7A5C1A` con `drop-shadow` dorado.

---

## 5. Artistas de la casa (HOUSE_ARTISTS)

En `src/lib/houseArtists.ts`:
```js
[
  { name: 'Charrito Negro',        searchTerm: 'Charrito Negro' },
  { name: 'Luis Alberto Posada',   searchTerm: 'Luis Alberto Posada' },
  { name: 'Yeison Jiménez',        searchTerm: 'Yeison Jimenez' },
  { name: 'Andariego',             searchTerm: 'Andariego' },
  { name: 'Paola Jara',            searchTerm: 'Paola Jara' },
  { name: 'Jessi Uribe',           searchTerm: 'Jessi Uribe' },
]
```

Música popular colombiana / despecho. Estos eran los artistas que rellenaban
la cola cuando estaba vacía y aparecían en la card "Las de siempre" del
customer view.

---

## 6. Géneros / filtros

La enum `Genre` y todas las maps (`GENRE_LABEL`, `GENRE_KEYWORDS`,
`GENRE_LASTFM_TAGS`) **se mantienen tal cual** — soportan todos los géneros
(reggaeton, salsa, vallenato, champeta, popular, ranchera, banda, corridos,
etc.). El sesgo "popular/despecho" estaba solo en el venue de La Cantina, en
`venue.allowedGenres` en la BD.

Para restaurar el filtro de La Cantina, setear en Supabase para ese venue:
```
allowedGenres = ['popular', 'ranchera', 'vallenato', 'champeta', 'salsa']
```
(o el que se haya estado usando — chequear en `admin/genre-settings` del
local antes de cambiar nada).

---

## 7. Identificadores externos

- Dominio: `lacantinaplus.com`
- Instagram: `@lacantinaplusctg` (https://www.instagram.com/lacantinaplusctg/)
- Slug del venue principal: `la-cantina-plus`
- Clave admin (hardcoded en `AdminGate`): `3123`
- LocalStorage keys (transparentes al usuario, no urgente cambiarlas):
  `cantina:intro-shown`, `cantina:cid`, `cantina:cname`,
  `cantina:lastReq:<venueId>`

---

## 8. Componente clave referenciado

- `IntroSplash.tsx` → `TITLE_LETTERS = 'LA CANTINA PLUS'.split('')`,
  `SUBTITLE = 'CARTAGENA · DESPECHO & POPULAR'`.
- `index.html` → `<title>La Cantina Plus — La música la pones tú</title>`,
  `meta theme-color="#0F0D0A"`.
- `package.json` → `"name": "cantina-musica"`.

---

## 9. Cómo restaurar todo esto

1. `git log --oneline` → buscar el commit "ui: generalizar para demo (quitar
   branding La Cantina)".
2. `git revert <hash>` o `git checkout <hash>^ -- <archivos>` para los
   archivos que se quieran restaurar.
3. Alternativa: rama nueva desde el commit anterior a la generalización.
4. Re-uploadear los binarios `public/logo.png` y `public/logo.webp` (NO
   están en git LFS — están como blobs normales, deberían estar intactos
   en el historial).
