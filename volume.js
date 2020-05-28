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
  
  pe.setXrFramebuffer(xrfb);

  await pe.add(p);
  pe.tick();

  const rfb = gl.createFramebuffer();
  
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, xrfb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rfb);
  
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  
  const depthTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH24_STENCIL8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio, 0, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
  
  gl.blitFramebuffer(
    0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio,
    0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio,
    gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT, gl.NEAREST
  );
  
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

  document.body.appendChild(pe.domElement);
  const server = new MesherServer();
  return new THREE.Object3D();
};
export {
  getPreviewMesh,
};
