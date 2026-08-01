/**
 * El núcleo de la calidad del producto: dado un set de candidatos de YouTube,
 * elegir el que más probablemente sea el video oficial de la canción que el
 * cliente buscó. Sin esto, la app reproduce lives, covers y lyric videos.
 */

import type { TrackSearchResult } from '../lib/types';

export interface YoutubeCandidate {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  durationMs: number;
  viewCount: number;
  publishedAt: string;
  /** ¿El canal está marcado como "official artist"? Solo lo sabemos por heurística. */
  channelLooksOfficial: boolean;
}

export interface ScoredCandidate {
  candidate: YoutubeCandidate;
  score: number;
  reasons: string[];
  isOfficial: boolean;
  hasVideo: boolean;
}

const NEGATIVE_KEYWORDS = [
  'live', 'en vivo', 'concert', 'concierto', 'cover', 'karaoke',
  'instrumental', 'reaction', 'reacción', 'tutorial', 'how to',
  'sped up', 'slowed', 'nightcore', '8d audio', 'bass boosted',
  'mashup', 'parody', 'parodia', 'fan made',
];

const CLIP_KEYWORDS = [
  'shorts', 'short', 'reel', 'reels', 'tiktok', 'tik tok',
  'whatsapp', 'estado', 'status', 'clip', 'fragmento', 'fragment',
  'adelanto', 'preview', 'teaser',
];

const MIN_SONG_VIDEO_MS = 90_000;
const MAX_SONG_VIDEO_MS = 12 * 60_000;

/**
 * Modificadores de versión: si aparecen en el CANDIDATO pero NO en el track
 * pedido, es señal de que es una versión distinta (remix, extended, acústica,
 * etc.) y la penalizamos. Si el user explicitamente pidió "Bichota Remix",
 * NO penaliza.
 */
const VERSION_MODIFIERS = [
  'remix', 'version', 'versión', 'extended', 'edit',
  'acoustic', 'acustico', 'acústico', 'unplugged',
  'piano version', 'live session', 'remastered',
];

// "Audio Oficial" tiene prioridad MÁXIMA — empieza inmediato sin intro.
// Los videos oficiales muchas veces tienen 30-60s de intro cinemática.
const AUDIO_KEYWORDS = ['official audio', 'audio oficial', 'audio only'];
const VIDEO_KEYWORDS = ['official video', 'video oficial', 'official music video'];

const VEVO_SUFFIX = /VEVO$/i;
// Canales auto-generados por YouTube (ej. "Santiago Giraldo - Topic"). No
// tienen video real, solo audio con portada del álbum. Los penalizamos para
// que el video oficial gane cuando existe.
const TOPIC_SUFFIX = /\s*-\s*Topic$/i;

