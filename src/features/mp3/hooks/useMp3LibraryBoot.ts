// src/hooks/useMp3LibraryBoot.ts
import "client-only";

import {loadDirectoryHandle} from "@/lib/fsAccess/dirHandleStore";
import {canReadNow}          from "@/lib/fsAccess/permission";
import {useEffect}           from "react";

type Args = {
  buildList: (handle: FileSystemDirectoryHandle) => Promise<void>;

  setSavedHandle: (handle: FileSystemDirectoryHandle | null) => void;
  setFolderName: (name: string) => void;
  setNeedsReconnect: (value: boolean) => void;
  setErrorMessage: (message: string) => void;
};

/**
 * MP3ライブラリの初期化と接続ロジックを処理します。
 * ディレクトリハンドルを読み取り、読み取りアクセスを検証し、アクセスが許可された場合にファイルのリストを構築します。
 * ライブラリの接続プロセスの状態を反映するために、様々な状態プロパティを更新します。
 * @remarks
 * この関数は`useEffect`フックを使用して、依存関係が変更された際に非同期で初期化を実行します。
 * ディレクトリハンドルを読み込み、読み取り権限を確認し、それに応じて状態を更新しようと試みます。
 * エラーが発生した場合、提供された`setErrorMessage`関数を使用してエラーメッセージを設定します。
 */
export const useMp3LibraryBoot = (args: Args): void => {
  const {
    buildList,
    setSavedHandle,
    setFolderName,
    setNeedsReconnect,
    setErrorMessage,
  } = args;

  useEffect(() => {
    const boot = async () => {
      try {
        const handle = await loadDirectoryHandle();
        if (!handle) return;

        setSavedHandle(handle);
        setFolderName(handle.name);

        const ok = await canReadNow(handle);
        if (ok) {
          await buildList(handle);
          setNeedsReconnect(false);
        } else {
          setNeedsReconnect(true);
        }
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : String(e));
      }
    };

    void boot();
  }, [buildList, setSavedHandle, setFolderName, setNeedsReconnect, setErrorMessage]);
};
