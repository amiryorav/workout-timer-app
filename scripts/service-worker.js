self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('workout-timer-v1').then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './editor.html',
        './styles/main.css',
        './styles/variables.css',
        './styles/player.css',
        './styles/editor.css',
        // Add all other assets here
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
