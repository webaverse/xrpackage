const hijackedIds = {};
self.addEventListener('message', e => {
  const {
    data
  } = e;
  // console.log('service worker got message', data);
  const {
    method
  } = data;
  if (method === 'hijack') {
    const {
      id,
      files
    } = data;
    // console.log('register hijack', files);
    hijackedIds[id] = files;
  } else {
    console.warn('unknown method', method);
  }
  /* const {method} = data;
  if (method === 'redirect') {
    const {src, dst} = data;
    let redirectsArray = redirects[src];
    if (!redirectsArray) {
      redirectsArray = [];
      redirects[src] = redirectsArray;
    }
    redirectsArray.push(dst);
  } */
  e.ports[0].postMessage({});
});
self.addEventListener('install', event => {
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  // console.log('sw activate');
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const {
    clientId
  } = event;
  // console.log('got request', event.request.url);

  event.respondWith(
    clients.get(clientId)
    .then(client => {
      // console.log('got client', event.request.url, !!(client && client.frameType === 'nested'));
      if (client && client.frameType === 'nested') {
        let match;
        if (match = client.url.match(/#id=(.+)$/)) {
          const id = parseInt(match[1], 10);
          const files = hijackedIds[id];
          // console.log('req match 1', id, files);
          if (files) {
            // return fetch(event.request.url.replace('0/', '0/noclip.website/dist/'));

            const pathname = new URL(event.request.url).pathname;
            const file = files.find(f => f.pathname === pathname);
            // console.log('req match 2', id, file);
            if (file) {
              // console.log('got id', id, event.request.url, file);
              return new Response(file.body);
            } else {
              // return fetch(event.request);
              /* return new Response('', {
                  status: 404,
                }); */
            }
          }
        }
      }
      return fetch(event.request);
    })
  );
});