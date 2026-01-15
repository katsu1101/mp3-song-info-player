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
};

/**
 * 旧互換。将来的に Mp3Tag へ統一するため廃止予定。
 * @deprecated Use Mp3Tag instead.
 */
export type Mp3Meta = {
  title?: string;
  artist?: string;
  album?: string;
  trackNo?: number;
  year?: number;
  picture?: { data: Uint8Array; format: string };
  coverUrl?: string;
};
