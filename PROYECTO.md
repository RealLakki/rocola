# Rockola Digital — Documentación completa

App de **rockola / jukebox digital para bares**: los clientes escanean un QR en su
mesa, buscan canciones desde su celular y las agregan a una cola compartida que
suena en una pantalla/TV del local. Sin apps, sin cuentas. El admin del local
controla la cola y el reproductor.

Marca actual: **La Cantina Plus** (`musica.wailus.co`). Este doc sirve para
entender todo el proyecto y **clonarlo para otro negocio** (ver §8).

---

## 1. Qué hace (funcionalidades)

**Cliente (celular, `/v/:slug`)**
- Busca canciones por título/artista (catálogo iTunes) o artista → álbumes → temas.
- Filtro de género por local: solo deja pedir los géneros que el bar permite.
- Fallback "Buscar en YouTube" y pegar link de YouTube directo (para temas nicho).
- Agrega a la cola; ve la cola en vivo y qué suena ahora.
- Cooldown entre pedidos por cliente; card de "artistas de la casa"; top más pedidas.
- Aviso de tip (propina para saltar al frente — el cobro es físico en la barra).
- Tour guiado la primera vez.

**Reproductor / TV (`/admin/:slug/player`)**
- Reproduce los videos de YouTube en 2 iframes con **crossfade** entre canciones.
- QR siempre visible para que la gente pida desde la mesa.
- Auto-fill "de la casa" cuando la cola queda vacía (evita silencios).
- Auto-skip de videos bloqueados/no reproducibles; detección de "stuck".
- Visualizer dorado cuando el tema es solo-audio.

**Admin (`/admin/:slug`)**
- PIN de acceso (hardcoded, ver §8).
- Gestiona la cola: subir al frente (boost), quitar, saltar, bloquear canción.
- Control remoto del reproductor desde otra pestaña/dispositivo (play/pausa/skip/volumen).
- Ajustes del local: géneros permitidos, explicit sí/no, cooldown, tip, canciones bloqueadas.
- Top canciones más pedidas.

**Landing (`/`)** — página de marketing con animaciones GSAP.

---

## 2. Arquitectura (todo autohospedado en un VPS)

```
Navegador (cliente / admin / TV)
        │  HTTPS / WSS
        ▼
   Nginx (443, dominio + SSL Let's Encrypt)   ── reverse proxy ──►
        ▼
   Express  server.mjs  (Node, puerto 3100, gestionado por PM2)
        ├─ sirve el frontend estático (dist/) + SPA fallback
        ├─ /api/* proxies externos: iTunes, Last.fm, YouTube
        │     (con cache + retry + circuit-breaker + rotación de keys + scrape)
        ├─ /api/* data API: venues, queue, top-tracks, youtube-resolutions, house-track
        └─ socket.io: realtime de la cola + control del reproductor
        ▼
   PostgreSQL (local, solo localhost)
```

No usa Supabase ni Vercel (se migró; ver historial §7). Todo vive en el VPS.

---

## 3. Stack tecnológico

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS. Animaciones GSAP y anime.js.
  Router: react-router-dom. QR: `qrcode`. Reproductor: YouTube IFrame API.
- **Backend**: Node + Express (`server.mjs`), `pg` (PostgreSQL), `socket.io`,
  `express-rate-limit`, `dotenv`.
- **DB**: PostgreSQL 16.
- **Infra**: Nginx + PM2 + Certbot (SSL) en un VPS Ubuntu.
- **APIs externas**: iTunes Search (búsqueda/metadata, gratis, sin key),
  Last.fm (tags de género, key gratis), YouTube Data API v3 (reproducción; key con cuota).

Scripts: `npm run dev` (Vite), `npm run build` (`tsc --noEmit && vite build`),
`node server.mjs` (server). `scripts/cleanup.mjs` limpia histórico viejo (cron semanal).

---

## 4. Rutas y roles

| Ruta | Rol |
|---|---|
| `/` | Landing (marketing) |
| `/v/:slug` | Vista cliente (pedir canciones) |
| `/admin/:slug` | Panel admin del local (PIN) |
| `/admin/:slug/player` | Reproductor para la TV |

