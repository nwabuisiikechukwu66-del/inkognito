/**
 * Minimal Service Worker for Inkognito PWA.
 * Enables install prompt and basic offline handling for shell assets.
 */

const CACHE_NAME = "ink-v1";
const ASSETS = [
  "/",
  "/manifest.json",
  "/globals.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
