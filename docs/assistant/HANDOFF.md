# Handoff: mp3-song-info-player（次チャット: mp3tag編集機能）

## 目的
- 次チャットでは **mp3tag編集機能（タイトル/アーティスト/アルバム等の書き込み）** を実装する。
- 直近の混乱点（Fantia優先・原曲/歌唱者の意味混線・アルバム再構成の副作用）を踏まえ、**責務分離と更新量最小**で進める。

---

## 現状の重要な前提（壊さない）
### ✅ TrackViewの意味
- `originalArtist` は **原曲（カバー元）のアーティスト** を意図していた（歌唱者ではない）。
- 歌唱者（通常の artist 表示）と原曲アーティストが混線しやすいので、編集UIでどちらを扱うか要注意。

### ✅ アルバム優先順位（方針）
アルバム種別の優先度:
1. Fantiaアルバム（将来/または既存mapping）
2. MP3tagアルバム
3. フォルダアルバム
4. アルバムアーティストアルバム（後で）
5. アーティストアルバム（後で）
6. 未分類

---

## 現状のアルバム構築コード（起点）
### `src/lib/mp3/album/buildAlbumViewsFantiaFirst.ts`
- 現状は「Fantia→dir」の想定の名残があるが、実装は実質フォルダグルーピング中心。
- ここに mp3tagアルバム分岐を追加した経緯がある。
- `AlbumView.kind` を固定 `"dir"` にしてしまうバグが入りやすいので注意（グループkindを反映させること）。

### `src/lib/mp3/album/buildDirAlbumViews.ts`
- `albumTitle`（旧albumName）ベースで `tag:` / `dir:` / `misc:` を作る実装案がある。
- ルート(dirKey=="")を `dir:__ROOT__` として扱う案あり。

---

## mp3tag読み込みの実装（重要）
### `src/lib/mp3/workers/startMetaWorker.ts`
- 現状: `items` を順に
  - `entry.fileHandle.getFile()`
  - `readMp3Meta(file)` でタグ取得
  - `tag.picture` から `createCoverUrl()` で objectURL生成→ `setCoverUrlByPath`（既存があれば上書きしない）
  - `setMetaByPath({[entry.path]: tag})`
  - `yieldToBrowser()` でUIブロック回避
- `runIdRef` によるキャンセルで古い実行を中断する（progressive読み込み）。

### Fantiaは「完全スキップ」ではなく **後回し**
- “読まない”ではなく **後回しにする** 方針へ変更。
- `startMetaWorker` に以下を追加する案で合意:
  - `shouldDeferTag?: (entry: Mp3Entry) => boolean;`
  - 2パス処理（通常→deferred）で Fantia対象を最後に読む
- Fantia判定は `isFantiaTarget(path, fantiaByPrefixId)` のような純関数を想定（prefixId + TSV辞書など）。

---

## 命名整理
- `shouldReadTag` は意図とズレるので **`shouldDeferTag`** が適切（後回しの意味が直球）。
- `albumName` は一般的でない可能性があり、プロジェクト内では **`albumTitle`** に統一した。

---

## 直近の症状/学び（編集機能に影響）
### 1) アーティスト/原曲の優先順位が崩れた
- Fantia情報が mp3tag より優先になり、表示の優先順位が変化してしまったことがある。
- 原因候補: Fantiaの値を `TrackView` の基本表示フィールドへ“上書き”してしまう設計。
- 対策方針:
  - Fantiaは「原曲/並び順/アルバム判定」など **用途別に別フィールド**で保持し、mp3tagの表示フィールドを上書きしない。

### 2) アルバムタイトルが取れなくなる現象
- 数時間前まで取れていた `albumTitle` が取れなくなることがあった。
- 修正を元に戻すと取れる＝どこかの変更で `meta→TrackView` 反映が壊れた可能性が高い。
- したがって、編集機能の前に「タグ読み→反映」経路を崩さないことが最優先。

---

## 次チャット: mp3tag編集機能（やること）
### ゴール
- UIで曲のタグ（title/artist/albumTitle/trackNo/discNo/year/albumArtist 等）を編集し、ファイルに書き戻せるようにする。
- 変更後、一覧表示・アルバム表示（tag/dir/Fantia）に反映される。

### 重要設計方針（ベストプラクティス寄り）
- “読み込み”（read）と “書き込み”（write）を分離する（副作用の混入を防ぐ）。
- 書き込みは **1曲単位**・**明示的操作（保存ボタン）**で実行（自動保存は後回し）。
- progressive読み込み中でも安全にする（runIdRefとの干渉を避ける）。

---

## TODO（次チャット開始時に貼ると良いもの）
- `readMp3Meta` の戻り型（Mp3Tag）と、書き込みに必要なフィールド（ID3v2.3/2.4、文字コードなど）。
- `metaByPath` の型定義（`src/types/trackMeta.ts`）と、どこで `TrackView` に合成しているか（`useTrackViews.ts` 該当箇所）。
- どのUIで編集するか（TrackRow内の編集モード / 右ペイン / モーダル等）の現在案。
- Fantia判定の根拠（prefixId抽出規則、TSV辞書の構造、どこで読み込んでいるか）。

---

## 参考ファイル一覧
- `src/lib/mp3/workers/startMetaWorker.ts`（タグ読み込み・cover生成）
- `src/lib/mp3/readMp3Meta.ts`（タグ解析）
- `src/lib/mp3/album/buildAlbumViewsFantiaFirst.ts`（アルバムviews生成 起点候補）
- `src/lib/mp3/album/buildDirAlbumViews.ts`（tag/dir/miscグルーピング案）
- `src/lib/mp3/album/sortAlbumTracks.ts`（アルバム内ソート）
- `src/types/views.ts`（TrackView）
- `src/types/mp3.ts`（Mp3Tag）
- `src/types/albumView.ts`（AlbumView / AlbumTrackRow）
- `src/components/TrackList/TrackList.tsx`（アルバム表示UI）

---
