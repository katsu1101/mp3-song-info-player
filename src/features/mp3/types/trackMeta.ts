// src/types/trackMeta.ts
import type {Mp3Tag} from "@/features/mp3/types/mp3";

/**
 * 旧名互換: metaByPath の型
 * - 中身は Mp3Tag（null統一）に寄せていく
 *
 * TODO: 移行が進んだら tagByPath に改名を検討
 */
export type TrackMetaByPath = Record<string, Mp3Tag>;
