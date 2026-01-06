export const extractPrefixIdFromPath = (path: string): string | null => {
  // 例: "2022/5396e324_戸定梨香_....mp3"
  // 例: "5396e324_....mp3"
  const match = /(?:^|\/)([0-9a-fA-F]{8})_/.exec(path);
  return match ? match[1].toLowerCase() : null;
};
