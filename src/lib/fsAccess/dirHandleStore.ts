import {STORAGE} from "@/lib/storage/constants";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(STORAGE.IDB.DB_NAME, STORAGE.IDB.VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORAGE.IDB.STORE_HANDLES)) {
        db.createObjectStore(STORAGE.IDB.STORE_HANDLES);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const saveDirectoryHandle = async (handle: FileSystemDirectoryHandle) => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORAGE.IDB.STORE_HANDLES, "readwrite");
    tx.objectStore(STORAGE.IDB.STORE_HANDLES).put(handle, STORAGE.IDB.KEY_MUSIC_DIR);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORAGE.IDB.STORE_HANDLES, "readonly");
    const req = tx.objectStore(STORAGE.IDB.STORE_HANDLES).get(STORAGE.IDB.KEY_MUSIC_DIR);
    req.onsuccess = () => resolve((req.result ?? null) as FileSystemDirectoryHandle | null);
    req.onerror = () => reject(req.error);
  });
};

export const clearDirectoryHandle = async () => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORAGE.IDB.STORE_HANDLES, "readwrite");
    tx.objectStore(STORAGE.IDB.STORE_HANDLES).delete(STORAGE.IDB.KEY_MUSIC_DIR);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
