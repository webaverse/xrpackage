window.addEventListener('load', e => {

let options = localStorage.getItem('options');

// Read it using the storage API
chrome.tabs.query({
  active: true,
  currentWindow: true,
}, tabs => {
  console.log('got tabs', tabs);
  chrome.tabs.sendMessage(tabs[0].id, {method: 'getOptions'}, response => {
    console.log('got response get', response);
    response = response || {};
    let {options} = response;
    options = options || {};
    const {enabled, browser, webxr, webvr} = options;

    document.getElementById('enabled').checked = !!enabled;
    if (browser) {
      document.getElementById('browser').value = browser;
    }
    document.getElementById('webxr').checked = !!webxr;
    document.getElementById('webvr').checked = !!webvr;

    function _save() {
      console.log('save', options);
      chrome.tabs.sendMessage(tabs[0].id, {method: 'setOptions', options}, response => {
        console.log('got response set', response);
      });
    }
    document.getElementById('enabled').addEventListener('change', () => {
      options.enabled = document.getElementById('enabled').checked;
      _save();
    });
    document.getElementById('browser').addEventListener('change', () => {
      options.browser = document.getElementById('browser').value;
      _save();
    });
    document.getElementById('webxr').addEventListener('change', () => {
      options.webxr = document.getElementById('webxr').checked;
      _save();
    });
    document.getElementById('webvr').addEventListener('change', () => {
      options.webvr = document.getElementById('webvr').checked;
      _save();
    });
  });
});

});