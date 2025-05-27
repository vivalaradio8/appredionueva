self.addEventListener('install', event => {
  console.log('✅ Service Worker instalado');
});

self.addEventListener('fetch', event => {
  // Aquí podrías hacer caching en el futuro
});
