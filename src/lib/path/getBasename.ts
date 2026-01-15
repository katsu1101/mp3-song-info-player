// src/lib/path/getBasename.ts
export const getBasename = (path: string): string => {
  const normalized = path.replaceAll("\\", "/");
  return normalized.split("/").pop() ?? normalized;
};
