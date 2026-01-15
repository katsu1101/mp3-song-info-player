# Handoff (mp3-song-info-editor)

# 引継ぎメモ：アルバム情報の一括管理（今後の修正方針）

## 目的
- ライブラリ内の「アルバム情報」を一括管理し、後で「アルバム一覧UI」を実装できる状態にする。
- 進捗読み込み（メタ後追い）に合わせて、仮想アルバムから実アルバムへ“後から再分類”できる設計にする。

---

## 現状（2026-01-14時点の整理）
### 現在のデータフロー（ざっくり）
1. メインフォルダ選択
2. サブフォルダ含めてMP3をスキャン（mp3List）
3. dir cover worker（フォルダ代表画像）
4. meta worker（MP3タグ読み込み + cover URL生成）
5. Fantia TSV（mappingByPrefixId）は表示側で参照（タグへ混ぜない方針）

### 直近の型整理
- `Covers` は `src/types/covers.ts` に分離済み
- `TrackMetaByPath` は `Record<string, Mp3Tag>` に寄せる方針（タグは null 統一）
- `Mp3Meta` は互換として残しつつ `@deprecated` 予定（必要なら）

### Fantia方針（固定）
- Fantia由来情報（title / releaseYm / originalArtist）を MP3タグの album/artist に“ねじ込まない”
- 表示では Fantia TSV の title を最優先（文字化け救済がアプリ出発点のため）
  - `displayTitle = fantiaTitle ?? tagTitle ?? fileName`

---

## アルバム集約：要件（合意済み）
### アルバムキー
- 基本キーは `albumArtist + albumTitle`（両方ある場合）
- ただし `effectiveAlbumArtist = albumArtist ?? artist` は **やらない**
  - 合同アルバム等があるため、勝手に albumArtist を補完しない

### 「アルバム扱い」の優先順位（最新）
> いったんこれで実装し、問題が出たら対処する

- まず「タグ/情報からのアルバム候補」を見る（title only / albumArtist only を含む）
- 次に「サブフォルダ」を仮想アルバム扱い
- 次に「メインフォルダ直下の artist」を弱い仮想アルバム扱い
- それも無ければ「なし」

さらに補足：
- メインフォルダ直下で artist のみの曲は、アーティストごとに
  - `"<アーティスト名>（未分類）"` の仮想アルバムへ仮置きする

---

## 実装方針（重要）
### 1) “最初はフォルダで仮想アルバム” を作る
- スキャン直後（metaがまだ無い段階）でもアルバム一覧UIが作れるように、
  - `dirKey`（フォルダ）単位で仮想アルバムを作る
  - トラックは一旦そこに所属させる

### 2) meta後追いで、アルバム所属を更新できるようにする
- 1曲ずつタグが揃うたびに
  - そのトラックの「アルバム候補キー」を再計算
  - 必要なら所属アルバムを移動させる
- workerキャンセル（runId）に対応し、古い更新を反映しない

### 3) “アルバム集約” は表示側ではなくライブラリ側で持つ
- `useTrackViews` は副作用なしの表示整形に徹する
- アルバム一覧UIを作るため、`useMp3Library` から `albums`（集約済み）を返す

---

## 追加予定の型（案）
### AlbumKey（文字列キー）
- 例：`"aa:<albumArtist>|al:<albumTitle>"` / `"al:<albumTitle>"` など
- “何で集約したか” を保持しておくとUIやデバッグが楽

### AlbumInfo（最低限）
- `key: string`
- `kind: "tag" | "dir" | "artist-unclassified" | "none"` など
- `albumTitle: string | null`
- `albumArtist: string | null`
- `dirKey: string | null`（仮想アルバム由来なら）
- `cover: { type: "embedded" | "dir" | "none"; url: string | null }`
- `trackPaths: string[]`（または trackIds）

### TrackInfo（最終的に）
- `path, dirKey`
- `tag: Mp3Tag`
- `fantiaEntry: FantiaMappingEntry | null`（ただしタグに混ぜない）
- `display: { title, artist, albumTitle, albumArtist, ... }`（UI用）

※ただし、段階実装のため最初は `AlbumInfo` だけでもOK

---

## アルバムキー決定ロジック（TODO込みの骨格）
### 入力
- `tag: Mp3Tag`
- `dirKey`（フォルダ情報）
- `isInRoot`（メインフォルダ直下かどうか）
- `artist`（tag.artist）

### 出力
- `{ albumKey: string | null, kind: ... }`

### ルール（最新版反映）
1. タグ由来の候補（title only / albumArtist only を含む）を優先
  - (a) albumArtist + albumTitle
  - (b) albumTitle only
  - (c) albumArtist only
  - (d) artist only（※ root直下の扱いは後述）
2. サブフォルダは仮想アルバム（dirKey）
3. root直下で artist がある場合は `"<artist>（未分類）"` 仮想アルバム
4. それも無ければ none

TODO:
- 「タグ候補」と「dir候補」の優先順位は、実データで問題が出たら見直す
- “artist only” をタグ候補として使うとアルバム数が増える可能性があるので、必要なら条件追加

---

## 実装ステップ（次チャットでやる順番）
### Step A：アルバム集約を最小で導入（フォルダ仮想アルバムのみ）
- `useMp3Library` に `albums` state を追加
- スキャン後、`dirKey` 単位で Album を生成
- track→album の所属を作る（paths配列など）

### Step B：meta後追いで再分類（タグ候補を反映）
- meta更新（1曲分）が入ったタイミングで `updateAlbumAssignment(path)` を呼ぶ
- 旧所属から外して新所属に追加（不要アルバムは掃除）
- runId を見て古い更新は破棄

### Step C：アルバム一覧UIへ
- `albums` を `AlbumList` で表示できるようにする
- 並び順：kind → albumArtist → albumTitle → dirKey など（暫定でOK）

---

## 触るファイル候補（目安）
- `src/hooks/useMp3Library.ts`（albumsを返す、reset時に初期化）
- `src/lib/mp3/library/buildMp3Library.ts`（初期アルバム生成を入れるなら）
- `src/lib/mp3/workers/startMetaWorker.ts`（meta更新時に“再分類トリガ”を渡すなら）
- `src/types/album.ts`（新規：AlbumInfo, AlbumKey）
- `src/lib/mp3/album/*`（新規：集約ロジック置き場）

---

## 既知の注意点
- `useTrackViews` は副作用（setState）を入れない（過去にsetter混入でコンパイルエラーが出た）
- Fantiaはタグに混ぜない（表示合成で救済）
- 合同アルバム対策として `albumArtist ?? artist` の補完は禁止

---