const normalize = (s: string) =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function normalizedPhraseIn(phrase: string, blob: string): boolean {
  const safe = normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s)${safe}(\\s|$)`, 'i').test(blob);
}

export function getCandidateRejectionReasons(
  candidate: YoutubeCandidate,
  track?: TrackSearchResult,
): string[] {
  const reasons: string[] = [];
  const titleNorm = normalize(candidate.title);
  const channelNorm = normalize(candidate.channelTitle);
  const blob = `${titleNorm} ${channelNorm}`;

  if (candidate.durationMs > 0 && candidate.durationMs < MIN_SONG_VIDEO_MS) {
    reasons.push('duration:too_short');
  }
  if (candidate.durationMs > MAX_SONG_VIDEO_MS) {
    reasons.push('duration:too_long');
  }
  for (const kw of CLIP_KEYWORDS) {
    if (normalizedPhraseIn(kw, blob)) reasons.push(`clip:${kw}`);
  }

  if (track?.durationMs && candidate.durationMs > 0) {
    const candidateSec = candidate.durationMs / 1000;
    const trackSec = track.durationMs / 1000;
    const diffSec = trackSec - candidateSec;
    if (candidateSec < trackSec * 0.65 && diffSec > 45) {
      reasons.push('duration:short_vs_track');
    }
  }

  return reasons;
}

export function isUsableSongCandidate(
  candidate: YoutubeCandidate,
  track?: TrackSearchResult,
): boolean {
  return getCandidateRejectionReasons(candidate, track).length === 0;
}

export function scoreCandidate(
  candidate: YoutubeCandidate,
  track: TrackSearchResult,
): ScoredCandidate {
  let score = 0;
  const reasons: string[] = [];
  const titleNorm = normalize(candidate.title);
  const channelNorm = normalize(candidate.channelTitle);
  const trackTitleNorm = normalize(track.title);
  const artistNorms = track.artists.map(normalize);

  const rejectionReasons = getCandidateRejectionReasons(candidate, track);
  if (rejectionReasons.length > 0) {
    return {
      candidate,
      score: -999,
      reasons: rejectionReasons,
      isOfficial: false,
      hasVideo: false,
    };
  }

  // 1) Match de título.
  // Heurística: las palabras largas (>=5 letras) son "anclas" — diferencian
  // canciones del mismo artista. Las cortas suelen ser comunes (mis, tres,
  // los, mi, tu, el, la, etc) y compartirlas no significa que sea la misma
  // canción. Ej: "Mis Tres Viejas" vs "Mis Tres Animales" comparten "mis"
  // y "tres" pero la palabra ancla "viejas" no matchea — rechazar.
  if (titleNorm.includes(trackTitleNorm)) {
    score += 30;
    reasons.push('title:exact');
  } else {
    const allWords = trackTitleNorm.split(' ').filter((w) => w.length > 2);
    const anchorWords = allWords.filter((w) => w.length >= 5);
    const matchedAll = allWords.filter((w) => titleNorm.includes(w)).length;
    const matchedAnchors = anchorWords.filter((w) => titleNorm.includes(w)).length;

    if (anchorWords.length > 0) {
      if (matchedAnchors === anchorWords.length) {
        // Todas las palabras ancla matchean — probablemente la canción correcta
        const ratio = matchedAll / Math.max(allWords.length, 1);
        score += 14 + ratio * 12;
        reasons.push(`title:anchors(${matchedAnchors}/${anchorWords.length})`);
      } else {
        // Falta alguna palabra ancla → casi seguro otra canción del artista
        score -= 30;
        reasons.push(`title:missing_anchor(${matchedAnchors}/${anchorWords.length})`);
      }
    } else {
      // Track sin palabras largas (ej. titulos cortos como "Yo Yo")
      // exigir match de todas las cortas
      const ratio = matchedAll / Math.max(allWords.length, 1);
      if (ratio >= 0.85) {
        score += 18;
        reasons.push(`title:short_match(${matchedAll}/${allWords.length})`);
      } else {
        score -= 30;
        reasons.push(`title:weak_short(${matchedAll}/${allWords.length})`);
      }
    }
  }

  // 2) Match de artista — el más crítico junto con título.
  // Si NINGUNO de los artistas del track aparece NI en título NI en canal,
  // probablemente sea un cover/version de otro artista — penalizar fuerte.
  const artistInTitle = artistNorms.some((a) => titleNorm.includes(a));
  const artistInChannel = artistNorms.some((a) => channelNorm.includes(a));
  if (artistInTitle) { score += 18; reasons.push('artist:title'); }
  if (artistInChannel) { score += 30; reasons.push('artist:channel'); }
  if (!artistInTitle && !artistInChannel) {
    score -= 30;
    reasons.push('artist:none');
  }

  // 3) Canal VEVO oficial — peso muy fuerte
  if (VEVO_SUFFIX.test(candidate.channelTitle)) {
    score += 40;
    reasons.push('channel:vevo');
  }

  // 4) Tipo de versión + match de duración (combinados).
  // Logica: si la duración del video coincide casi exacto con el track real,
  // NO tiene intro larga — entonces preferimos el VIDEO sobre el audio.
  // Solo cuando el video dura mucho más, preferimos el audio oficial.
  const diffSec = (candidate.durationMs - track.durationMs) / 1000;
  const absDiff = Math.abs(diffSec);
  const isExactDuration = absDiff <= 5;
  const isCloseDuration = absDiff <= 12;
  const isLongVideo = diffSec > 15;

  const isAudioVersion = AUDIO_KEYWORDS.some((kw) => titleNorm.includes(kw));
  const isVideoVersion = VIDEO_KEYWORDS.some((kw) => titleNorm.includes(kw));

  if (isVideoVersion && isExactDuration) {
    // Caso ideal: video oficial sin intro — preferido SIEMPRE
    score += 35;
    reasons.push('video+exact_duration');
  } else if (isVideoVersion && isCloseDuration) {
    score += 18;
    reasons.push('video+close_duration');
  } else if (isAudioVersion && isLongVideo) {
    // Audio oficial es preferido cuando el video tiene intro larga
    score += 28;
    reasons.push('audio_avoids_long_intro');
  } else if (isAudioVersion) {
    score += 18;
    reasons.push('audio_official');
  } else if (isVideoVersion) {
    score += 8;
    reasons.push('video_official');
  } else if (isExactDuration) {
    // No es ni "official audio" ni "official video" en titulo, pero la
    // duración matchea — probablemente es la canción correcta sin label.
    score += 10;
    reasons.push('exact_duration');
  } else if (isCloseDuration) {
    score += 4;
    reasons.push('close_duration');
  }

  // 5) Negativos — penalizan duro
  for (const kw of NEGATIVE_KEYWORDS) {
    if (titleNorm.includes(kw)) {
      score -= 35;
      reasons.push(`neg:${kw}`);
    }
  }

  // 5b) Versión distinta — solo penaliza si el modifier está en el candidato
  // pero NO en lo que pidió el user (asimétrico).
  for (const mod of VERSION_MODIFIERS) {
    const inCandidate = titleNorm.includes(mod);
    const inTrack = trackTitleNorm.includes(mod);
    if (inCandidate && !inTrack) {
      score -= 35;
      reasons.push(`version_mismatch:${mod}`);
    }
  }

  // 6) Penalty fuerte por duraciones muy distintas (intro/outro larga, extended)
  if (diffSec > 30) { score -= 25; reasons.push('duration:very_long'); }
  if (absDiff > 60) { score -= 25; reasons.push('duration:way_off'); }

  // 7) Popularidad como tiebreaker (log para no aplastar todo lo demás)
  if (candidate.viewCount > 0) {
    score += Math.min(Math.log10(candidate.viewCount), 9);
  }

  // 8) Bonus si el canal "parece oficial" (lo marca el resolver con badge)
  if (candidate.channelLooksOfficial) {
    score += 15;
    reasons.push('channel:looks_official');
  }

  // 9) Topic channels (auto-generados por YouTube, solo audio + portada).
  // Penalizamos para que cuando exista un video oficial real, ese gane.
  // Si NO hay alternativa con video, el Topic igual puede ganar como fallback.
  const isTopicChannel = TOPIC_SUFFIX.test(candidate.channelTitle);
  if (isTopicChannel) {
    score -= 12;
    reasons.push('channel:topic');
  }

  const hasOfficialKw = reasons.some((r) =>
    r.startsWith('title:official') || r.startsWith('title:audio oficial') || r.startsWith('title:video oficial'),
  );
  const isOfficial =
    VEVO_SUFFIX.test(candidate.channelTitle) ||
    isTopicChannel || // Topic SÍ es oficial (lo sube la disquera), solo no tiene video
    candidate.channelLooksOfficial ||
    (artistInChannel && hasOfficialKw);

  // Solo es "audio-only" si tiene la frase oficial — no la palabra "audio"
  // suelta (un video oficial puede decir "[Audio HD]" en el título).
  // Si el título es "Lyric Video" o "Letra", también es solo texto + arte.
  // Topic channels NO tienen video real (solo portada estática).
  const isLyricOnly = /\b(lyric video|video lyric|video letra|letra oficial)\b/i.test(candidate.title);
  const isAudioOnly = isAudioVersion || isLyricOnly || isTopicChannel;
  const hasVideo = !isAudioOnly;

  return { candidate, score, reasons, isOfficial, hasVideo };
}

export function pickBestCandidate(
  candidates: YoutubeCandidate[],
  track: TrackSearchResult,
): ScoredCandidate | null {
  if (candidates.length === 0) return null;
  const scored = candidates
    .map((c) => scoreCandidate(c, track))
    .filter((s) => s.score > -999);
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
