import React from "react";

export function SidebarStub(): React.JSX.Element {
  return (
    <div className="grid gap-3">
      <div className="text-sm font-extrabold opacity-90">ライブラリ</div>
      <SideButton>すべて</SideButton>
      <SideButton>対応表あり</SideButton>
      <SideButton>対応表なし</SideButton>

      <div className="mt-2 text-sm font-extrabold opacity-90">ソート</div>
      <SideButton>Fantia順</SideButton>
      <SideButton>ファイル名順</SideButton>
    </div>
  );
}

function SideButton({children}: { children: React.ReactNode }): React.JSX.Element {
  return (
    <button
      type="button"
      className="
        text-left px-3 py-2 rounded-lg border
        bg-[color:var(--panel)]
        border-[color:var(--panel-border)]
        text-[color:var(--foreground)]
        hover:bg-[color:var(--panel-hover)]
        active:translate-y-[0.5px]
        transition
      "
    >
      {children}
    </button>
  );
}
