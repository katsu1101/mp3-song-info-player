// src/lib/settings/createMp3SettingState.ts
import type {TrackMetaByPath} from "@/features/mp3/types/trackMeta";
import type {SettingState}    from "@/types/setting";

export const createSettingState = (args: {
  folderName: string;
  errorMessage: string;
  metaByPath: TrackMetaByPath;
  savedHandle: FileSystemDirectoryHandle | null;
  needsReconnect: boolean;
}): SettingState => {
  const {folderName, errorMessage, metaByPath, savedHandle, needsReconnect} = args;
  return {folderName, errorMessage, metaByPath, savedHandle, needsReconnect} as SettingState;
};
