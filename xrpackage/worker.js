globalThis.addEventListener('message', e => {
  const j = e.data;
  const {method} = j;
  switch (method) {
    case 'init': {
      const {scriptUrl} = j;
      importScripts(scriptUrl);
      URL.revokeObjectURL(scriptUrl);
      break;
    }
  }
});