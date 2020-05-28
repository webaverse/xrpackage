import THREE from './three.module.js';
import {XRPackageEngine} from './xrpackage.js';
import {MesherServer} from './mesher.js';

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
const modulePromise = makePromise();
self.wasmModule = (moduleName, moduleFn) => {
  if (moduleName === 'mc') {
    self.Module = moduleFn({
      print(text) { console.log(text); },
      printErr(text) { console.warn(text); },
      locateFile(path, scriptDirectory) {
        if (path === 'mc.wasm') {
          return 'bin/' + path;
        } else {
          return path;
        }
      },
      onRuntimeInitialized: () => {
        modulePromise.accept();
      },
    });

    // console.log('got module', Module);
  } else {
    console.warn('unknown wasm module', moduleName);
  }
};
import('./bin/mc.js');

const getPreviewMesh = async p => {
  const pe = new XRPackageEngine({
    autoStart: false,
  });
  await pe.add(p);
  pe.tick();
  const server = new MesherServer();
  return new THREE.Object3D();
};
export {
  getPreviewMesh,
};
