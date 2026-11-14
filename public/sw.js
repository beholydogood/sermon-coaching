const CACHE_NAME = 'sermon-studio-cache-v2.5.3';

self.addEventListener('install', (event) => {
  // 새 서비스 워커가 설치되는 즉시 활성화 대기 상태를 건너뜀
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] 이전 캐시 삭제:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
