console.log('got load', window);

function makePromise() {
  let accept, reject;
  const p = new Promise((a, r) => {
    accept = a;
    reject = r;
  });
  p.accept = accept;
  p.reject = reject;
  return p;
}
let loadPromise = makePromise();
let domContentLoadedPromise = makePromise();
const xrLoadPromise = makePromise();
window.addEventListener('load', e => {
  loadPromise.accept(e);
});
window.addEventListener('DOMContentLoaded', e => {
  domContentLoadedPromise.accept(e);
});
window.addEventListener('xrload', e => {
  xrLoadPromise.accept(e);
});

const listeners = {
  load: [],
  domContentLoaded: [],
};
window.addEventListener = (old => function addEventListener(type, fn, opts) {
  if (type === 'load') {
    listeners.load.push(fn);
    loadPromise.then(e => {
      xrLoadPromise.then(() => {
        listeners.load.includes(fn) && fn(e);
      });
    });
  } else if (type === 'DOMContentLoaded') {
    listeners.domContentLoaded.push(fn);
    domContentLoadedPromise.then(e => {
      xrLoadPromise.then(() => {
        listeners.domContentLoaded.includes(fn) && fn(e);
      });
    });
  } else {
    old.apply(this, arguments);
  }
})(window.addEventListener);
window.removeEventListener = (old => function addEventListener(type, fn) {
  const ls = listeners[type];
  const index = ls.indexOf(fn);
  if (index !== -1) {
    ls.splice(index, 1);
  } else {
    removeEventListener.apply(this, arguments);
  }
})(window.removeEventListener);

{
  const script = document.createElement('script');
  // script.type = 'module';
  script.innerText = `
Object.defineProperty(navigator, 'userAgent', {get() {return 'Mozilla/5.0 (X11; Linux i686; rv:10.0) Gecko/20100101 Firefox/10.0';}});

Object.defineProperty(navigator, 'getVRDisplays', {
  get() {
    console.log('get 1', window.location.origin);
    return async function getVRDisplays() {
      // console.log('get vr displays', new Error().stack);
      return [{
        displayName: 'OpenVR',
        capabilities: {
          canPresent: true,
        },
      }];
    };
  },
  configurable: true,
});

Object.defineProperty(navigator, 'xr', {
  get() {
    console.log('get 2', window.location.origin);
    /* if (window.location.origin !== "https://hubs.mozilla.com") {
      return xr;
    } */
  },
  configurable: true,
});

console.log('run 1');
`;
  // script.textContent = '(' + contentScript.toString() + ')()';
  (document.head||document.documentElement).prepend(script);
}
/* {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'chrome-extension://oijfojbebpbpjfnlmndcgnocpbdeeghj/content.js';
  // script.textContent = '(' + contentScript.toString() + ')()';
  (document.head||document.documentElement).prepend(script);
} */