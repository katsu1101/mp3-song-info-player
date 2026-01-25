"use client";

import {appMeta}   from "@/config/appMeta";
import {useEffect} from "react";

/**
 * ブラウザがサポートしている場合、アプリケーションのサービスワーカーを登録します。
 * サービスワーカーは指定されたパスとスコープで登録されます。
 * 登録プロセス中のエラーを処理し、コンソールにログを出力します。
 *
 * @returns {null} このコンポーネントはUIをレンダリングしないため、nullを返します。
 */
export function RegisterServiceWorker(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = async (): Promise<void> => {
      try {
        await navigator.serviceWorker.register(appMeta.swPath, {
          scope: appMeta.scope,
        });
      } catch (error) {
        console.error("ServiceWorker registration failed:", error);
      }
    };
    void register();
  }, []);

  return null;
}
