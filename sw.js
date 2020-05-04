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
        // console.log('hijack file 1', client.url, files);
        if (match = client.url.match(/#id=(.+)$/)) {
          const id = parseInt(match[1], 10);
          const files = hijackedIds[id];
          // console.log('hijack file 2', client.url, files);
          if (files) {
            const pathname = new URL(event.request.url).pathname;
            // console.log('hijack file 2', pathname, files);
            if (!/\/xrpackage\//.test(pathname)) {
              const file = files.find(f => f.pathname === pathname);
              // console.log('hijack file 3', pathname, file);
              if (file) {
                return new Response(file.body);
              }
            }
          }
        }
      }
      return fetch(event.request);
    })
  );
});