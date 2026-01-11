import React, {JSX, useCallback, useEffect, useId, useMemo, useState} from "react";
import styles                                                         from "./AppShell.module.css";

export type PlayerVariant = "mini" | "full";

/**
 * App Shell レイアウトのレンダリングに必要なプロパティを表します。
 *
 * AppShellProps型は、アプリケーションのレイアウトの異なるセクションに対応する標準化されたReactノードのセットを提供するために設計されています。
 * これにはヘッダー、サイドバー、メインコンテンツ領域、およびプレイヤーセクションが含まれます。
 *
 * プロパティ:
 * - `header`: アプリレイアウトのヘッダーセクションにレンダリングされるReactノード。
 * - `sidebar`: アプリレイアウトのサイドバーセクションにレンダリングされるReactノード。
 * - `main`: アプリレイアウトのメインコンテンツ領域にレンダリングされるReactノード。
 * - `player`: 右ペインにレンダリングされるReactノード。通常はプレイヤーのレンダリングに使用される。
 */
type AppShellProps = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;

  // 追加：プレイヤーを「ミニ/フル」で描画し分ける
  renderPlayer: (variant: PlayerVariant) => React.ReactNode;
};

/**
 * アプリケーションのレイアウト構造を定義するAppShellコンポーネントをレンダリングします。
 * これにはヘッダー、サイドバー、メインコンテンツ領域、およびプレイヤーセクションが含まれます。
 *
 * @param {Object} props - AppShell コンポーネントのプロパティオブジェクト。
 * @param {React.ReactNode} props.header - レイアウト上部に表示されるヘッダーコンテンツ。
 * @param {React.ReactNode} props.sidebar - レイアウト左セクションに表示されるサイドバーコンテンツ。
 * @param {React.ReactNode} props.main - レイアウトの中央セクションに表示されるメインコンテンツ。
 * @param {React.ReactNode} props.renderPlayer - レイアウトの右セクションに表示されるプレイヤーコンテンツ。
 * @return {JSX.Element} レンダリングされたレイアウトコンポーネント。
 */
export function AppShell({header, sidebar, main, renderPlayer}: AppShellProps): JSX.Element {
  const sidebarId = useId();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);

  const openPlayer = useCallback(() => setIsPlayerOpen(true), []);
  const closePlayer = useCallback(() => setIsPlayerOpen(false), []);

  // ESCで閉じる（プレイヤー優先）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (isPlayerOpen) return closePlayer();
      if (isSidebarOpen) return closeSidebar();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlayerOpen, isSidebarOpen, closePlayer, closeSidebar]);

  // ボディスクロール抑制（ボトムシート/ドロワー開いてる間）
  useEffect(() => {
    const shouldLock = isPlayerOpen || isSidebarOpen;
    if (!shouldLock) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPlayerOpen, isSidebarOpen]);

  const sidebarOpenAttr = useMemo(() => (isSidebarOpen ? "true" : "false"), [isSidebarOpen]);
  const playerOpenAttr = useMemo(() => (isPlayerOpen ? "true" : "false"), [isPlayerOpen]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <button
            type="button"
            className={styles.sidebarToggle}
            aria-controls={sidebarId}
            aria-expanded={isSidebarOpen}
            onClick={toggleSidebar}
          >
            ☰ 𝓜𝓮𝓷𝓾
          </button>

          <div className={styles.headerContent}>
            {header}
          </div>
        </div>
      </div>

      {/* sidebar backdrop（タブレット以下で有効） */}
      <div
        className={styles.backdrop}
        data-open={sidebarOpenAttr}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* player backdrop（スマホで有効） */}
      <div
        className={styles.sheetBackdrop}
        data-open={playerOpenAttr}
        onClick={closePlayer}
        aria-hidden="true"
      />

      <div className={styles.body}>
        <aside
          id={sidebarId}
          className={`${styles.scrollPane} ${styles.sidebarPane} scrollbar`}
          data-open={sidebarOpenAttr}
        >
          {sidebar}
        </aside>

        <main className={`${styles.scrollPane} ${styles.mainPane} scrollbar`}>
          {main}
        </main>

        {/* desktop/tabletの右ペイン（スマホではCSSで隠す） */}
        <aside className={`${styles.scrollPane} ${styles.playerPane} scrollbar`}>
          <div className={styles.playerInner}>
            {renderPlayer("full")}
          </div>
        </aside>
      </div>

      {/* スマホ用：ミニプレイヤー固定（常に表示したい要件を満たす） */}
      <div
        className={styles.miniPlayerBar}
        role="button"
        tabIndex={0}
        onClick={openPlayer}
        onKeyDown={(e) => {
          if (e.key === "Enter") openPlayer();
        }}
      >
        {renderPlayer("mini")}
      </div>

      {/* スマホ用：フルプレイヤーのボトムシート */}
      <section
        className={styles.playerSheet}
        data-open={playerOpenAttr}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.sheetHeader}>
          <div className={styles.sheetHandle}/>
          <button type="button" className={styles.sheetClose} onClick={closePlayer}>
            閉じる
          </button>
        </div>

        <div className={styles.sheetBody}>
          {renderPlayer("full")}
        </div>
      </section>
    </div>
  );
}