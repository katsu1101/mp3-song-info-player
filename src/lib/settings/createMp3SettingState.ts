// src/lib/settings/createMp3SettingState.ts
import type {SettingState}    from "@/types/setting";
import type {TrackMetaByPath} from "@/features/mp3/types/trackMeta";

export const createMp3SettingState = (args: {
  folderName: string;
  errorMessage: string;
  metaByPath: TrackMetaByPath;
  savedHandle: FileSystemDirectoryHandle | null;
  needsReconnect: boolean;
}): SettingState => {
  const {folderName, errorMessage, metaByPath, savedHandle, needsReconnect} = args;
  return {folderName, errorMessage, metaByPath, savedHandle, needsReconnect} as SettingState;
};
