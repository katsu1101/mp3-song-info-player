// src/hooks/useObjectUrlPool.ts
import {useCallback, useEffect, useRef} from "react";

/**
 * オブジェクトURLのプールを管理し、それらを追跡および取り消すためのメソッドを提供するカスタムフック。
 *
 * このフックは、`URL.createObjectURL`を使用して作成されたオブジェクトURLを効率的に管理するのに役立ちます。
 * コンポーネントがアンマウントされたとき、または`revokeAll`メソッドが明示的に呼び出されたときに、
 * 追跡されているすべてのオブジェクトURLを無効化することで、適切なクリーンアップを保証します。
 *
 * @returns {Object} 以下のメソッドを含むオブジェクト：
 *   - `track(url: string): string`: 指定されたオブジェクトURLをプールに追加して追跡します。同じURLが返されます。
 *   - `revokeAll(): void`: 追跡中のすべてのオブジェクトURLを無効化し、プールをクリアします。
 */
export const useObjectUrlPool = () => {
  const urlsRef = useRef<Set<string>>(new Set());

  const track = useCallback((url: string) => {
    urlsRef.current.add(url);
    return url;
  }, []);

  const revokeAll = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current.clear();
  }, []);

  useEffect(() => revokeAll, [revokeAll]);

  return {track, revokeAll};
};
