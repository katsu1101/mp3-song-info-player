// src/lib/fsAccess/scanMediaTree.ts
import {
  DIR_COVER_PATTERNS,
  getBaseNameWithoutExt,
  getLowerExt,
  IMAGE_EXT,
  LYRICS_TEXT_EXT,
  normalizeFileStem,
  SOUND_EXT,
  SOUND_INFO_EXT,
  VIDEO_EXT
} from "@/const/constants";

export type SidecarBundle = {
  /** ディレクトリ相対パス（"" はルート） */
  dirPath: string;

  /** 拡張子を除いたファイル名（同名判定キー） */
  baseName: string;

  audio?: {
    path: string; // dirPath + "/" + fileName
    ext: string;
    handle: FileSystemFileHandle;
  };

  lyricsTxt?: {
    path: string;
    handle: FileSystemFileHandle;
  };

  /** そのdirPathに属する画像ファイル（代表候補） */
  // ✅ 追加：同名画像（曲の画像）
  trackImage?: {
    path: string;
    handle: FileSystemFileHandle;
    ext: string;
  };

  trackInfo?: {
    path: string;
    handle: FileSystemFileHandle
  };
};

export type ScanMediaTreeResult = {
  bundles: SidecarBundle[];
  /** ディレクトリの存在確認やカバー探索に使える（任意） */
  dirPaths: string[];
  bundleByKey: ReadonlyMap<string, SidecarBundle>;
  dirBestImageByDir: ReadonlyMap<string, FileSystemFileHandle>;
};

const joinRelPath = (dirPath: string, name: string): string => {
  // 内部表現は常に "/" に統一（OS差分を持ち込まない）
  return dirPath ? `${dirPath}/${name}` : name;
};

const getBundleKey = (dirPath: string, baseName: string): string => {
  return dirPath ? `${dirPath}/${baseName}` : baseName;
};

const getPriority = (stem: string): number => {
  const idx = DIR_COVER_PATTERNS.findIndex((re) => re.test(stem));
  return idx >= 0 ? idx : Number.POSITIVE_INFINITY;
};
export const scanMediaTree = async (
  directoryHandle: FileSystemDirectoryHandle,
  basePath: string = ""
): Promise<ScanMediaTreeResult> => {
  const bundleByKey = new Map<string, SidecarBundle>();
  const dirPathSet = new Set<string>();

  const dirBestImageByDir = new Map<string, { priority: number; handle: FileSystemFileHandle }>();

  const walk = async (
    dirHandle: FileSystemDirectoryHandle,
    dirPath: string
  ): Promise<void> => {
    dirPathSet.add(dirPath);

    for await (const [name, handle] of dirHandle as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      const currentPath = joinRelPath(dirPath, name);

      if (handle.kind === "directory") {
        // TODO: 無視したいディレクトリがあればここで continue（例: ".git" など）
        await walk(handle as FileSystemDirectoryHandle, currentPath);
        continue;
      }

      // file
      const ext = getLowerExt(name);
      const baseName = getBaseNameWithoutExt(name);
      const key = getBundleKey(dirPath, baseName);

      const bundle = bundleByKey.get(key) ?? {
        dirPath,
        baseName,
      };

      // ✅ 音声（曲）
      if (SOUND_EXT.has(ext) || VIDEO_EXT.has(ext)) {
        // TODO: 同名で複数音声がある場合の優先順位（例: mp3優先 等）
        bundle.audio = {
          path: currentPath,
          ext,
          handle: handle as FileSystemFileHandle,
        };
        bundleByKey.set(key, bundle);
        continue;
      }

      // ✅ べた書き歌詞 txt（今回の対象）
      if (LYRICS_TEXT_EXT.has(ext)) {
        bundle.lyricsTxt = {
          path: currentPath,
          handle: handle as FileSystemFileHandle,
        };
        bundleByKey.set(key, bundle);
        continue;
      }

      if (IMAGE_EXT.has(ext)) {
        const stem = normalizeFileStem(name);
        const priority = getPriority(stem);

        // ✅ dir代表画像: 優先パターンにマッチする画像だけ採用
        const current = dirBestImageByDir.get(dirPath);
        if (!current || priority < current.priority) {
          dirBestImageByDir.set(dirPath, {
            priority,
            handle: handle as FileSystemFileHandle,
          });
        }

        // ✅ 曲画像（同名sidecar）としても必要なら従来通り
        if (!bundle.trackImage) {
          bundle.trackImage = {
            path: currentPath,
            handle: handle as FileSystemFileHandle,
            ext,
          };
          bundleByKey.set(key, bundle);
        }

        continue;
      }

      if (SOUND_INFO_EXT.has(ext)) {
        bundle.trackInfo = {
          path: currentPath,
          handle: handle as FileSystemFileHandle,
        };
        bundleByKey.set(key, bundle);
      }
    }
  };

  await walk(directoryHandle, basePath);

  // audio がある bundle を中心に返したいならここでフィルタ可能
  const bundles = [...bundleByKey.values()];
  const dirBestHandleByDir = new Map<string, FileSystemFileHandle>();
  for (const [dir, v] of dirBestImageByDir.entries()) {
    dirBestHandleByDir.set(dir, v.handle);
  }
  // TODO: bundles の並び順を安定化したいなら sort（path順など）
  return {
    bundles,
    dirPaths: [...dirPathSet.values()],
    bundleByKey,
    dirBestImageByDir: dirBestHandleByDir,
  };
};
