import type {FantiaMappingEntry} from "@/types/mapping";

const formatYm = (releaseYm: string): string => releaseYm.replace("-", "/");
const formatOrder2 = (n: number): string => String(n).padStart(2, "0");

export const buildReleaseOrderLabel = (mapping: FantiaMappingEntry | undefined): string | null => {
  if (!mapping) return null;
  const ym = formatYm(mapping.releaseYm);
  const order = formatOrder2(mapping.withinMonthIndex);
  return `${ym} / ${order}`;
};
