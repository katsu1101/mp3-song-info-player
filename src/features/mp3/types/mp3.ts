// src/types/mp3.ts
export type EmbeddedPicture = { data: Uint8Array; format: string };

export type Mp3Tag = {
  title: string | null;
  artist: string | null;
  album: string | null;
  albumArtist: string | null;
  trackNo: number | null;
  year: number | null;
  picture: EmbeddedPicture | null;
  discNo: string | null;
  diskNo: string | null;
  lyrics: string | null;
  lyricsLrc: string | null;
};
