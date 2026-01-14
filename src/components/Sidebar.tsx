import {useSettings}                           from "@/components/Settings/SettingsProvider";
import {SegmentedControl, ToggleControl}       from "@/components/ui";
import {AppCommands}                           from "@/hooks/useAppCommands";
import type {TrackGridSize, TrackListViewMode} from "@/types/setting";
import {SettingState}                          from "@/types/setting";
import {LayoutGrid, List}                      from "lucide-react";
import React, {useCallback}                    from "react";

export const trackListViewModeOptions = [
  {value: "grid", label: "グリッド", icon: <LayoutGrid size={18} aria-hidden/>},
  {value: "list", label: "リスト", icon: <List size={18} aria-hidden/>},
] as const satisfies readonly { value: TrackListViewMode; label: string, icon: React.ReactNode }[];

export const trackGridSizeOptions = [
  {value: "sm", label: "小", icon: <>小</>},   // 小さめグリッドの雰囲気
  {value: "md", label: "中", icon: <>中</>}, // 中
  {value: "lg", label: "大", icon: <>大</>}, // 大（サイズ差で表現）
] as const satisfies readonly { value: TrackGridSize; label: string, icon: React.ReactNode }[];

type SidebarMenuProps = {
  state: SettingState
  commands: AppCommands;
  closeSidebar: () => void;
};

export function SidebarStub({state, commands, closeSidebar}: SidebarMenuProps): React.JSX.Element {
  const {settings, toggleSetting, setSetting} = useSettings();

  // 追加：実行後に閉じるラッパー（PromiseでもOK）
  const runAndClose = useCallback(
    async (action?: () => void | Promise<void>) => {
      if (!action) return;
      await action();
      closeSidebar();
    },
    [closeSidebar]
  );

  const toggleContinuous = () => toggleSetting("playback.continuous");
  const toggleShuffle = () => {
    commands.stopPlayback(); // シャッフル状態変更時に再生中トラックをリセット
    toggleSetting("playback.shuffle");
  }

  const setTrackListViewMode = useCallback(
    (next: TrackListViewMode) => setSetting("ui.trackListViewMode", next),
    [setSetting]
  );
  const setTrackGridSize = useCallback(
    (next: TrackGridSize) => {
      setSetting("ui.trackGridSize", next);
      setSetting("ui.trackListViewMode", "grid");
    },
    [setSetting]
  );

  const handleForget = (): void => {
    const ok = window.confirm("保存しているフォルダの記憶を消します。よろしいですか？");
    if (!ok) return;
    void commands.forget();
    closeSidebar();
  };

  return (
    <div className="grid gap-4">
      <SideButton onClick={() => void runAndClose(commands.pickFolder)}>フォルダを選ぶ</SideButton>

      {state.savedHandle && state.needsReconnect ? (
        <SideButton onClick={() => void runAndClose(commands.reconnect)} variant="ghost">
          再接続
        </SideButton>
      ) : null}

      <SectionTitle>再生</SectionTitle>
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-sm opacity-90">連続再生</span>
        <ToggleControl
          ariaLabel="連続再生"
          checked={settings.playback.continuous}
          onChangeAction={() => {
            toggleContinuous();
            closeSidebar();
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-sm opacity-90">シャッフル</span>
        <ToggleControl
          ariaLabel="シャッフル"
          checked={settings.playback.shuffle}
          onChangeAction={() => {
            toggleShuffle();
            closeSidebar();
          }}
        />
      </div>


      <SectionTitle>表示</SectionTitle>
      <SegmentedControl
        iconOnly
        label="モード"
        value={settings.ui.trackListViewMode}
        options={trackListViewModeOptions}
        onChangeAction={(next) => {
          setTrackListViewMode(next);
          closeSidebar();
        }}
      />
      <SegmentedControl
        iconOnly
        label="サイズ"
        value={settings.ui.trackGridSize}
        options={trackGridSizeOptions}
        onChangeAction={(next) => {
          setTrackGridSize(next);
          closeSidebar();
        }}
      />


      {/*<div className="flex items-center justify-between gap-3 px-1">*/}
      {/*  <span className="text-sm opacity-90">file名</span>*/}
      {/*  <ToggleControl*/}
      {/*    ariaLabel="file名"*/}
      {/*    checked={settings.ui.showFilePath}*/}
      {/*    onChange={toggleShowFilePath}*/}
      {/*  />*/}
      {/*</div>*/}

      {state.savedHandle ? (
        <>
          <SectionTitle>危険操作</SectionTitle>
          <SideButton onClick={() => void handleForget()} variant="danger">
            記憶を消す
          </SideButton>
        </>
      ) : null}
      {/*<SectionTitle>ライブラリ</SectionTitle>*/}
      {/*<SideButton>すべて</SideButton>*/}
      {/*<SideButton>対応表あり</SideButton>*/}
      {/*<SideButton>対応表なし</SideButton>*/}

      {/*<SectionTitle>ソート</SectionTitle>*/}
      {/*<SideButton>Fantia順</SideButton>*/}
      {/*<SideButton>ファイル名順</SideButton>*/}
    </div>
  );
}

function SectionTitle({children}: { children: React.ReactNode }): React.JSX.Element {
  return <div className="text-sm font-extrabold opacity-90">{children}</div>;
}

function SideButton(
  props: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "normal" | "ghost" | "danger";
  }
): React.JSX.Element {
  const variant = props.variant ?? "normal";

  const base =
    "text-left px-3 py-2 rounded-lg border transition";
  const normal =
    "bg-[color:var(--panel)] border-[color:var(--panel-border)] text-[color:var(--foreground)] hover:bg-[color:var(--panel-hover)]";
  const ghost =
    "bg-transparent border-[color:var(--panel-border)] text-[color:var(--foreground)] hover:bg-[color:var(--panel-hover)]";
  const danger =
    "bg-transparent border-[color:rgba(255,99,99,0.45)] text-[color:rgb(255,170,170)] hover:bg-[color:rgba(255,99,99,0.10)]";

  const klass =
    variant === "danger" ? `${base} ${danger}` :
      variant === "ghost" ? `${base} ${ghost}` :
        `${base} ${normal}`;

  return (
    <button type="button" className={klass} onClick={props.onClick}>
      {props.children}
    </button>
  );
}