import THREE from '../three.module.js';

globalThis.addEventListener('message', e => {
  const j = e.data;
  const {method} = j;
  switch (method) {
    case 'init': {
      const {scriptUrl} = j;
      import(scriptUrl);
      URL.revokeObjectURL(scriptUrl);
      break;
    }
    case 'tick': {
      object.updateMatrixWorld();
      globalThis.postMessage({
      	matrix: object.matrixWorld.toArray(),
      });
      break;
    }
    default: {
      console.warn('unknown worker method', method);
      break;
    }
  }
});

const object = new THREE.Object3D();
globalThis.object = object;
globalThis.requestAnimationFrame = fn => setTimeout(fn);
globalThis.cancelAnimationFrame = r => clearTimeout(r);