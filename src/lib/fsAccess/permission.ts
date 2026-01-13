// src/lib/fsAccess/permission.ts
export const ensureDirectoryPicker = (): string | null => {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) return "HTTPSで開いてください（セキュアな接続が必要です）。";
  if (typeof window.showDirectoryPicker !== "function") {
    return "このブラウザはフォルダ選択に対応していません。Chrome/Edgeでお試しください。";
  }
  return null;
};

export const canReadNow = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  const anyHandle = handle as unknown as {
    queryPermission?: (d: { mode: "read" }) => Promise<PermissionState>;
  };
  if (!anyHandle.queryPermission) return true;
  const state = await anyHandle.queryPermission({mode: "read"});
  return state === "granted";
};

export const requestRead = async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
  const anyHandle = handle as unknown as {
    requestPermission?: (d: { mode: "read" }) => Promise<PermissionState>;
  };
  if (!anyHandle.requestPermission) return false;
  const state = await anyHandle.requestPermission({mode: "read"});
  return state === "granted";
};
