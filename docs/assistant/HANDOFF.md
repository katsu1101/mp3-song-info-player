# Handoff: mp3-song-info-editor（次チャット: 歌詞ファイル読み込み）

## ゴール（次チャットでやること）

- **音声ファイルと同名の歌詞ファイル**をローカルから読み込み、`TrackView`（または `metaByPath`）に反映して表示できるようにする。
- 対象はまず **「べた書き歌詞」**（例: `.txt`）を優先し、必要なら `.lrc`（同期歌詞）も後追いで対応する。
- 既存の mp3tag（USLT/SYLT）読み込みと競合させず、**外部歌詞ファイルは“追加情報”として上書き方針を明確化**する。

---

## 背景・前提

- 既に `TrackView` には歌詞用フィールドが存在する:
    - `lyrics?: string | null;`（USLT等の非同期歌詞）
    - `lyricsLrc?: string | null;`（SYLT等の同期/LRC相当）
- `Mp3Tag` 側にも `lyrics` / `lyricsLrc` がある:
    - `lyrics: string | null;`
    - `lyricsLrc: string | null;`
- 既存のタグ読み込みは `startMetaWorker.ts` で `readMp3Meta(file)` を呼び、`setMetaByPath` に保存している（progressive +
  runIdRefキャンセルあり）。

---

## 要件（今回の仕様）

### 対象ファイル

- 基本:
    - べた書き: `*.txt`（同名）
    - 同期歌詞: `*.lrc`（同名、後回しでもOK）
- 追加候補（将来）:
    - `.lyrics`, `.lrx` など（扱い未確定なので今回は除外推奨）

### 優先順位（上書きルール）

- 外部歌詞は “タグの歌詞” と競合しやすいので、まずは以下の方針が安全:
    1) **外部 `.lrc` があれば `lyricsLrc` に入れる**（タグより優先 or タグが無いときのみ、どちらか決める）
    2) **外部 `.txt` があれば `lyrics` に入れる**（タグより優先 or タグが無いときのみ）
- 最小リスク案（おすすめ）:
    - **タグ側が存在する場合は上書きしない**
    - 外部歌詞は「タグが無いときの補完」扱い（予期せぬ表示変化を防ぐ）

---

## 実装の起点（どこに追加するか）

### 起点候補A（おすすめ: 更新量少・設計が自然）

- `startMetaWorker.ts` に “歌詞ファイル読み込み” を追加する（タグ読み込みと同じ流れで `setMetaByPath` を更新）
    - `entry.fileHandle` から `getFile()` しているので、同ディレクトリの別ファイルを探すには追加ロジックが必要
    - File System Access API上、同階層のファイル取得には「親ディレクトリHandle」が必要になりがち
- そのため、A案は「親ディレクトリhandleが手元にある」場合に適する

### 起点候補B（現実的: FS Accessの制約に合わせる）

- **ディレクトリ走査（scan）時に同名歌詞も拾って `Mp3Entry` と紐付ける**
    - 例: `scanMp3` / `readMp3FromDirectory` / `buildMp3Library` など、ファイル一覧を列挙している地点
    - そこで `xxx.mp3` に対して `xxx.txt` / `xxx.lrc` の `FileSystemFileHandle` を見つけ、`Mp3Entry` に関連付ける
    - 以後 `startMetaWorker` は `entry.lyricsHandle` のようなものがあれば読むだけ（責務がきれい）

> 次チャットでの最短は **B案（走査時に紐付け）** が成功率高い。  
> ただし変更箇所が増える場合は、A案で「同階層検索可能な情報を引数で渡す」方向も検討。

---

## データ構造（追加案）

### `Mp3Entry` に歌詞ハンドルを追加（案）

- 例:
    - `lyricsTextHandle?: FileSystemFileHandle;`
    - `lyricsLrcHandle?: FileSystemFileHandle;`

もしくは、pathベースに寄せるなら:

- `lyricsTextPath?: string;`
- `lyricsLrcPath?: string;`
  （ただし実体取得はhandleが必要なので、handle保持の方が扱いやすい）

---

## 実装タスク（次チャットのTODO）

### TODO 1: 歌詞ファイルの探索（走査時）

- 同一ディレクトリ内で、拡張子違い同名ファイルを探索:
    - `basename.mp3` → `basename.txt` / `basename.lrc`
- 見つかったら `Mp3Entry` に紐付け

### TODO 2: 歌詞ファイルを読み込む（worker側）

- `FileSystemFileHandle.getFile()` → `file.text()` で読み込み
- BOM/改行の正規化（最小限）:
    - `\r\n` → `\n`
    - 先頭の UTF-8 BOM があれば除去
- 反映は `setMetaByPath` で `lyrics` / `lyricsLrc` を“補完”する形（上書きしない方針なら条件付き）

### TODO 3: 表示反映

- `useTrackViews` が `metaByPath[path].lyrics / lyricsLrc` を `TrackView` に反映しているか確認
- UI表示（歌詞パネル等）があるなら、そこに表示

---

## 注意点（File System Access API）

- `FileSystemFileHandle` からは「兄弟ファイルの列挙」ができないため、同名歌詞探索は基本的に
    - 親ディレクトリを列挙してマップ化する
    - 走査時に一緒に拾って紐付ける
      が必要。
- すでにディレクトリ走査で `handle.entries()` しているなら、そこで同名歌詞も拾うのが一番自然。

---

## 参考（関連ファイル）

- `src/lib/mp3/workers/startMetaWorker.ts`（タグ読み込み、setMetaByPath更新）
- `src/lib/fsAccess/scanMp3.ts` / `src/lib/fsAccess/readMp3FromDirectory.ts`（走査起点候補）
- `src/lib/mp3/library/buildMp3Library.ts`（一覧生成/worker起動の集約）
- `src/types/views.ts`（TrackView: lyrics / lyricsLrc）
- `src/types/mp3.ts`（Mp3Tag: lyrics / lyricsLrc）
- `src/types/mp3Entry.ts`（歌詞handleを追加するならここ）

---

## 次チャット開始時に貼ると良いもの

- `Mp3Entry` の現行型（`src/types/mp3Entry.ts`）
- 走査処理（ディレクトリ列挙）をしている関数の該当部分（`scanMp3` / `readMp3FromDirectory` / `buildMp3Library` のどれか）
- 歌詞の表示UIがどこにあるか（あれば該当コンポーネント）

---
