window.addEventListener('load', e => {

let options = localStorage.getItem('options');

// Read it using the storage API
chrome.storage.sync.get(['options'], function(items) {
  let {options = {}} = items;
  const {browser, webxr, webvr} = options;

  if (browser) {
    document.getElementById('browser').value = browser;
  }
  document.getElementById('webxr').checked = !!webxr;
  document.getElementById('webvr').checked = !!webvr;

  function _save() {
    console.log('save', options);
    chrome.storage.sync.set({options}, function() {
      // nothing
    });
  }
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