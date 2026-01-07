# Handoff (mp3-song-info-editor)

## CHATGPT_START
- Repo: katsu1101/mp3-song-info-editor
- 目的: MP3の曲情報（ID3タグ）を編集しつつ、プレイリスト再生（連続/シャッフル等）を快適にする
- いま困ってること（直近）:
    - シャッフル時、何も選択していない状態でも再生ボタンを押して再生開始したい
- 次にやること（優先順）:
    1) 再生の状態管理を「queue + cursor」に統一して、シャッフルでも未選択でも再生開始できるようにする
    2) 設定値（再生モード等）を SettingsProvider / useSettings から取得する導線を整理
- 直近で触る（候補）:
    - usePlaylistPlayer / useAudioPlayer 周り
    - 曲一覧 UI（active 行の ref 管理）
    - SettingsProvider / useSettings
- 決め（案）:
    - 再生は「キュー（曲ID配列）+ カーソル（index）」を唯一の真実にする
    - 「未選択で再生」を許可する場合は、キュー生成→cursor=0→先頭曲再生
- 未解決:
    - “アルバム単位シャッフル”が必要か（必要なら albumKey を何で定義するか：タグ / フォルダ / マッピングID）
- 動作確認:
    1) シャッフルON、未選択で再生ボタン
    2) 次曲へ遷移（曲終了 or 次へ）
    - 期待: 再生開始できる / active が切り替わり、一覧が追従スクロールする

---

## 現状（わかっている範囲）
- プレイリスト再生のフック（usePlaylistPlayer 等）が存在し、シャッフル/連続再生がある
- 設定は SettingsProvider / useSettings が関与していそう
- UI側で active な曲がある（一覧表示でハイライト等）

※このメモは、これまでのチャットで出た課題ベース。README/設計メモの内容に合わせて後で調整する。

---

## 直近タスク詳細（実装方針のメモ）
### 1) queue + cursor に統一
- State 例:
    - queue: string[]（曲ID）
    - cursor: number（queue[cursor] が現在）
    - isPlaying: boolean
- 再生開始:
    - 未選択: queue生成→cursor=0→play(queue[0])
    - 選択あり: queue生成→cursor=queue.indexOf(selectedId)（なければ0）
- 次/前:
    - next: cursor+1（範囲外は停止 or ループ/リピート設定に従う）
    - prev: cursor-1
- 曲終了イベント:
    - onEnded → next()（連続/シャッフル共通）

### 2) アクティブ曲へのスクロール追従
- 一覧行に ref を付与（active の行のみでもOK）
- activeId が変化したら
    - scrollIntoView({ block: "nearest", behavior: "smooth" })

### 3) 設定導線の整理
- UI操作（シャッフル切替/再生ボタン）→ useSettings の値参照 → usePlaylistPlayer の startPlayback に渡す
- SettingsProvider から読むのか、hook で読むのかを統一（片方に寄せる）
    - 推奨: UI層は useSettings で読む、player hook は引数で受け取る（依存を薄く）

---

## 仕様の候補（必要になったら決める）
### アルバム単位シャッフル（候補）
- アルバム順をシャッフルし、アルバム内は trackNo 順
- albumKey の定義候補:
    - A) ID3 Album タグ
    - B) フォルダ名（タグ未整備でも強い）
    - C) Fantia等のマッピングID
- 推奨: B（フォルダ） or A（タグが整っているならA）

---

## 参考（新チャット開始テンプレ）
新チャットでは上の CHATGPT_START を貼って
「この方針で実装を進めたい。いまのコードは usePlaylistPlayer が〜」のように続ける。
