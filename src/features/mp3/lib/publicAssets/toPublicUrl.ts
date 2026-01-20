// src/features/mp3/lib/publicAssets/toPublicUrl.ts
export const toPublicUrl = (relativePath: string): string => {
  // basePath対応: 先頭 "/" を付けない相対パスを document.baseURI 基準で解決する
  const normalized = relativePath.replace(/^\/+/, "");
  return new URL(normalized, document.baseURI).toString();
};
