window.addEventListener('load', () => {
  console.log('got load', window);

  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'chrome-extension://oijfojbebpbpjfnlmndcgnocpbdeeghj/content.js';
  // script.textContent = '(' + contentScript.toString() + ')()';
  (document.head||document.documentElement).prepend(script);

  // Object.defineProperty(navigator, 'xr', {get() {return 'lol'}})

  // delete navigator.xr;
  // navigator.xr = {lol: 'zol'};
});