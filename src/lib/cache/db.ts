// src/lib/cache/db.ts

import {type DBSchema, type IDBPDatabase, openDB} from "idb";

type Mp3ListItem = { path: string; id: number; fileName: string };

interface AppDbSchema extends DBSchema {
  mp3Lists: {
    key: string; // dirKey
    value: { dirKey: string; updatedAt: number; items: Mp3ListItem[] };
  };
}

let dbPromise: Promise<IDBPDatabase<AppDbSchema>> | null = null;

export const getDb = (): Promise<IDBPDatabase<AppDbSchema>> => {
  if (!dbPromise) {
    dbPromise = openDB<AppDbSchema>("mp3-song-info-editor", 1, {
      upgrade(db) {
        db.createObjectStore("mp3Lists");
      },
    });
  }
  return dbPromise;
};

export type {Mp3ListItem};
