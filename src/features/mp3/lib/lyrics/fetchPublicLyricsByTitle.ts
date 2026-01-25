// src/features/mp3/lib/lyrics/fetchPublicLyricsByTitle.ts
import {lyrics, lyricsRules} from "@/features/mp3/const/lyrics";

const normalize = (s: string): string =>
  s.normalize("NFKC").toLowerCase().trim();

/**
 * 指定されたタイトルに基づいて公開されている歌詞テキストを取得します。
 *
 * この関数は、正規化された提供タイトルに一致するルールを`lyricsRules`リスト内で検索します。
 * 一致するルールが見つかった場合、関連する歌詞テキストを`lyrics`コレクションから取得します。
 * 一致するルールまたはテキストが見つからない場合、関数はnullを返します。
 *
 * @param {string} title - 検索対象の歌詞のタイトル。
 * @returns {Promise<string | null>} 歌詞テキストが見つかった場合に解決するプロミス、
 * 一致するものがなかった場合はnullを返す。
 */
export const fetchPublicLyricsByTitle = async (title: string): Promise<string | null> => {
  const t = normalize(title);

  const rule = lyricsRules.find((r) => t.includes(normalize(r.keyword)));
  if (!rule) return null;

  const text = lyrics[rule.key]; // inFlightLyricsByFileName.get(rule.fileName);
  if (!text) return null;

  return text;
};

