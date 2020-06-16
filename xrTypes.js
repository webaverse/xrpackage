import symbols from './xrpackage/symbols';
import { GLTFLoader } from './xrpackage/GLTFLoader';
import { VOXLoader } from './xrpackage/VOXLoader';

function makePromise() {
  let resolve, reject;
  const result = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  result.resolve = resolve;
  result.reject = reject;
  return result;
}

const xrTypeAdders = {
  'webxr-site@0.0.1': async function(p) {
    document.body.appendChild(p.context.iframe);
    await new Promise((accept, reject) => {
      p.context.iframe.addEventListener('load', accept);
      p.context.iframe.addEventListener('error', reject);
    });

    function emitKeyboardEvent(e) {
      p.context.iframe.contentWindow.dispatchEvent(new KeyboardEvent(e.type, e));
    }

    p.context.emitKeyboardEvent = emitKeyboardEvent;

    window.addEventListener('keydown', emitKeyboardEvent, true);
    window.addEventListener('keyup', emitKeyboardEvent, true);
    window.addEventListener('keypress', emitKeyboardEvent, true);

    p.matrixWorldNeedsUpdate = true;

    p.context.requestPresentPromise = makePromise();

    const d = p.getMainData();
    const indexHtml = d.toString('utf8');
    await p.context.iframe.contentWindow.xrpackage.iframeInit({
      engine: this,
      pkg: p,
      indexHtml,
      context: this.proxyContext,
      id: p.id,
      schema: p.schema,
      xrState: this.xrState,
      XRPackage,
    });
    const xrfb = this.realSession ? this.realSession.renderState.baseLayer.framebuffer : this.fakeXrFramebuffer;
    p.setXrFramebuffer(xrfb);

    await p.context.requestPresentPromise;
  },
  'gltf@0.0.1': async function(p) {
    this.container.add(p.context.object);
  },
  'vrm@0.0.1': async function(p) {
    this.container.add(p.context.object);
  },
  'vox@0.0.1': async function(p) {
    this.container.add(p.context.object);
  },
};

const xrTypeLoaders = {
  'webxr-site@0.0.1': async function(p) {
    const iframe = document.createElement('iframe');
    iframe.src = '/' + p.main;
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.visibility = 'hidden';

    p.context.iframe = iframe;
  },
  'gltf@0.0.1': async function(p) {
    const d = p.getMainData();
    const b = new Blob([d], {
      type: 'application/octet-stream',
    });
    const u = URL.createObjectURL(b);
    const {scene} = await new Promise((accept, reject) => {
      new GLTFLoader().load(u, accept, function onProgress() {}, reject);
    });
    URL.revokeObjectURL(u);

    p.context.object = scene;
    p.matrixWorldNeedsUpdate = true;

    if (p.details.script) {
      const scriptPath = '/' + p.details.script;
      const scriptFile = p.files.find(file => new URL(file.url).pathname === scriptPath);
      const scriptBlob = new Blob([scriptFile.response.body], {
        type: 'text/javascript',
      });
      const scriptUrl = URL.createObjectURL(scriptBlob);
      const worker = new Worker(scriptPath, {
        type: 'module',
      });
      worker.postMessage({
        method: 'init',
        scriptUrl,
      });
      worker.addEventListener('message', e => {
        const j = e.data;
        const {method} = j;
        switch (method) {
          case 'update': {
            const {matrix} = j;
            scene.matrix
              .fromArray(matrix)
              .decompose(scene.position, scene.quaternion, scene.scale);
            break;
          }
          case 'message': {
            const {data} = j;
            console.log('got message bus payload', data);
            break;
          }
          default: {
            console.warn('major message debugging');
            break;
          }
        }
      });
      p.context.worker = worker;
    }
  },
  'vrm@0.0.1': async function(p) {
    const d = p.getMainData();
    const b = new Blob([d], {
      type: 'application/octet-stream',
    });
    const u = URL.createObjectURL(b);
    const o = await new Promise((accept, reject) => {
      new GLTFLoader().load(u, accept, function onProgress() {}, reject);
    });
    URL.revokeObjectURL(u);

    p.context.object = o.scene;
    p.context.model = o;
    o.scene.traverse(o => {
      o.frustumCulled = false;
    });
    p.matrixWorldNeedsUpdate = true;
  },
  'vox@0.0.1': async function(p) {
    const d = p.getMainData();
    const b = new Blob([d], {
      type: 'application/octet-stream',
    });
    const u = URL.createObjectURL(b);
    const o = await new Promise((accept, reject) => {
      new VOXLoader().load(u, accept, function onProgress() {}, reject);
    });
    URL.revokeObjectURL(u);

    p.context.object = o;
    p.matrixWorldNeedsUpdate = true;
  },
  'xrpackage-scene@0.0.1': async function(p) {
    const d = p.getMainData();
    const j = JSON.parse(d.toString('utf8'));

    p.context.json = j;
  },
};

const xrTypeRemovers = {
  'webxr-site@0.0.1': function(p) {
    this.rafs = this.rafs.filter(raf => {
      const rafWindow = raf[symbols.windowSymbol];
      const rafPackage = this.packages.find(p => p.context.iframe && p.context.iframe.contentWindow === rafWindow);
      return rafPackage !== p;
    });

    const emitKeyboardEvent = p.context.emitKeyboardEvent;

    window.removeEventListener('keydown', emitKeyboardEvent, true);
    window.removeEventListener('keyup', emitKeyboardEvent, true);
    window.removeEventListener('keypress', emitKeyboardEvent, true);

    p.context.iframe && p.context.iframe.parentNode.removeChild(p.context.iframe);
  },
  'gltf@0.0.1': function(p) {
    this.container.remove(p.context.object);
  },
  'vrm@0.0.1': function(p) {
    this.container.remove(p.context.object);
  },
  'vox@0.0.1': function(p) {
    this.container.remove(p.context.object);
  },
};

export {
  xrTypeAdders,
  xrTypeLoaders,
  xrTypeRemovers
}
