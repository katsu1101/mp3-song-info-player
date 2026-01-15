# Handoff (mp3-song-info-editor)

# 引継ぎメモ：アルバム表示（フォルダ仮想アルバム）〜次チャットへ

## いまやっていること（目的）
- 左ペインに「アルバム」トグル（`settings.ui.showAlbums`）を追加済み。
- アルバム一覧UIは別画面を作らず、**TrackList内で“アルバム見出し + 曲リスト”を表示**する方針に決定。
- 将来的にアルバムごと曲リストをアコーディオン化する可能性あり（見出しをbuttonにするだけで済む構造にしたい）。

---

## 現状の設計（重要な合意）
- **アルバム集約は表示側だけに置かない**のが理想だが、いったんは段階導入。
- `useMp3Library` から `albums` を返すが、**TrackView依存を避けたいのでコア型（pathベース）で返す**。
- 表示用の `DirAlbumView`（TrackView依存）はUI側で組み立ててもよい（当面はOK）。

---

## 型の整理（衝突対策）
- `AlbumInfo` が `src/types/album.ts` と `src/types/albumInfo.ts` で二重定義になって衝突したため、
  - `album.ts` は **再exportの窓口（barrel）**にする or 消す。
  - 重要：**AlbumInfoは1箇所に統一**すること。

### コア（TrackView依存なし）推奨
- `src/types/albumInfo.ts`
  - `AlbumInfo`（dirKey/trackPaths/dirCoverUrl 等、pathベース）
  - `AlbumKind = "dir"`

### 表示用（TrackView依存あり）
- `src/types/albumView.ts`
  - `DirAlbumView`（title/trackCount/coverUrl/tracks{t,index} など）

---

## 実装済み（または確定している）ポイント

### 1) Sidebar にアルバムON/OFF
- `settings.ui.showAlbums` を追加し `ToggleControl` で切替可能。

### 2) TrackRow を共通化
- `TrackList` / アルバム表示のどちらでも `TrackRow` を使う方針。
- アルバム内の長い曲名崩れが出たので、**AlbumListよりTrackList側の構造で統一**する流れにした。

### 3) フォルダ内画像（暫定）
- フォルダ代表画像は「高速優先」：
  - 解像度チェック等はしない
  - **最初に見つかった画像を何も考えず表示**する方針
- 直下もサブフォルダも同じ扱いでOK。

---

## 現在のコード断片

### buildDirAlbums（コア集約）
- `src/lib/mp3/album/buildDirAlbums.ts`
- `folderName` は未使用なので args から削除するのが正解（lint/tsが怒る）
- 返すのは `AlbumInfo`（コア）だけにする（title/trackCount/tracks は入れない）

例（現在形）:
- `key: dir:<dirKey>`
- `kind: "dir"`
- `dirKey`
- `trackPaths: string[]`
- `dirCoverUrl: string | null`

### useTrackViews（Fantia/mapping反映）
- Fantia判定は `releaseYm` が入っているかで行う（releaseYmが入っていないとFantia扱いされないので注意）
- `TrackView` は最終的に
  - `trackNoRaw: string | null` ("1/12" など)
  - `discNoRaw: string | null` ("1/2" など)
  - `releaseYm: string | null`
    を持つ形に更新済み（少なくとも案として決定）

---

## sortAlbumTracks（アルバム内の並び）
- ルール（混在する場合）：
  1) Fantia（releaseYm）
  2) mp3tag（disc→track）
  3) fileName
- `parseIndexOfTotal` は raw が string 以外（number/null）で落ちたことがあるので、
  - **入力を string に正規化してから split する**防御が必要。
- 現在は「ソートはされてる」状態まで到達。

---

## UI構造の注意（重要）
- `<ul>` 直下に `<div>` を置くと崩れるので、
  - アルバム見出しは `<li>` の中に入れ、
  - アルバム内トラックは `<ul>` をネストする構造にしたい。
- アルバム見出し（アート+タイトル+曲数）の位置が微妙だったので、
  - `grid-template-columns: 56px minmax(0,1fr)` の2カラム固定を推奨。

---

## 次チャットでやること（優先順）
### 次やること 1：albums を useMp3Library へ置く（コア型で）
- `useMp3Library` の return に `albums: AlbumInfo[]` を追加
- `buildDirAlbums({ mp3List, dirCoverUrlByDir: covers.dirCoverUrlByDir })` を呼ぶ
- `Page` 側の dirAlbums 用 useMemo（TrackView依存の組み立て）は一旦残してもOKだが、将来移動予定としてTODOを書く

### 次やること 2：TrackList の album 表示を “セマンティックに正しい構造”へ統一
- `shouldShowAlbums` のとき：
  - sortedAlbums.map(album => `<li>見出し + <ul>TrackRow…</ul></li>`)
- CSSは `TrackList.module.scss` に albumHeader系を追加

### 次やること 3：Label定数化（直下表示の文言）
- `"（直下）"` を直書きしたくないため
  - `src/const/labels.ts` などに寄せる（ただし今は“コア型にtitleを持たない”ならUI側でのみ必要）

---

## 進行度（n/m）
- いま：**アルバム表示UIの足場作り〜型/構造の整地が終盤**
- 次：**albumsをuseMp3Libraryに寄せる（コア型）→ UI側で表示組み立て**の段
