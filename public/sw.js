// Basic Service Worker for PWA
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests
  event.respondWith(fetch(event.request));
});
