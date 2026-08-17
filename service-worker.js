const CACHE_VERSION = 'iron-v4';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

/*
 * INSTALAÇÃO
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});


/*
 * ATIVAÇÃO
 *
 * Remove caches antigos.
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key => key !== CACHE_VERSION)
                        .map(key => caches.delete(key))
                );
            })
            .then(() => self.clients.claim())
    );
});


/*
 * FETCH
 */
self.addEventListener('fetch', event => {

    const request = event.request;

    // Somente GET
    if (request.method !== 'GET') {
        return;
    }

    /*
     * Para páginas HTML:
     *
     * NETWORK FIRST
     *
     * Sempre tenta buscar a versão atual.
     * Se estiver offline, utiliza o cache.
     */
    if (
        request.mode === 'navigate' ||
        request.destination === 'document' ||
        request.url.endsWith('/index.html')
    ) {

        event.respondWith(
            fetch(request)
                .then(networkResponse => {

                    if (
                        networkResponse &&
                        networkResponse.status === 200
                    ) {

                        const responseClone = networkResponse.clone();

                        caches.open(CACHE_VERSION)
                            .then(cache => {
                                cache.put(request, responseClone);
                            });
                    }

                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(cachedResponse => {

                            if (cachedResponse) {
                                return cachedResponse;
                            }

                            return caches.match('./index.html');
                        });
                })
        );

        return;
    }


    /*
     * Outros arquivos:
     *
     * CACHE FIRST
     *
     * Ideal para:
     * - imagens
     * - ícones
     * - fontes
     * - arquivos estáticos
     */
    event.respondWith(

        caches.match(request)
            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then(networkResponse => {

                        if (
                            networkResponse &&
                            networkResponse.status === 200 &&
                            networkResponse.type !== 'opaque'
                        ) {

                            const responseClone =
                                networkResponse.clone();

                            caches.open(CACHE_VERSION)
                                .then(cache => {
                                    cache.put(request, responseClone);
                                });
                        }

                        return networkResponse;
                    })
                    .catch(() => {
                        return caches.match('./index.html');
                    });
            })
    );
});