`:slug` identifica el local (venue). Un mismo deploy puede servir varios locales,
cada uno con su slug, géneros y config.

---

## 5. APIs externas y resiliencia

Todas pasan por el server (`/api/*`) — las keys nunca se exponen al cliente.

- **iTunes Search** (`/api/itunes-search`): catálogo y metadata. Sin key. Apple
  limita por IP del servidor.
- **Last.fm** (`/api/lastfm-track`, `/api/lastfm-artist`): tags de género finos
  para el filtro. Key gratis.
- **YouTube Data API v3** (`/api/youtube-search`, `/api/youtube-videos`): resuelve
  cada canción a un video reproducible. **Cuota: 10.000 unidades/día, search = 100 →
  ~100 búsquedas/día por key.**

**Mecanismos que evitan que se caiga en saturación** (todo en `server.mjs`):
- **Cache** en memoria + en Postgres (`external_api_cache`): búsquedas repetidas = 0 llamadas.
- **Dedup de requests en vuelo**: 10 personas buscando lo mismo = 1 sola llamada.
- **Retry con backoff** ante 429/5xx/respuesta no-JSON (throttle de Apple).
- **Serve-stale**: si el upstream falla, sirve el cache viejo en vez de romper.
- **Circuit breaker** (`api_circuit_breakers`): pausa una API que está fallando.
- **YouTube multi-key**: `YOUTUBE_API_KEYS=k1,k2,...` con failover por cuota
  (cada key de un proyecto Google distinto = +100 búsquedas/día).
- **YouTube fallback sin cuota**: si todas las keys se agotan, hace **scraping** de
  la página de resultados de YouTube (ilimitado, gratis).
- **iTunes nunca devuelve error de búsqueda al cliente**: si falla y no hay cache,
  devuelve resultado vacío (la UI ofrece "Buscar en YouTube").

---

## 6. Base de datos (PostgreSQL)

Schema en `db/schema.sql`. Tablas:

- **`venues`** — cada local: `slug`, `name`, `allowed_genres[]`, `blocked_track_ids[]`,
  `request_cooldown_sec`, `allow_explicit`, `tip_enabled`, `tip_price_cop`.
- **`queue_items`** — cola + histórico: `venue_id`, `track` (jsonb), `requested_by`,
  `position`, `boosted`, `status` (`queued|playing|played|skipped`).
- **`youtube_resolutions`** — cache providerId (iTunes) → youtube_video_id (ahorra cuota).
- **`house_tracks`** — catálogo preaprobado para el autofill (no depende de APIs en vivo).
- **`external_api_cache`** + **`api_circuit_breakers`** — cache persistente y protección
  de las APIs externas.

Sin RLS (Postgres solo escucha en localhost; el server es la única capa que escribe).
El realtime lo da socket.io (no la DB): el server emite `queue:changed` / `venue:changed`
al room del venue tras cada escritura, y relaya `player:cmd` (admin → reproductor).

---

## 7. Historial de versiones (qué cambió en cada etapa)

### Etapa 1 — MVP "La Cantina Plus" (Supabase + Vercel)
- `Initial commit` — rocola digital base: cliente pide, cola en vivo (Supabase Realtime),
  reproductor YouTube, admin. Búsqueda vía Spotify/iTunes; playback YouTube.
- `serve logo as WebP` — logo optimizado (997KB → 98KB).
- `QR en la TV` — QR escaneable en la vista del reproductor.
- `refresh queue + REPLICA IDENTITY FULL` — realtime de DELETE en la cola.

### Etapa 2 — Filtro de género
- `Last.fm tag enrichment` — tags finos por canción (iTunes es muy grueso).
- `add 'popular' (despecho) + 'ranchera'` — géneros para música colombiana/mexicana.
- `strict matching regional mexican vs latin` + `ranchera = popular(CO)/ranchera(MX)` +
  `word-boundary tag match` + `drop generic 'popular' tag` — afinado del matching.

### Etapa 3 — Analytics y cache
- `cache resolutions in Supabase` — cachea la resolución YouTube (ahorra cuota entre sesiones).
- `top tracks ranking` + `quick-add` — canciones más pedidas + botón de agregar rápido.

