# Handoff: mp3-song-info-player（次チャット: JSONファイル読み込み）

## ゴール（次チャットでやること）
- **音声ファイルと同名の JSON ファイル**（例: `song.mp3` ↔ `song.json`）をローカルから読み込み、`metaByPath` / `TrackView` に反映して表示できるようにする。
- 既存の **タグ読み込み（music-metadata）** や **外部 .txt 歌詞** と競合しないように、**上書きルールを明確化**して実装する。

---

## ここまでの到達点（現状）
### ✅ 走査を scanMediaTree へ寄せた
- 旧 `readMp3FromDirectory` の置き換えを進行中。
- `scanMediaTree(directoryHandle, basePath)` でディレクトリを再帰走査し、`bundles`（SidecarBundle）を生成する。
- `readLibraryFromDirectory(handle, "")` で `scanResult + items(Mp3Entry[])` を返す構造にした。

### ✅ ソートは「ファイル相対パス」で確定
- `Intl.Collator("ja", { numeric: true, sensitivity: "base" })` でセグメント比較して、年フォルダ等でまとまるようにした。
- ルート直下にファイルを出していたのが「年でまとまらない」原因だったが、テスト用配置変更と判明し解決。

### ✅ 画像（アルバム/トラック）対応
- `scanMediaTree` 側で画像ファイルを拾い、バンドルへ格納する流れを採用。
- ディレクトリ代表画像は `folder.* / artwork.* / album.*` 等を優先する方針で、正規表現の優先順位配列を用意。
  - `normalizeStem()` + `getPriority()` で評価。
  - `AlbumArtSmall.jpg` / `Folder.jpg` 等も除外はしないが **優先度は低め**にする。
- 「artwork.jpg が選ばれたはずなのに別が表示」の原因は **アルバム画像が先頭曲ジャケットを優先していた**ため。
  - アルバム表示は **dirArtworkUrlByDir を最優先**に修正する方針。

### ✅ 外部歌詞（.txt）対応（読み込みワーカー）
- `.txt` のみ対応（.lrcは後回し）。
- `Mp3Entry` に `lyricsTextHandle?: FileSystemFileHandle` を追加し、`readLibraryFromDirectory` で `bundle.lyricsTxt?.handle` を紐付け済み。
- `startLyricsTextWorker` を作成済み：
  - `FileSystemFileHandle.getFile()` → `.arrayBuffer()` → `TextDecoder` で UTF-8→shift_jis などデコード検討（ブラウザ差あり）。
  - BOM除去 / 改行統一。
  - **「未設定なら補完」**かつ **「.txt を優先」**にする方針が固まった。
- ただし、外部 .txt が反映されない問題があり、原因として **タグ読み込み（runMetaScanner）が後から metaByPath を丸ごと上書き**している可能性が高い。
  - 解決策：`runMetaScanner` 側は **既に値が入っている項目は上書きしない**（空欄のみ埋める）へ寄せる。
  - 例外：`lyrics` は `.txt` を最優先で上書きする（空txtは除外）。

---

## 現在の重要仕様（上書きルール）
### 基本ルール
- **既に値が入っている項目は上書きしない**（タグ/外部情報は「補完」扱い）
  - ※ 初期メタのダミー値（例: `title = fileHandle.name`）があると「値あり判定」になってしまうので注意。
  - 推奨：初期 `title` は `""` にし、UI表示は `title || entry.name` にする等、placeholder扱いを分離する。

### 例外（歌詞）
- `lyrics` は **外部 `.txt` を最優先**（タグUSLTより優先）
- `.txt` が空/空白のみの場合は反映しない（既存を壊さない）

---

## 実装の起点（関連ファイル）
- `src/lib/mp3/library/buildMp3Library.ts`
  - `readLibraryFromDirectory(handle, "")` で `scanResult + items` を取得
  - `startTrackArtworkWorker` / `startDirArtworkWorker` / `runMetaScanner` を起動
  - 歌詞ワーカー `startLyricsTextWorker` をここから起動する想定
- `src/lib/fsAccess/scanMediaTree.ts`
  - 走査で `bundles` を作る
  - `.txt` は `bundle.lyricsTxt` に入れる
  - 画像も `bundle.trackImage` 等に入れる（優先順位は別途）
- `src/features/mp3/lib/readMp3Meta.ts`
  - `music-metadata` でタグ読み込み
  - USLT/SYLT を `pickNativeText` で優先取得
  - SJIS文字化け修復 (`repairSjisIfNeeded`) を持つ
- `src/lib/mp3/workers/startLyricsTextWorker.ts`
  - 外部 `.txt` 読み込み worker（runIdRefでキャンセル、yieldあり）

---

## TODO（次チャットでやる：JSON）
### TODO 1: scanMediaTree で JSON を拾う
- `*.json`（同名）を SidecarBundle に追加で保持する
  - 例: `bundle.sidecarJson = { path, handle }`
- 拡張子セットを追加（例 `SIDECAR_JSON_EXT = new Set(["json"])`）

### TODO 2: Mp3Entry に JSON handle を紐付ける
- `Mp3Entry` に追加案：
  - `sidecarJsonHandle?: FileSystemFileHandle;`
- `readLibraryFromDirectory` の `items` 作成時に `bundle.sidecarJson?.handle` を付与

### TODO 3: JSON を読み込む worker を作る
- `startSidecarJsonWorker(items, runIdRef, runId, setMetaByPath)` 的に作成
- 読み込み：
  - `handle.getFile()` → `file.text()` → `JSON.parse`
  - 失敗時は握りつぶしではなく、**最低限のログ**（開発時のみ）を出す
- 反映ルール：
  - 基本：既に値があれば上書きしない（補完）
  - 例外がある場合は明示（歌詞は別ルールで既に確定）

### TODO 4: runMetaScanner の「丸ごと上書き」を修正
- `metaByPath[path] = newMeta` の完全上書きがあるなら、**項目ごとの merge**へ変更
- 「既に値ありは上書きしない」を共通関数化する案：
  - `fillIfEmpty` / `mergeDefined` など

---

## 相談ポイント（次チャットで決める）
1) JSON のスキーマ（想定）
  - 例: `{ title, artist, album, year, trackNo, lyrics, artworkImageFileName, ... }`
  - どの項目を扱うか（最初は最小でOK）
2) JSON の優先順位
  - タグより優先するか？（基本は補完）
  - 歌詞は `.txt` 優先のまま維持でOKか？
3) 初期メタの placeholder 取り扱い
  - `title = ""` にするか、placeholder判定関数を作るか

---

## 次チャット開始時に貼ると良いもの
- `scanMediaTree.ts`（最新）
- `SidecarBundle` / `ScanMediaTreeResult` 型定義
- `Mp3Entry` 型定義（lyricsTextHandle 追加済みのもの）
- `runMetaScanner` の `setMetaByPath` 更新部分（上書き問題の修正用）
- JSON のサンプル1つ（実際に置く予定の形式）

---
