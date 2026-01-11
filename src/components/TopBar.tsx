"use client";

import {SettingAction} from "@/types/setting";
import React, {JSX}    from "react";

/**
 * TopBarコンポーネントに必要なプロパティを表します。
 */
type TopBarProps = {
  title: string;
  settingAction: SettingAction;
};

/**
 * カスタマイズ可能なタイトル、フォルダ関連のアクション、設定トグルを備えたトップバーをレンダリングする機能コンポーネント。
 *
 * @param {Object} props - TopBarコンポーネントに渡されるプロパティ。
 * @param {string} props.title - トップバーに表示されるタイトル。
 * @param {Object} props.settingAction - フォルダ関連のアクションとプロパティを含むオブジェクト。
 * @param {string} [props.settingAction.folderName] - 現在選択されているフォルダー名。
 * @param {Function} props.settingAction.pickFolderAndLoad - フォルダーを選択して読み込む関数。
 * @param {Function} props.settingAction.reconnect - 以前に保存されたフォルダーに再接続する関数。
 * @param {Function} props.settingAction.forget - 保存済みフォルダを忘れる関数。
 * @param {boolean} [props.settingAction.needsReconnect] - 再接続が必要かどうかを示すフラグ。
 * @param {boolean} [props.settingAction.savedHandle] - フォルダハンドルが保存されているかどうかを示すフラグ。
 *
 * @return {JSX.Element} The rendered header containing the title, folder actions, and toggleable settings.
 */
export function TopBar(props: TopBarProps): JSX.Element {
  const {title, settingAction} = props;

  return (
    <header
      style={{
        marginTop: 8,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid var(--panel-border)",
        background: "var(--panel)",
        color: "var(--foreground)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* 左：タイトル + 状態 */}
        <div style={{display: "flex", alignItems: "baseline", gap: 10, minWidth: 220, flex: "1 1 auto"}}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 320,
            }}
            title={title}
          >
            {title}
          </div>

          <span
            style={{
              fontSize: 12,
              color: "var(--muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 360,
            }}
            title={settingAction.folderName}
          >
            {settingAction.folderName
              ? `選択中: ${settingAction.folderName}`
              : "未選択"}
          </span>
        </div>

      </div>
    </header>
  );
}