### Etapa 4 — Reproductor robusto
- `paste YouTube URL` — pegar link directo de YouTube.
- `house artists card + HUD compacto + límite de cola` — UX del cliente.
- `cross-tab remote control` (Supabase broadcast) — controlar el player desde el admin.
- `QR siempre visible + auto-skip bloqueados + house auto-filler` — nada de silencios.
- `stuck detection`, `audio leak fix`, `pre-fetch backup track`, `crossfade` — reproducción fluida.

### Etapa 5 — Proxy backend (CORS iOS)
- `backend proxy for iTunes and Last.fm` — resuelve CORS en iOS Safari y oculta keys.

### Etapa 6 — Pivotes de marca (demo/rebrand)
- `generalizar para demo (quitar branding La Cantina)` → marca neutral "Jukebox".
- `paleta negro + cian neon` — look tech.
- `migrate to VPS with Express + GSAP` — **se deja Vercel y se pasa a VPS con `server.mjs`**;
  animaciones premium; splash más rápido.
- `vintage jukebox americana palette`, `rebrand a El Bafle`, `favicon bafle` — marca "El Bafle".

### Etapa 7 — Vuelta a La Cantina + todo al VPS (estado actual)
- `filtro determinista + reintento Last.fm + market CO` — arregla el "a veces filtra a veces no"
  (Last.fm no cachea errores; reintenta; búsqueda con `country=CO`).
- `revertir El Bafle → La Cantina Plus` — vuelve el branding dorado/negro, logo medallón,
  splash y artistas de la casa; **conservando** toda la infra/UX de El Bafle.
- `migrate: Supabase → PostgreSQL + socket.io` — **se elimina Supabase**: BD propia en el VPS
  + realtime con socket.io. Se quita Vercel del repo.
- `gen_random_uuid nativo (PG13+)` — sin extensión pgcrypto.
- `cache + retry + serve-stale + dedup en proxies` — resiliencia ante saturación (Apple/Last.fm).
- `Fix cantina filters and house autoplay` + `Expand curated house catalog` — guard de género
  server-side, catálogo `house_tracks` para el autofill sin depender de APIs, cache persistente
  en Postgres + circuit breaker.
- `youtube: rotación multi-key + fallback scrape sin cuota` — YouTube no se cae por cuota.
- `guard permisivo ante género desconocido` — deja de rechazar populares/corridos agregados
  por YouTube (sin género de iTunes); solo rechaza con señal positiva de otro género.

---

## 8. Guía de clonado para OTRO negocio

Objetivo: levantar una instancia idéntica con otra marca, otro dominio y otro local.

### 8.1 Código y branding
1. Clona el repo (o crea uno nuevo a partir de este).
2. **Branding** (busca y reemplaza):
   - Nombre "La Cantina Plus" → tu marca: `index.html` (title), `IntroSplash.tsx`
     (`TITLE_LETTERS`, `SUBTITLE`), `Landing.tsx`, `GuideTour.tsx`, `AppLogo.tsx`,
     `CustomerView.tsx` (footer), `package.json` (name).
   - **Paleta**: `tailwind.config.js` (colores `gold`/`base`/`ink` + shadows/gradients)
     y `src/index.css` (gradientes body, scrollbar, glass, gold-text). Cambia los hex.
   - **Logo/favicon**: reemplaza `public/logo.png`, `public/logo.webp`, `public/favicon.svg`.
   - **Slug del local**: en `Landing.tsx` las rutas usan un slug (ej. `la-cantina-plus`) →
     cámbialo por el slug del nuevo negocio (o hazlo genérico).
   - **Artistas de la casa / catálogo**: `src/lib/houseArtists.ts` y `HOUSE_TRACKS` en `db.mjs`.
   - **PIN admin**: `src/components/admin/AdminGate.tsx` → `ADMIN_PASSWORD` (actual `'3123'`).
   - Referencias `Referer: 'https://musica.wailus.co/'` en `server.mjs` → tu dominio.

### 8.2 Servidor (VPS Ubuntu)
Requisitos: Node ≥20, PostgreSQL, Nginx, PM2 (`npm i -g pm2`), Certbot.

