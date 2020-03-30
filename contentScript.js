console.log('contentScript.js', chrome.runtime.id, localStorage.getItem('xrpackageOptions'));

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

const script = document.createElement('script');
let options = localStorage.getItem('xrpackageOptions');
options = options ? JSON.parse(options) : {};
script.innerText = CONTENT_SCRIPT.replace('XRPACKAGE_OPTIONS', JSON.stringify(options));
(document.head||document.documentElement).prepend(script);