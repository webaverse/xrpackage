console.log('got load', window);

/* function makePromise() {
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
})(window.removeEventListener); */

console.log('contentScript.js', localStorage.getItem('options'));

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // console.log('got request', request);
    if (request.method === 'getOptions') {
      let options = localStorage.getItem('xrpackageOptions');
      options = options ? JSON.parse(options) : {};
      sendResponse({
        options,
      });
    } else if (request.method === 'setOptions') {
      localStorage.setItem('xrpackageOptions', JSON.stringify(request.options));
      sendResponse({
        ok: true,
      });
  }
});

{
  const script = document.createElement('script');
  // script.type = 'module';
  script.innerText = CONTENT_SCRIPT;
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