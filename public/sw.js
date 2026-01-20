// public/sw.js

// 最小: “存在する” ことが目的。挙動は変えない。
// TODO(推奨): オフライン対応をしたくなったら、ここにキャッシュ戦略を追加
// TODO(推奨): 更新制御（古いキャッシュ削除）を入れるなら activate で対応

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// fetch は “置くだけ”。何もしない（素通し）
self.addEventListener("fetch", () => {
});
