const CACHE_NAME = 'geeooh-hotel-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/rooms.html',
    '/booking.html',
    '/booking-lookup.html',
    '/amenities.html',
    '/cart.html',
    '/about.html',
    '/contact.html',
    '/gallery.html',
    '/css/style.css',
    '/js/main.js',
    '/js/cart.js',
    '/js/auth.js',
    '/js/index.js',
    '/js/newsletter.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});