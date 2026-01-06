"use client";

import {loadFantiaMappingFromPublic}  from "@/lib/mapping/loadFantiaMapping";
import type {FantiaMappingEntry}      from "@/types/mapping";
import {useEffect, useMemo, useState} from "react";

export type FantiaMappingState = {
  mapping: FantiaMappingEntry[];
  mappingByPrefixId: ReadonlyMap<string, FantiaMappingEntry>;
  error: string;
  isLoading: boolean;
};

export const useFantiaMapping = (): FantiaMappingState => {
  const [mapping, setMapping] = useState<FantiaMappingEntry[]>([]);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      try {
        const data = await loadFantiaMappingFromPublic();
        if (isCancelled) return;
        setMapping(data);
      } catch (e) {
        if (isCancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  const mappingByPrefixId = useMemo(() => {
    const map = new Map<string, FantiaMappingEntry>();
    for (const entry of mapping) {
      if (!entry.prefixId) continue;
      map.set(entry.prefixId.toLowerCase(), entry);
    }
    return map;
  }, [mapping]);

  return {mapping, mappingByPrefixId, error, isLoading};
};
