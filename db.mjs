// Capa de datos PostgreSQL del server. Reemplaza a src/lib/supabase.ts.
// Devuelve objetos ya mapeados a la forma de la app (camelCase) para que el
// frontend consuma la API sin re-mapear.
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Connection string o piezas sueltas. Por defecto: socket local del VPS.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'rockola',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'rockola',
  max: 10,
});

const q = (text, params) => pool.query(text, params);

const HOUSE_TRACKS = [
  {
    genre: 'popular',
    track: {
      providerId: 'house:popular:arelys-henao:amante-y-amigo',
      title: 'Amante y Amigo',
      artists: ['Arelys Henao'],
      durationMs: 185000,
      imageUrl: 'https://i.ytimg.com/vi/FpMmpJrQIJA/hqdefault.jpg',
      genres: ['Música popular'],
      explicit: false,
      youtubeVideoId: 'FpMmpJrQIJA',
      isOfficial: false,
      hasVideo: true,
    },
  },
  {
    genre: 'popular',
    track: {
      providerId: 'house:popular:luis-alberto-posada:me-tomas-y-me-dejas',
      title: 'Me Tomas y Me Dejas',
      artists: ['Luis Alberto Posada'],
      durationMs: 203000,
      imageUrl: 'https://i.ytimg.com/vi/JoSRCwCkan4/hqdefault.jpg',
      genres: ['Música popular'],
      explicit: false,
      youtubeVideoId: 'JoSRCwCkan4',
      isOfficial: false,
      hasVideo: false,
    },
  },
  {
    genre: 'popular',
    track: {
      providerId: 'house:popular:jessi-uribe:dulce-pecado',
      title: 'Dulce Pecado',
      artists: ['Jessi Uribe'],
      durationMs: 180000,
      imageUrl: 'https://i.ytimg.com/vi/-b21-NCfNzM/hqdefault.jpg',
      genres: ['Música popular'],
      explicit: false,
      youtubeVideoId: '-b21-NCfNzM',
      isOfficial: false,
      hasVideo: true,
    },
  },
  {
    genre: 'ranchera',
    track: {
      providerId: 'house:ranchera:vicente-fernandez:aca-entre-nos',
      title: 'Acá Entre Nos',
      artists: ['Vicente Fernández'],
      durationMs: 196000,
      imageUrl: 'https://i.ytimg.com/vi/Zy89cMj4W68/hqdefault.jpg',
      genres: ['Ranchera'],
      explicit: false,
      youtubeVideoId: 'Zy89cMj4W68',
      isOfficial: true,
      hasVideo: false,
    },
  },
  {
    genre: 'ranchera',
    track: {
      providerId: 'house:ranchera:vicente-fernandez:volver-volver',
      title: 'Volver Volver',
      artists: ['Vicente Fernández'],
      durationMs: 181000,
      imageUrl: 'https://i.ytimg.com/vi/mmS_sqZBXVQ/hqdefault.jpg',
      genres: ['Ranchera'],
      explicit: false,
      youtubeVideoId: 'mmS_sqZBXVQ',
      isOfficial: true,
      hasVideo: false,
    },
  },
  {
    genre: 'ranchera',
    track: {
      providerId: 'house:ranchera:pedro-infante:cielito-lindo',
      title: 'Cielito Lindo',
      artists: ['Pedro Infante'],
      durationMs: 184000,
      imageUrl: 'https://i.ytimg.com/vi/HPF44uH3M88/hqdefault.jpg',
      genres: ['Ranchera'],
      explicit: false,
      youtubeVideoId: 'HPF44uH3M88',
      isOfficial: false,
      hasVideo: true,
    },
  },
  {
    genre: 'banda',
    track: {
      providerId: 'house:banda:banda-ms:el-color-de-tus-ojos',
      title: 'El Color de Tus Ojos',
      artists: ['Banda MS'],
      durationMs: 249000,
      imageUrl: 'https://i.ytimg.com/vi/Mfv1thwO0hw/hqdefault.jpg',
      genres: ['Banda'],
      explicit: false,
      youtubeVideoId: 'Mfv1thwO0hw',
      isOfficial: true,
      hasVideo: true,
    },
  },
  {
    genre: 'banda',
    track: {
      providerId: 'house:banda:arrolladora:el-ruido-de-tus-zapatos',
      title: 'El Ruido de Tus Zapatos',
      artists: ['La Arrolladora Banda El Limón'],
      durationMs: 266000,
      imageUrl: 'https://i.ytimg.com/vi/aR5f59K8R5w/hqdefault.jpg',
      genres: ['Banda'],
      explicit: false,
      youtubeVideoId: 'aR5f59K8R5w',
      isOfficial: true,
      hasVideo: true,
    },
  },
  {
    genre: 'banda',
    track: {
      providerId: 'house:banda:banda-ms:mi-mayor-anhelo',
      title: 'Mi Mayor Anhelo',
      artists: ['Banda MS'],
      durationMs: 218000,
      imageUrl: 'https://i.ytimg.com/vi/WmlJHCzvs_Y/hqdefault.jpg',
      genres: ['Banda'],
      explicit: false,
      youtubeVideoId: 'WmlJHCzvs_Y',
      isOfficial: false,
      hasVideo: true,
    },
  },
  {
    genre: 'corridos',
    track: {
      providerId: 'house:corridos:tigres-del-norte:la-puerta-negra',
      title: 'La Puerta Negra',
      artists: ['Los Tigres del Norte'],
      durationMs: 203000,
      imageUrl: 'https://i.ytimg.com/vi/rryDND06LHU/hqdefault.jpg',
      genres: ['Corridos'],
      explicit: false,
      youtubeVideoId: 'rryDND06LHU',
      isOfficial: true,
      hasVideo: true,
    },
  },
  {
    genre: 'corridos',
    track: {
      providerId: 'house:corridos:eslabon-peso-pluma:ella-baila-sola',
      title: 'Ella Baila Sola',
      artists: ['Eslabon Armado', 'Peso Pluma'],
      durationMs: 166000,
      imageUrl: 'https://i.ytimg.com/vi/7WNwGkgjKV8/hqdefault.jpg',
      genres: ['Corridos'],
      explicit: false,
      youtubeVideoId: '7WNwGkgjKV8',
      isOfficial: false,
      hasVideo: true,
    },
  },
  {
    genre: 'corridos',
    track: {
      providerId: 'house:corridos:natanael-cano:disfruto-lo-malo',
      title: 'Disfruto Lo Malo',
      artists: ['Natanael Cano'],
      durationMs: 202000,
      imageUrl: 'https://i.ytimg.com/vi/1VsfWqiSBBg/hqdefault.jpg',
      genres: ['Corridos'],
      explicit: false,
      youtubeVideoId: '1VsfWqiSBBg',
      isOfficial: false,
      hasVideo: true,
    },
  },
  {
    genre: 'corridos',
    track: {
      providerId: 'house:corridos:el-fantasma:soy-buen-amigo',
      title: 'Soy Buen Amigo',
      artists: ['El Fantasma'],
      durationMs: 156000,
      imageUrl: 'https://i.ytimg.com/vi/cPKAmxB4tzk/hqdefault.jpg',
      genres: ['Corridos'],
      explicit: false,
      youtubeVideoId: 'cPKAmxB4tzk',
      isOfficial: false,
      hasVideo: false,
    },
  },
];

