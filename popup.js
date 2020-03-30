window.addEventListener('load', e => {

let options = localStorage.getItem('options');
// console.log('got options', options);
options = options ? JSON.parse(options) : {};
const {browser, webxr, webvr} = options;

if (browser) {
  document.getElementById('browser').value = browser;
}
document.getElementById('webxr').checked = !!webxr;
document.getElementById('webvr').checked = !!webvr;

function _save() {
  console.log('save', options);
  localStorage.setItem('options', JSON.stringify(options));
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