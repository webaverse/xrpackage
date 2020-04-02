window.addEventListener('load', e => {

const tabs = Array.from(document.querySelectorAll('header > .nav'));
const sections = Array.from(document.querySelectorAll('section'));
for (let i = 0; i < tabs.length; i++) {
  const tab = tabs[i];
  tab.addEventListener('click', e => {
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('open');
    }
    tab.classList.add('open');

    const tabName = tab.getAttribute('tab');
    for (let i = 0; i < sections.length; i++) {
      sections[i].classList.remove('open');
    }
    document.querySelector('section.' + tabName).classList.add('open');
  });
}

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

    let packageFile = null;
    const _handleUpload = file => {
      packageFile = file;
    };
    const _bindUploadFileButton = (inputFileEl, handleUpload) => {
      console.log('bind upload file button', inputFileEl);
      inputFileEl.addEventListener('change', async e => {
        const {files} = e.target;
        if (files.length === 1) {
          const [file] = files;
          handleUpload(file);
        }

        const {parentNode} = inputFileEl;
        parentNode.removeChild(inputFileEl);
        const newInputFileEl = inputFileEl.ownerDocument.createElement('input');
        newInputFileEl.type = 'file';
        // newInputFileEl.id = 'upload-file-button';
        // newInputFileEl.style.display = 'none';
        parentNode.appendChild(newInputFileEl);
        _bindUploadFileButton(newInputFileEl);
      });
    };
    _bindUploadFileButton(document.getElementById('file-input'), _handleUpload);
    document.getElementById('load-button').addEventListener('click', async e => {
      console.log('reading');
      // const u = URL.createObjectURL(packageFile);
      const u = await new Promise((accept, reject) => {
        const r = new FileReader();
        r.readAsDataURL(packageFile);
        r.onload = () => {
          accept(r.result);
        };
        r.onerror = reject;
      });
      chrome.tabs.sendMessage(tabs[0].id, {method: 'loadpackage', url: u}, response => {
        console.log('got response set', response);
      });
      // console.log('posting', arrayBuffer);
      /* parent.postMessage({
        event: 'load',
        arrayBuffer,
      }, '*', [arrayBuffer]); */
    });
  });
});

if (/#overlay$/.test(location.hash)) {
  document.body.parentNode.classList.add('overlay');

  const mousetarget = document.getElementById('mousetarget');
  mousetarget.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    const {button, clientX, clientY} = e;
    parent.postMessage({
      event: 'mousedown',
      button,
      clientX,
      clientY,
    }, '*');
  });
  mousetarget.addEventListener('mouseup', e => {
    e.preventDefault();
    e.stopPropagation();
    const {button, clientX, clientY} = e;
    parent.postMessage({
      event: 'mouseup',
      button,
      clientX,
      clientY,
    }, '*');
  });
  mousetarget.addEventListener('mousemove', e => {
    e.preventDefault();
    e.stopPropagation();
    const {button, clientX, clientY, movementX, movementY} = e;
    parent.postMessage({
      event: 'mousemove',
      button,
      clientX,
      clientY,
      movementX,
      movementY,
    }, '*');
  });
  mousetarget.addEventListener('wheel', e => {
    e.preventDefault();
    e.stopPropagation();
    const {button, clientX, clientY, deltaX, deltaY} = e;
    parent.postMessage({
      event: 'wheel',
      button,
      clientX,
      clientY,
      deltaX,
      deltaY,
    }, '*');
  });
  mousetarget.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
  });
}

});