const houseTrack = (genre, track) => ({ genre, track });

// Catálogo ampliado de la casa: temas completos verificados por título,
// artista, duración y metadata de YouTube; sin shorts/reels/clips.
HOUSE_TRACKS.push(
  houseTrack('popular', {
    providerId: 'house:popular:dario-gomez:nadie-es-eterno',
    title: 'Nadie Es Eterno',
    artists: ['Darío Gómez'],
    durationMs: 208000,
    imageUrl: 'https://i.ytimg.com/vi/YIo5Rq8ptFU/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'YIo5Rq8ptFU',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:dario-gomez:sobrevivire',
    title: 'Sobreviviré',
    artists: ['Darío Gómez'],
    durationMs: 221000,
    imageUrl: 'https://i.ytimg.com/vi/tU2cmjNO7og/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'tU2cmjNO7og',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:dario-gomez:entre-comillas',
    title: 'Entre Comillas',
    artists: ['Darío Gómez'],
    durationMs: 191000,
    imageUrl: 'https://i.ytimg.com/vi/0Gg91nmbZZw/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: '0Gg91nmbZZw',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:luis-alberto-posada:basta-con-licor',
    title: 'Basta Con Licor',
    artists: ['Luis Alberto Posada'],
    durationMs: 149000,
    imageUrl: 'https://i.ytimg.com/vi/Ihhxi5-kKvo/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'Ihhxi5-kKvo',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:luis-alberto-posada:el-precio-de-tu-error',
    title: 'El Precio De Tu Error',
    artists: ['Luis Alberto Posada'],
    durationMs: 208000,
    imageUrl: 'https://i.ytimg.com/vi/y0urjj80RL8/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'y0urjj80RL8',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:el-charrito-negro:quererte-fue-un-error',
    title: 'Quererte Fue Un Error',
    artists: ['El Charrito Negro'],
    durationMs: 183000,
    imageUrl: 'https://i.ytimg.com/vi/sK4VXcqozIE/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'sK4VXcqozIE',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:yeison-jimenez:tenias-razon',
    title: 'Tenías Razón',
    artists: ['Yeison Jiménez'],
    durationMs: 227000,
    imageUrl: 'https://i.ytimg.com/vi/PsE37DgAmkg/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'PsE37DgAmkg',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:yeison-jimenez:ya-no-mi-amor',
    title: 'Ya No Mi Amor',
    artists: ['Yeison Jiménez'],
    durationMs: 203000,
    imageUrl: 'https://i.ytimg.com/vi/kn86rBCwiKA/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'kn86rBCwiKA',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:yeison-jimenez:bendecida',
    title: 'Bendecida',
    artists: ['Yeison Jiménez'],
    durationMs: 206000,
    imageUrl: 'https://i.ytimg.com/vi/yYFDRukciSY/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'yYFDRukciSY',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:pipe-bueno:te-hubieras-ido-antes',
    title: 'Te Hubieras Ido Antes',
    artists: ['Pipe Bueno'],
    durationMs: 220000,
    imageUrl: 'https://i.ytimg.com/vi/MLiJ6g7tV7I/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'MLiJ6g7tV7I',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:pipe-bueno:cupido-fallo',
    title: 'Cupido Falló',
    artists: ['Pipe Bueno'],
    durationMs: 209000,
    imageUrl: 'https://i.ytimg.com/vi/kDf5p7raMsc/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'kDf5p7raMsc',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:jessi-uribe:matemos-las-ganas',
    title: 'Matemos Las Ganas',
    artists: ['Jessi Uribe'],
    durationMs: 196000,
    imageUrl: 'https://i.ytimg.com/vi/91u71T61-8k/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: '91u71T61-8k',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:jessi-uribe:repitela',
    title: 'Repítela',
    artists: ['Jessi Uribe'],
    durationMs: 211000,
    imageUrl: 'https://i.ytimg.com/vi/g5KBAYYoKp4/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'g5KBAYYoKp4',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:paola-jara:murio-el-amor',
    title: 'Murió El Amor',
    artists: ['Paola Jara'],
    durationMs: 210000,
    imageUrl: 'https://i.ytimg.com/vi/Rx1NUDfju3E/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'Rx1NUDfju3E',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:paola-jara:salud-por-el',
    title: 'Salud Por Él',
    artists: ['Paola Jara'],
    durationMs: 241000,
    imageUrl: 'https://i.ytimg.com/vi/4ZtIZrRNf48/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: '4ZtIZrRNf48',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:jhonny-rivera:soy-soltero',
    title: 'Soy Soltero',
    artists: ['Jhonny Rivera'],
    durationMs: 163000,
    imageUrl: 'https://i.ytimg.com/vi/OHDfiCZgUy8/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'OHDfiCZgUy8',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:jhonny-rivera:te-extrano',
    title: 'Te Extraño',
    artists: ['Jhonny Rivera'],
    durationMs: 187000,
    imageUrl: 'https://i.ytimg.com/vi/Fs_BnnaEUts/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'Fs_BnnaEUts',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:alzate:maldita-traicion',
    title: 'Maldita Traición',
    artists: ['Alzate'],
    durationMs: 220000,
    imageUrl: 'https://i.ytimg.com/vi/pJhV2p5_lMg/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'pJhV2p5_lMg',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:arelys-henao:senor-prohibido',
    title: 'Señor Prohibido',
    artists: ['Arelys Henao'],
    durationMs: 209000,
    imageUrl: 'https://i.ytimg.com/vi/j7WuUuHbL1c/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: 'j7WuUuHbL1c',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('popular', {
    providerId: 'house:popular:arelys-henao:lo-pasado-pisado',
    title: 'Lo Pasado Pisado',
    artists: ['Arelys Henao'],
    durationMs: 180000,
    imageUrl: 'https://i.ytimg.com/vi/16qJZfxWxRE/hqdefault.jpg',
    genres: ['Música popular'],
    explicit: false,
    youtubeVideoId: '16qJZfxWxRE',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('ranchera', {
    providerId: 'house:ranchera:vicente-fernandez:el-rey',
    title: 'El Rey',
    artists: ['Vicente Fernández'],
    durationMs: 287000,
    imageUrl: 'https://i.ytimg.com/vi/P9rGYI-_Z6Y/hqdefault.jpg',
    genres: ['Ranchera'],
    explicit: false,
    youtubeVideoId: 'P9rGYI-_Z6Y',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('ranchera', {
    providerId: 'house:ranchera:vicente-fernandez:por-tu-maldito-amor',
    title: 'Por Tu Maldito Amor',
    artists: ['Vicente Fernández'],
    durationMs: 280000,
    imageUrl: 'https://i.ytimg.com/vi/gfm2zSgQ8cQ/hqdefault.jpg',
    genres: ['Ranchera'],
    explicit: false,
    youtubeVideoId: 'gfm2zSgQ8cQ',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('ranchera', {
    providerId: 'house:ranchera:vicente-fernandez:mujeres-divinas',
    title: 'Mujeres Divinas',
    artists: ['Vicente Fernández'],
    durationMs: 180000,
    imageUrl: 'https://i.ytimg.com/vi/xa2GLqL12Zk/hqdefault.jpg',
    genres: ['Ranchera'],
    explicit: false,
    youtubeVideoId: 'xa2GLqL12Zk',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('ranchera', {
    providerId: 'house:ranchera:pedro-infante:amorcito-corazon',
    title: 'Amorcito Corazón',
    artists: ['Pedro Infante'],
    durationMs: 184000,
    imageUrl: 'https://i.ytimg.com/vi/bb5K3vpNEvw/hqdefault.jpg',
    genres: ['Ranchera'],
    explicit: false,
    youtubeVideoId: 'bb5K3vpNEvw',
    isOfficial: true,
    hasVideo: false,
  }),
  houseTrack('banda', {
    providerId: 'house:banda:banda-ms:hablame-de-ti',
    title: 'Háblame De Ti',
    artists: ['Banda MS'],
    durationMs: 205000,
    imageUrl: 'https://i.ytimg.com/vi/S5UEoLeza-o/hqdefault.jpg',
    genres: ['Banda'],
    explicit: false,
    youtubeVideoId: 'S5UEoLeza-o',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('banda', {
    providerId: 'house:banda:banda-ms:hermosa-experiencia',
    title: 'Hermosa Experiencia',
    artists: ['Banda MS'],
    durationMs: 237000,
    imageUrl: 'https://i.ytimg.com/vi/ozr3qQRzYl8/hqdefault.jpg',
    genres: ['Banda'],
    explicit: false,
    youtubeVideoId: 'ozr3qQRzYl8',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('banda', {
    providerId: 'house:banda:banda-ms:no-me-pidas-perdon',
    title: 'No Me Pidas Perdón',
    artists: ['Banda MS'],
    durationMs: 283000,
    imageUrl: 'https://i.ytimg.com/vi/-7w9tdzndjc/hqdefault.jpg',
    genres: ['Banda'],
    explicit: false,
    youtubeVideoId: '-7w9tdzndjc',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('banda', {
    providerId: 'house:banda:banda-ms:solo-con-verte',
    title: 'Solo Con Verte',
    artists: ['Banda MS'],
    durationMs: 226000,
    imageUrl: 'https://i.ytimg.com/vi/GOs96LMUCDA/hqdefault.jpg',
    genres: ['Banda'],
    explicit: false,
    youtubeVideoId: 'GOs96LMUCDA',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('banda', {
    providerId: 'house:banda:arrolladora:llamada-de-mi-ex',
    title: 'Llamada De Mi Ex',
    artists: ['La Arrolladora Banda El Limón'],
    durationMs: 187000,
    imageUrl: 'https://i.ytimg.com/vi/7JV81gERDK4/hqdefault.jpg',
    genres: ['Banda'],
    explicit: false,
    youtubeVideoId: '7JV81gERDK4',
    isOfficial: true,
    hasVideo: false,
  }),
  houseTrack('banda', {
    providerId: 'house:banda:arrolladora:ya-es-muy-tarde',
    title: 'Ya Es Muy Tarde',
    artists: ['La Arrolladora Banda El Limón'],
    durationMs: 184000,
    imageUrl: 'https://i.ytimg.com/vi/WXiL_9sHbbc/hqdefault.jpg',
    genres: ['Banda'],
    explicit: false,
    youtubeVideoId: 'WXiL_9sHbbc',
    isOfficial: true,
    hasVideo: false,
  }),
  houseTrack('corridos', {
    providerId: 'house:corridos:tigres-del-norte:contrabando-y-traicion',
    title: 'Contrabando Y Traición',
    artists: ['Los Tigres del Norte'],
    durationMs: 207000,
    imageUrl: 'https://i.ytimg.com/vi/1ocd-A-lItU/hqdefault.jpg',
    genres: ['Corridos'],
    explicit: false,
    youtubeVideoId: '1ocd-A-lItU',
    isOfficial: true,
    hasVideo: false,
  }),
  houseTrack('corridos', {
    providerId: 'house:corridos:tigres-del-norte:jefe-de-jefes',
    title: 'Jefe De Jefes',
    artists: ['Los Tigres del Norte'],
    durationMs: 218000,
    imageUrl: 'https://i.ytimg.com/vi/tKQwOuTiY-A/hqdefault.jpg',
    genres: ['Corridos'],
    explicit: false,
    youtubeVideoId: 'tKQwOuTiY-A',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('corridos', {
    providerId: 'house:corridos:tucanes-de-tijuana:la-chona',
    title: 'La Chona',
    artists: ['Los Tucanes de Tijuana'],
    durationMs: 199000,
    imageUrl: 'https://i.ytimg.com/vi/ULxcmMgsxf4/hqdefault.jpg',
    genres: ['Corridos'],
    explicit: false,
    youtubeVideoId: 'ULxcmMgsxf4',
    isOfficial: true,
    hasVideo: false,
  }),
  houseTrack('corridos', {
    providerId: 'house:corridos:tucanes-de-tijuana:mis-tres-animales',
    title: 'Mis Tres Animales',
    artists: ['Los Tucanes de Tijuana'],
    durationMs: 161000,
    imageUrl: 'https://i.ytimg.com/vi/WzspSfxW1jM/hqdefault.jpg',
    genres: ['Corridos'],
    explicit: false,
    youtubeVideoId: 'WzspSfxW1jM',
    isOfficial: true,
    hasVideo: true,
  }),
  houseTrack('corridos', {
    providerId: 'house:corridos:calibre-50:el-tierno-se-fue',
    title: 'El Tierno Se Fue',
    artists: ['Calibre 50'],
    durationMs: 260000,
    imageUrl: 'https://i.ytimg.com/vi/POcKPEm9hGk/hqdefault.jpg',
    genres: ['Corridos'],
    explicit: false,
    youtubeVideoId: 'POcKPEm9hGk',
    isOfficial: true,
    hasVideo: false,
  }),
  houseTrack('corridos', {
    providerId: 'house:corridos:calibre-50:corrido-de-juanito',
    title: 'Corrido De Juanito',
    artists: ['Calibre 50'],
    durationMs: 261000,
    imageUrl: 'https://i.ytimg.com/vi/VVCeF7AX4WU/hqdefault.jpg',
    genres: ['Corridos'],
    explicit: false,
    youtubeVideoId: 'VVCeF7AX4WU',
    isOfficial: true,
    hasVideo: false,
  }),
);

export async function ensureOperationalTables() {
  await q(`
    create table if not exists external_api_cache (
      namespace text not null,
      cache_key text not null,
      status integer not null,
      data jsonb not null,
      expires_at timestamptz not null,
      updated_at timestamptz not null default now(),
      primary key (namespace, cache_key)
    );
    create index if not exists external_api_cache_exp
      on external_api_cache (namespace, expires_at);
    create table if not exists api_circuit_breakers (
      namespace text primary key,
      blocked_until timestamptz not null,
      reason text,
      updated_at timestamptz not null default now()
    );
    create table if not exists house_tracks (
      provider_id text primary key,
      genre text not null,
      track jsonb not null,
      active boolean not null default true,
      weight integer not null default 1,
      last_picked_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists house_tracks_active_genre
      on house_tracks (active, genre, last_picked_at);
  `);

  for (const item of HOUSE_TRACKS) {
    await q(
      `insert into house_tracks (provider_id, genre, track, active, weight, updated_at)
       values ($1, $2, $3, true, 1, now())
       on conflict (provider_id) do update set
         genre = excluded.genre,
         track = excluded.track,
         active = true,
         updated_at = now()`,
      [item.track.providerId, item.genre, item.track],
    );
  }
}

/* ───────────────────── operational cache / house tracks ───────────────────── */

export async function getApiCache(namespace, cacheKey, { allowStale = false } = {}) {
  const { rows } = await q(
    `select status, data
       from external_api_cache
      where namespace = $1
        and cache_key = $2
        and ($3::boolean or expires_at > now())
      limit 1`,
    [namespace, cacheKey, allowStale],
  );
  return rows[0] ? { status: rows[0].status, data: rows[0].data } : null;
}

export async function setApiCache(namespace, cacheKey, status, data, ttlMs) {
  const ttlSeconds = Math.max(1, Math.ceil(Number(ttlMs) / 1000));
  await q(
    `insert into external_api_cache (namespace, cache_key, status, data, expires_at, updated_at)
     values ($1, $2, $3, $4, now() + ($5::text || ' seconds')::interval, now())
     on conflict (namespace, cache_key) do update set
       status = excluded.status,
       data = excluded.data,
       expires_at = excluded.expires_at,
       updated_at = now()`,
    [namespace, cacheKey, status, data, ttlSeconds],
  );
}

export async function getCircuitBreaker(namespace) {
  const { rows } = await q(
    `select namespace, blocked_until, reason
       from api_circuit_breakers
      where namespace = $1 and blocked_until > now()
      limit 1`,
    [namespace],
  );
  if (!rows[0]) return null;
  return {
    namespace: rows[0].namespace,
    blockedUntil: rows[0].blocked_until instanceof Date
      ? rows[0].blocked_until.toISOString()
      : rows[0].blocked_until,
    reason: rows[0].reason,
  };
}

export async function tripCircuitBreaker(namespace, ms, reason) {
  const blockSeconds = Math.max(1, Math.ceil(Number(ms) / 1000));
  await q(
    `insert into api_circuit_breakers (namespace, blocked_until, reason, updated_at)
     values ($1, now() + ($2::text || ' seconds')::interval, $3, now())
     on conflict (namespace) do update set
       blocked_until = greatest(api_circuit_breakers.blocked_until, excluded.blocked_until),
       reason = excluded.reason,
       updated_at = now()`,
    [namespace, blockSeconds, reason],
  );
}

export async function getRandomHouseTrack({ allowedGenres = [], excludeProviderIds = [] } = {}) {
  const allowed = Array.isArray(allowedGenres) ? allowedGenres.filter(Boolean) : [];
  const excluded = Array.isArray(excludeProviderIds) ? excludeProviderIds.filter(Boolean) : [];
  const { rows } = await q(
    `select provider_id, track
       from house_tracks
      where active = true
        and (cardinality($1::text[]) = 0 or genre = any($1::text[]))
        and not (provider_id = any($2::text[]))
      order by last_picked_at asc nulls first, random()
      limit 1`,
    [allowed, excluded],
  );
  const row = rows[0];
  if (!row) return null;
  await q('update house_tracks set last_picked_at = now() where provider_id = $1', [row.provider_id]);
  return row.track;
}

export async function getHouseTrackByProviderId(providerId) {
  const { rows } = await q(
    `select genre, track
       from house_tracks
      where provider_id = $1 and active = true
      limit 1`,
    [providerId],
  );
  return rows[0] ? { genre: rows[0].genre, track: rows[0].track } : null;
}

/* ───────────────────────────── mappers ───────────────────────────── */

const mapVenue = (r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  allowedGenres: r.allowed_genres ?? [],
  blockedTrackIds: r.blocked_track_ids ?? [],
  requestCooldownSec: r.request_cooldown_sec,
  allowExplicit: r.allow_explicit,
  tipEnabled: r.tip_enabled,
  tipPriceCop: r.tip_price_cop,
});

const mapQueue = (r) => ({
  id: r.id,
  venueId: r.venue_id,
  track: r.track,
  requestedBy: r.requested_by,
  requestedByName: r.requested_by_name ?? undefined,
  position: Number(r.position),
  boosted: r.boosted,
  status: r.status,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
});

/* ───────────────────────────── venues ───────────────────────────── */

export async function getVenueBySlug(slug) {
  const { rows } = await q('select * from venues where slug = $1 limit 1', [slug]);
  return rows[0] ? mapVenue(rows[0]) : null;
}

export async function getVenueById(id) {
  const { rows } = await q('select * from venues where id = $1 limit 1', [id]);
  return rows[0] ? mapVenue(rows[0]) : null;
}

const VENUE_COLS = {
  allowedGenres: 'allowed_genres',
  blockedTrackIds: 'blocked_track_ids',
  requestCooldownSec: 'request_cooldown_sec',
  allowExplicit: 'allow_explicit',
  tipEnabled: 'tip_enabled',
  tipPriceCop: 'tip_price_cop',
  name: 'name',
};

export async function updateVenue(id, patch) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, col] of Object.entries(VENUE_COLS)) {
    if (patch[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      vals.push(patch[key]);
    }
  }
  if (sets.length === 0) return getVenueById(id);
  vals.push(id);
  const { rows } = await q(
    `update venues set ${sets.join(', ')} where id = $${i} returning *`,
    vals,
  );
  return rows[0] ? mapVenue(rows[0]) : null;
}

/* ───────────────────────────── queue ───────────────────────────── */

export async function fetchActiveQueue(venueId) {
  const { rows } = await q(
    `select * from queue_items
      where venue_id = $1 and status in ('queued','playing')
      order by position asc`,
    [venueId],
  );
  return rows.map(mapQueue);
}

export async function enqueueTrack({ venueId, track, requestedBy, requestedByName, boosted }) {
  // position = max+1; boosted usa posicion negativa para ir al frente.
  const { rows: maxRows } = await q(
    `select coalesce(max(position), 0) as max from queue_items
      where venue_id = $1 and status in ('queued','playing')`,
    [venueId],
  );
  const nextPos = Number(maxRows[0].max) + 1;
  const position = boosted ? -Date.now() : nextPos;

  const { rows } = await q(
    `insert into queue_items
       (venue_id, track, requested_by, requested_by_name, position, boosted, status)
     values ($1, $2, $3, $4, $5, $6, 'queued')
     returning *`,
    [venueId, track, requestedBy, requestedByName ?? null, position, boosted ?? false],
  );
  return mapQueue(rows[0]);
}

export async function setItemStatus(id, status) {
  const { rows } = await q(
    'update queue_items set status = $2 where id = $1 returning venue_id',
    [id, status],
  );
  return rows[0]?.venue_id ?? null;
}

export async function removeQueueItem(id) {
  const { rows } = await q(
    'delete from queue_items where id = $1 returning venue_id',
    [id],
  );
  return rows[0]?.venue_id ?? null;
}

export async function boostItem(id) {
  const { rows } = await q(
    'update queue_items set boosted = true, position = $2 where id = $1 returning venue_id',
    [id, -Date.now()],
  );
  return rows[0]?.venue_id ?? null;
}

export async function unboostItem(id, venueId) {
  const { rows: maxRows } = await q(
    `select coalesce(max(position), 0) as max from queue_items
      where venue_id = $1 and status in ('queued','playing') and id <> $2`,
    [venueId, id],
  );
  const newPos = Number(maxRows[0].max) + 1;
  const { rows } = await q(
    'update queue_items set boosted = false, position = $2 where id = $1 returning venue_id',
    [id, newPos],
  );
  return rows[0]?.venue_id ?? null;
}

/* ───────────────────────────── youtube cache ───────────────────────────── */

export async function getCachedYoutubeResolution(providerId) {
  const { rows } = await q(
    'select youtube_video_id, is_official, has_video from youtube_resolutions where provider_id = $1',
    [providerId],
  );
  if (!rows[0]) return null;
  return {
    youtubeVideoId: rows[0].youtube_video_id,
    isOfficial: rows[0].is_official,
    hasVideo: rows[0].has_video,
  };
}

export async function cacheYoutubeResolution(providerId, { youtubeVideoId, isOfficial, hasVideo }) {
  await q(
    `insert into youtube_resolutions (provider_id, youtube_video_id, is_official, has_video, resolved_at)
     values ($1, $2, $3, $4, now())
     on conflict (provider_id) do update set
       youtube_video_id = excluded.youtube_video_id,
       is_official      = excluded.is_official,
       has_video        = excluded.has_video,
       resolved_at      = now()`,
    [providerId, youtubeVideoId, isOfficial, hasVideo],
  );
}

/* ───────────────────────────── analytics ───────────────────────────── */

export async function getTopTracks(venueId, limit = 20) {
  const { rows } = await q(
    `select
        track->>'providerId' as provider_id,
        track->>'title'      as title,
        track->'artists'     as artists,
        track->>'imageUrl'   as image_url,
        coalesce((track->>'durationMs')::int, 0) as duration_ms,
        count(*)::bigint     as request_count,
        max(created_at)      as last_requested
       from queue_items
      where venue_id = $1 and status in ('played','playing')
      group by track->>'providerId', track->>'title', track->'artists',
               track->>'imageUrl', (track->>'durationMs')::int
      order by request_count desc, last_requested desc
      limit $2`,
    [venueId, limit],
  );
  return rows.map((r) => ({
    providerId: r.provider_id,
    title: r.title,
    artists: Array.isArray(r.artists) ? r.artists : [],
    imageUrl: r.image_url,
    durationMs: Number(r.duration_ms ?? 0),
    requestCount: Number(r.request_count),
    lastRequested: r.last_requested instanceof Date ? r.last_requested.toISOString() : r.last_requested,
  }));
}
