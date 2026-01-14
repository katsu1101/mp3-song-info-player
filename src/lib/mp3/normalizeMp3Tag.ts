// src/lib/mp3/normalizeMp3Tag.ts
import type {Mp3Meta, Mp3Tag} from "@/types/mp3";

const toTextOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
};

export const normalizeMp3Tag = (meta: Mp3Meta | null | undefined): Mp3Tag => {
  const picture = meta?.picture
    ? {data: meta.picture.data, format: meta.picture.format}
    : null;

  return {
    title: toTextOrNull(meta?.title),
    artist: toTextOrNull(meta?.artist),
    album: toTextOrNull(meta?.album),

    // TODO: readMp3Meta が ALBUMARTIST を返せるようになったらここへ流す
    albumArtist: null,

    trackNo: toNumberOrNull(meta?.trackNo),
    year: toNumberOrNull(meta?.year),
    picture,
  };
};
