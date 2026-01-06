"use client";

import React from "react";

type TopBarProps = {
  title: string;

  folderName: string | null;
  savedHandle: unknown | null;
  needsReconnect: boolean;

  pickFolderAndLoadAction: () => void;
  reconnectAction: () => void;
  forgetAction: () => void;

  showFilePath: boolean;
  setShowFilePathAction: React.Dispatch<React.SetStateAction<boolean>>;
};

export function TopBar(props: TopBarProps) {
  const {
    title,
    folderName,
    savedHandle,
    needsReconnect,
    pickFolderAndLoadAction,
    reconnectAction,
    forgetAction,
    showFilePath,
    setShowFilePathAction,
  } = props;

  const handleForget = () => {
    const ok = window.confirm("保存しているフォルダの記憶を消します。よろしいですか？");
    if (!ok) return;
    forgetAction();
  };

  return (
    <header
      style={{
        marginTop: 8,
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <div style={{display: "flex", flexDirection: "column", gap: 10}}>
        {/* 上段：タイトル */}
        <div style={{display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap"}}>
          <h1 style={{fontSize: 20, fontWeight: 800, margin: 0}}>
            {title}
          </h1>
          <span style={{fontSize: 12, opacity: 0.7}}>
            {folderName ? `選択中: ${folderName}` : "未選択"}
          </span>
        </div>

        {/* 下段：操作 */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          {/* 左ブロック：フォルダ系 */}
          <div style={{display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap"}}>
            <button
              onClick={pickFolderAndLoadAction}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontWeight: 700,
              }}
            >
              フォルダを選ぶ
            </button>

            {savedHandle && needsReconnect ? (
              <button
                onClick={reconnectAction}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "transparent",
                  color: "white",
                  opacity: 0.9,
                }}
              >
                前回のフォルダに再接続
              </button>
            ) : null}
          </div>

          {/* 右ブロック：表示トグル + 危険操作 */}
          <div style={{display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap"}}>
            {/* file名表示スイッチ */}
            <label style={{display: "flex", alignItems: "center", gap: 8, cursor: "pointer"}}>
              <span style={{fontSize: 13, opacity: 0.85}}>ファイル名表示</span>
              <span
                style={{
                  position: "relative",
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: showFilePath ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
                  transition: "background 120ms ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={showFilePath}
                  onChange={(e) => setShowFilePathAction(e.target.checked)}
                  style={{position: "absolute", inset: 0, opacity: 0, cursor: "pointer"}}
                  aria-label="ファイル名表示の切り替え"
                />
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: showFilePath ? 22 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.75)",
                    transition: "left 120ms ease",
                  }}
                />
              </span>
            </label>

            {/* 記憶を消す（confirm付き） */}
            {savedHandle ? (
              <button
                onClick={handleForget}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255, 99, 99, 0.45)",
                  background: "transparent",
                  color: "rgb(255, 170, 170)",
                  fontWeight: 700,
                }}
                title="保存しているフォルダの記憶を消します"
              >
                記憶を消す
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