```bash
# 1) Postgres: crear DB y usuario
sudo -u postgres psql -c "CREATE ROLE rockola LOGIN PASSWORD 'UNA_CLAVE_FUERTE';"
sudo -u postgres createdb -O rockola rockola

# 2) Código
git clone <TU_REPO> /home/ubuntu/MiNegocio && cd /home/ubuntu/MiNegocio
npm ci

# 3) Cargar schema (y seed opcional)
PGPASSWORD='UNA_CLAVE_FUERTE' psql -h localhost -U rockola -d rockola -f db/schema.sql

# 4) Crear el venue del negocio
PGPASSWORD='UNA_CLAVE_FUERTE' psql -h localhost -U rockola -d rockola -c \
 "insert into venues (slug,name,allowed_genres,request_cooldown_sec,tip_price_cop)
  values ('mi-negocio','Mi Negocio','{popular,ranchera,banda,corridos}',60,5000);"

# 5) Build y arranque con PM2
npm run build
pm2 start ecosystem.config.cjs   # ajusta 'name' y PORT en ese archivo
pm2 save
```

### 8.3 `.env` (en la raíz del proyecto, NO se commitea)
```
PORT=3100
PGHOST=localhost
PGPORT=5432
PGUSER=rockola
PGPASSWORD=UNA_CLAVE_FUERTE
PGDATABASE=rockola
# YouTube: varias keys (proyectos Google distintos) separadas por coma
YOUTUBE_API_KEYS=AIza_key1,AIza_key2
# Last.fm (gratis en https://www.last.fm/api/account/create)
VITE_LASTFM_API_KEY=tu_lastfm_key
```

### 8.4 API keys
- **YouTube**: en Google Cloud Console → habilita "YouTube Data API v3" → crea API keys
  (idealmente restringidas por HTTP referrer a tu dominio). Cada proyecto = +100 búsquedas/día;
  pon 2-4 en `YOUTUBE_API_KEYS`. Si se agotan, el scrape cubre igual.
- **Last.fm**: crea una key gratis y ponla en `VITE_LASTFM_API_KEY`.
- iTunes no necesita key.

### 8.5 Nginx + dominio + SSL
Apunta el dominio (registro A) al IP del VPS. Config de Nginx (reverse proxy con WebSocket):
```nginx
server {
  server_name tu-dominio.com;
  location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # necesario para socket.io
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }
  listen 80;
}
```
Luego `sudo certbot --nginx -d tu-dominio.com` para el SSL.

### 8.6 Configurar el local (desde la app)
Entra a `/admin/<slug>` con el PIN y ajusta: **géneros permitidos**, explicit,
cooldown, tip, canciones bloqueadas. Imprime el QR de `/v/<slug>` para las mesas y
abre `/admin/<slug>/player` en la TV.

### 8.7 Checklist para "clonar perfecto"
- [ ] Branding (nombre, paleta, logo, favicon, splash) reemplazado en todos los archivos de §8.1.
- [ ] Slug del venue cambiado en `Landing.tsx` y creado en la DB.
- [ ] `Referer` en `server.mjs` = tu dominio (para las keys restringidas de YouTube).
- [ ] `.env` con Postgres + `YOUTUBE_API_KEYS` + `VITE_LASTFM_API_KEY`.
- [ ] `db/schema.sql` cargado; venue insertado con sus géneros.
- [ ] PM2 con nombre único y `PORT` propio (si compartes VPS con otras apps).
- [ ] Nginx + dominio + SSL.
- [ ] PIN de admin cambiado.
- [ ] `house_tracks` / artistas de la casa acordes al negocio (opcional).

---

## 9. Operación (recordatorio rápido)

- **Redesplegar**: `git pull && npm ci && npm run build && pm2 restart <app> --update-env`.
- **Logs**: `pm2 logs <app>`.
- **DB**: `psql -h localhost -U rockola -d rockola`.
- **Limpieza de histórico** (cron semanal): `node scripts/cleanup.mjs`.
- **Si el botón de YouTube falla**: casi siempre es cuota agotada → agrega otra key a
  `YOUTUBE_API_KEYS` o espera el reset (medianoche hora Pacífico). El scrape debería cubrir igual.
