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
  {
    const gl = pe.context;
    const xrfb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, xrfb);
    
    const colorRenderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderbuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRenderbuffer);

    const depthRenderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.DEPTH24_STENCIL8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer);

    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    /* const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pe.options.width, pe.options.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); */
    
    pe.setXrFramebuffer(xrfb);
  }
  await pe.add(p);
  pe.tick();
  const server = new MesherServer();
  return new THREE.Object3D();
};
export {
  getPreviewMesh,
};
