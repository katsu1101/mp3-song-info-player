// src/config/getBasePath.ts
export const getBasePath = (): string => {
  return (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
};
