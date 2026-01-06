import React from "react";

type AppShellProps = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;
  player: React.ReactNode; // 右ペイン
};

export function AppShell({header, sidebar, main, player}: AppShellProps) {
  return (
    <div
      style={{
        height: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minWidth: 0,
      }}
    >
      <div style={{position: "sticky", top: 0, zIndex: 50}}>
        {header}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px minmax(0, 1fr) 360px",
          gap: 12,
          padding: "10px 12px",
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <aside style={{minWidth: 0, minHeight: 0, overflow: "auto"}}>
          {sidebar}
        </aside>

        <main style={{minWidth: 0, minHeight: 0, overflow: "auto"}}>
          {main}
        </main>

        <aside style={{minWidth: 0, minHeight: 0, overflow: "auto"}}>
          {/* 右ペインを追従させたいなら sticky */}
          <div style={{position: "sticky", top: 10}}>
            {player}
          </div>
        </aside>
      </div>
    </div>
  );
}
