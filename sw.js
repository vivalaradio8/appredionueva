const CACHE_NAME = 'radio-player-cache-v3'; 
const urlsToCache = [
  '/',
  'index.html',
  'icon-192.png',
  'icon-512.png',
  'manifest.json', 
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2', 
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://i.ibb.co/chv25c9X/Dise-o-sin-t-tulo-3.png' 
];

self.addEventListener('install', (event) => {
  console.log(`Service Worker: Installing new version (${CACHE_NAME})...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell and core assets');
        
        const requestsToCache = urlsToCache.map(url => {
            if (url.startsWith('http')) {
                return new Request(url, { mode: 'cors', credentials: 'omit' });
            }
            return url; 
        });

        return cache.addAll(requestsToCache)
            .catch(err => {
                 console.error('Service Worker: Cache addAll failed during install', err);
                 const localEssentials = urlsToCache.filter(url => !url.startsWith('http'));
                 return cache.addAll(localEssentials);
            });
      })
      .catch(err => {
        console.error('Service Worker: Cache open/addAll failed', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`Service Worker: Activating new version (${CACHE_NAME})...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Old caches cleared.');
      return self.clients.claim(); 
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.url.match(/(\.css|\.js|\.png|\.jpg|\.jpeg|\.svg|\.woff|\.woff2|\.ttf|\.eot)$/i) || 
      event.request.destination === 'font' || 
      event.request.url.startsWith('https://cdnjs.cloudflare.com') ||
      event.request.url.startsWith('https://i.ibb.co')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                if (networkResponse.type !== 'opaque' && event.request.mode !== 'no-cors') {
                    console.error('SW: Network request failed, not caching:', event.request.url, networkResponse.status);
                    return networkResponse;
                }
            }
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }).catch(error => {
            console.error('Service Worker: Fetch failed for asset:', event.request.url, error);
          });
        })
    );
  } 
  else if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request) 
            .then(cachedResponse => cachedResponse || caches.match('index.html')); 
        })
    );
  }
  else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request).then((fetchResponse) => {
            return fetchResponse;
          });
        })
        .catch(err => {
            console.error('Service Worker: General Fetch failed', err, event.request.url);
        })
    );
  }
});