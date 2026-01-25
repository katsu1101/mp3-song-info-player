// src/lib/mp3/library/libraryActions.ts
import {clearDirectoryHandle, saveDirectoryHandle} from "@/lib/fsAccess/dirHandleStore";
import {ensureDirectoryPicker, requestRead}        from "@/lib/fsAccess/permission";

const toMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * ファイルシステムアクセスAPIを使用してフォルダを選択するプロセスを処理し、その内容をロードし、
 * それに応じて状態とビューを更新します。
 *
 * @function
 * @async
 * @param {Object} args - 必要なコールバック関数と状態設定関数を含むオブジェクト。
 * @param {Function} args.resetView - ビューを初期状態にリセットするコールバック関数。
 * @param {Function} args.buildList - {@link FileSystemDirectoryHandle}を受け取り
 *     を受け取り、非同期でディレクトリの内容リストを構築するコールバック関数。
 * @param {Function} args.setNeedsReconnect - 再接続が必要かどうかを設定する状態更新関数。
 * @param {Function} args.setSavedHandle - 選択された{@link FileSystemDirectoryHandle}を保存する状態更新関数。
 *     ディレクトリが選択されていない場合はnullを返す。
 * @param {Function} args.setErrorMessage - フォルダ選択または読み込み中に問題が発生した際にエラーメッセージ文字列を設定する状態更新関数。
 * @returns {Promise<void>} フォルダが正常に選択され、その内容が処理された際に解決する、またはエラーメッセージと共に拒否される Promise。
 * @throws 以下の場合に適切なエラーメッセージで{@link args.setErrorMessage}を呼び出します：
 *     - ディレクトリピッカーの起動に失敗した場合
 *     - フォルダ選択プロセス中にエラーが発生した場合
 *     - 選択されたディレクトリハンドルを保存または処理中に問題が発生した場合
  */
export const pickFolderAndLoadAction = async (args: {
  resetView: () => void;
  buildList: (handle: FileSystemDirectoryHandle) => Promise<void>;
  setNeedsReconnect: (v: boolean) => void;
  setSavedHandle: (h: FileSystemDirectoryHandle | null) => void;
  setErrorMessage: (m: string) => void;
}): Promise<void> => {
  const {resetView, buildList, setNeedsReconnect, setSavedHandle, setErrorMessage} = args;

  const error = ensureDirectoryPicker();
  if (error) {
    setErrorMessage(error);
    return;
  }

  resetView();
  setNeedsReconnect(false);

  try {
    const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({mode: "read"});
    await saveDirectoryHandle(handle);
    setSavedHandle(handle);
    await buildList(handle);
  } catch (e) {
    setErrorMessage(toMessage(e));
  }
};

export const reconnectAction = async (args: {
  savedHandle: FileSystemDirectoryHandle | null;
  resetView: () => void;
  buildList: (handle: FileSystemDirectoryHandle) => Promise<void>;
  setNeedsReconnect: (v: boolean) => void;
  setErrorMessage: (m: string) => void;
}): Promise<void> => {
  const {savedHandle, resetView, buildList, setNeedsReconnect, setErrorMessage} = args;

  setErrorMessage("");
  if (!savedHandle) return;

  const ok = await requestRead(savedHandle);
  if (!ok) {
    setNeedsReconnect(true);
    setErrorMessage("フォルダへの読み取り権限が付与されませんでした。");
    return;
  }

  resetView();
  await buildList(savedHandle);
  setNeedsReconnect(false);
};

export const forgetAction = async (args: {
  resetView: () => void;
  setSavedHandle: (h: FileSystemDirectoryHandle | null) => void;
  setNeedsReconnect: (v: boolean) => void;
}): Promise<void> => {
  const {resetView, setSavedHandle, setNeedsReconnect} = args;

  await clearDirectoryHandle();
  setSavedHandle(null);
  setNeedsReconnect(false);
  resetView();
};
