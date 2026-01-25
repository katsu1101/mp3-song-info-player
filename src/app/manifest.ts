import {buildManifest}      from "@/config/appMeta";
import type {MetadataRoute} from "next";

/**
 * 特定の構成や状態を表す値を格納するために使用される変数。
 * この変数名は、値が変更される可能性のあるコンテキストや動的挙動に影響を与える可能性があるコンテキストで使用されることを示唆しているが、
 * 現在は固定の文字列値が割り当てられている。
 */
export const dynamic: string = "force-static";

/**
 * データの再検証を行うかどうかを決定するブールフラグ。
 *
 * `true`に設定すると、データが最新であることを確認するために再取得または再チェックが必要であることを示します。
 * `false`に設定すると、現在のデータが有効であると見なされ、再検証が不要であることを意味します。
 */
export const revalidate = false;

/**
 * メタデータマニフェストを生成して返します。
 */
export default function manifest(): MetadataRoute.Manifest {
  return buildManifest();
}
