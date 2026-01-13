// src/hooks/useObjectUrlPool.ts
import {useCallback, useEffect, useRef} from "react";

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
