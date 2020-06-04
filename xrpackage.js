import * as THREE from './xrpackage/three.module.js';
import * as XR from './xrpackage/XR.js';
import symbols from './xrpackage/symbols.js';
import {getExports} from './xrpackage/Graphics.js';
const {getContext, CanvasRenderingContext2D, WebGLRenderingContext, WebGL2RenderingContext} = getExports();
import wbn from './xrpackage/wbn.js';
import {GLTFLoader} from './xrpackage/GLTFLoader.js';
import {VOXLoader} from './xrpackage/VOXLoader.js';
import {OrbitControls} from './xrpackage/OrbitControls.js';
import Avatar from './xrpackage/avatars/avatars.js';
import utils from './xrpackage/utils.js';
const {requestSw} = utils;
export const apiHost = `https://ipfs.exokit.org/ipfs`;

const primaryUrl = `https://xrpackage.org`;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
const localArray = Array(16);

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
const _cloneBundle = (bundle, options = {}) => {
  const except = options.except || [];
  const urlSpec = new URL(bundle.primaryURL);
  const primaryUrl = urlSpec.origin;
  const startUrl = urlSpec.pathname.replace(/^\//, '');
  const builder = new wbn.BundleBuilder(primaryUrl + '/' + startUrl);
  for (const u of bundle.urls) {
    const {pathname} = new URL(u);
    if (!except.includes(pathname)) {
      const res = bundle.getResponse(u);
      const type = res.headers['content-type'];
      const data = res.body;
      builder.addExchange(primaryUrl + pathname, 200, {
        'Content-Type': type,
      }, data);
    }
  }
  return builder;
};

const HANDS = ['left', 'right'];
const _oppositeHand = handedness => {
  if (handedness === 'left') {
    return 'right';
  } else if (handedness === 'right') {
    return 'left';
  } else {
    return null;
  }
};
const leftHandOffset = new THREE.Vector3(0.2, -0.2, -0.3);
const rightHandOffset = new THREE.Vector3(-0.2, -0.2, -0.3);
const SLOTS = ['head', 'left', 'right', 'back'];
const _getSlotInput = (rig, slot) => {
  if (slot === 'head') {
    return rig.inputs.hmd;
  } else if (slot === 'left' || slot === 'right') {
    return rig.inputs[slot + 'Gamepad'];
  } else if (slot === 'back') {
    const {hmd} = rig.inputs;
    return {
      position: hmd.position.clone()
        .add(localVector.set(0, 0, 0.2).applyQuaternion(hmd.quaternion)),
      quaternion: hmd.quaternion.clone()
        .multiply(localQuaternion.setFromAxisAngle(localVector.set(0, 1, 0), -Math.PI/2))
        .multiply(localQuaternion.setFromAxisAngle(localVector.set(0, 0, 1), Math.PI)),
      scale: hmd.scale,
    };
  } else {
    return null;
  }
};

const _removeUrlTail = u => u.replace(/(?:\?|\#).*$/, '');

const _initSw = async () => {
  await navigator.serviceWorker.register('/sw.js', {
    // type: 'module',
  });
  if (!navigator.serviceWorker.controller) {
    await new Promise((accept, reject) => {
      const _controllerchange = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.removeEventListener('controllerchange', _controllerchange);
          clearTimeout(timeout);
          accept();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', _controllerchange);
      const timeout = setTimeout(() => {
        console.warn('sw registration timed out');
        debugger;
      }, 10 * 1000);
    });
  }
  console.log('sw registration', window.registration);
};
const swLoadPromise = _initSw().then(() => {});

const _makeXrState = () => {
  const _makeSab = size => {
    const sab = new ArrayBuffer(size);
    let index = 0;
    return (c, n) => {
      const result = new c(sab, index, n);
      index += result.byteLength;
      return result;
    };
  };
  const _makeTypedArray = _makeSab(32*1024);

  const result = {};
  result.isPresenting = _makeTypedArray(Uint32Array, 1);
  result.isPresentingReal = _makeTypedArray(Uint32Array, 1);
  result.renderWidth = _makeTypedArray(Float32Array, 1);
  result.renderHeight = _makeTypedArray(Float32Array, 1);
  result.metrics = _makeTypedArray(Uint32Array, 2);
  result.metrics[0] = window.innerWidth;
  result.metrics[1] = window.innerHeight;
  result.devicePixelRatio = _makeTypedArray(Float32Array, 1);
  result.devicePixelRatio[0] = window.devicePixelRatio;
  result.stereo = _makeTypedArray(Uint32Array, 1);
  // result.stereo[0] = 1;
  result.canvasViewport = _makeTypedArray(Float32Array, 4);
  result.canvasViewport.set(Float32Array.from([0, 0, window.innerWidth, window.innerHeight]));
  result.depthNear = _makeTypedArray(Float32Array, 1);
  result.depthNear[0] = 0.1;
  result.depthFar = _makeTypedArray(Float32Array, 1);
  result.depthFar[0] = 2000.0;
  /* result.position = _makeTypedArray(Float32Array, 3);
  result.orientation = _makeTypedArray(Float32Array, 4);
  result.orientation[3] = 1; */
  result.poseMatrix = _makeTypedArray(Float32Array, 16);
  result.poseMatrix.set(Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
  result.leftViewMatrix = _makeTypedArray(Float32Array, 16);
  result.leftViewMatrix.set(Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
  result.rightViewMatrix = _makeTypedArray(Float32Array, 16);
  result.rightViewMatrix.set(result.leftViewMatrix);
  // new THREE.PerspectiveCamera(110, 2, 0.1, 2000).projectionMatrix.toArray()
  result.leftProjectionMatrix = _makeTypedArray(Float32Array, 16);
  result.leftProjectionMatrix.set(Float32Array.from([0.3501037691048549, 0, 0, 0, 0, 0.7002075382097098, 0, 0, 0, 0, -1.00010000500025, -1, 0, 0, -0.200010000500025, 0]));
  result.rightProjectionMatrix = _makeTypedArray(Float32Array, 16);
  result.rightProjectionMatrix.set(result.leftProjectionMatrix);
  result.leftOffset = _makeTypedArray(Float32Array, 3);
  result.leftOffset.set(Float32Array.from([-0.625/2, 0, 0]));
  result.rightOffset = _makeTypedArray(Float32Array, 3);
  result.leftOffset.set(Float32Array.from([0.625/2, 0, 0]));
  result.leftFov = _makeTypedArray(Float32Array, 4);
  result.leftFov.set(Float32Array.from([45, 45, 45, 45]));
  result.rightFov = _makeTypedArray(Float32Array, 4);
  result.rightFov.set(result.leftFov);
  const _makeGamepad = () => ({
    connected: _makeTypedArray(Uint32Array, 1),
    position: _makeTypedArray(Float32Array, 3),
    orientation: (() => {
      const result = _makeTypedArray(Float32Array, 4);
      result[3] = 1;
      return result;
    })(),
    direction: (() => { // derived
      const result = _makeTypedArray(Float32Array, 4);
      result[2] = -1;
      return result;
    })(),
    transformMatrix: (() => { // derived
      const result = _makeTypedArray(Float32Array, 16);
      result.set(Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
      return result;
    })(),
    buttons: (() => {
      const result = Array(10);
      for (let i = 0; i < result.length; i++) {
        result[i] = {
          pressed: _makeTypedArray(Uint32Array, 1),
          touched: _makeTypedArray(Uint32Array, 1),
          value: _makeTypedArray(Float32Array, 1),
        };
      }
      return result;
    })(),
    axes: _makeTypedArray(Float32Array, 10),
  });
  result.gamepads = (() => {
    const result = Array(2);
    for (let i = 0; i < result.length; i++) {
      result[i] = _makeGamepad();
    }
    return result;
  })();

  return result;
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
const xrTypeAdders = {
  'webxr-site@0.0.1': async function(p) {
    document.body.appendChild(p.context.iframe);
    await new Promise((accept, reject) => {
      p.context.iframe.addEventListener('load', accept);
      p.context.iframe.addEventListener('error', reject);
    });
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
    p.setXrFramebuffer(this.fakeSession.xrFramebuffer);

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
const xrTypeRemovers = {
  'webxr-site@0.0.1': function(p) {
    this.rafs = this.rafs.filter(raf => {
      const rafWindow = raf[symbols.windowSymbol];
      const rafPackage = this.packages.find(p => p.context.iframe && p.context.iframe.contentWindow === rafWindow);
      return rafPackage !== p;
    });

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

export class XRPackageEngine extends EventTarget {
  constructor(options) {
    super();

    options = options || {};
    options.width = typeof options.width === 'number' ? options.width : window.innerWidth;
    options.height = typeof options.height === 'number' ? options.height : window.innerHeight;
    options.devicePixelRatio = typeof options.devicePixelRatio === 'number' ? options.devicePixelRatio : window.devicePixelRatio;
    options.autoStart = typeof options.autoStart === 'boolean' ? options.autoStart : true;
    options.autoListen = typeof options.autoListen === 'boolean' ? options.autoListen : true;
    this.options = options;

    const canvas = document.createElement('canvas');
    canvas.style.outline = 'none';
    this.domElement = canvas;
    const proxyContext = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      xrCompatible: true,
    });
    canvas.proxyContext = proxyContext;
    this.proxyContext = proxyContext;
    
    this.xrState = _makeXrState();
    this.xrState.renderWidth[0] = options.width / 2 * options.devicePixelRatio;
    this.xrState.renderHeight[0] = options.height * options.devicePixelRatio;
    this.matrix = new THREE.Matrix4();

    const context = this.getContext('webgl2');
    this.context = context;
    
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      // preserveDrawingBuffer: true,
    });
    renderer.setSize(options.width, options.height);
    renderer.setPixelRatio(options.devicePixelRatio);
    // renderer.setClearAlpha(0);
    renderer.autoClear = false;
    // renderer.sortObjects = false;
    renderer.physicallyCorrectLights = true;
    renderer.xr.enabled = true;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(60, options.width / options.height, 0.1, 1000);
    camera.position.set(0, 1, 2);
    camera.rotation.order = 'YXZ';
    this.camera = camera;
    
    renderer.render(scene, camera); // pre-render the scene to compile

    const container = new THREE.Object3D();
    scene.add(container);
    this.container = container;

    const orbitControls = new OrbitControls(camera, canvas, document);
    orbitControls.screenSpacePanning = true;
    orbitControls.enableMiddleZoom = false;
    orbitControls.update();
    this.orbitControls = orbitControls;

    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    container.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    directionalLight.position.set(10, 10, 10)
    container.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 3);
    container.add(directionalLight2);

    this.fakeSession = new XR.XRSession(this.xrState, this.matrix);
    this.fakeSession.onrequestanimationframe = fn => this.packageRequestAnimationFrame(fn, globalThis);
    this.fakeSession.oncancelanimationframe = this.packageCancelAnimationFrame.bind(this);

    renderer.xr.setSession(this.fakeSession);

    this.name = 'XRPackage Scene';
    this.packages = [];
    this.ids = 0;
    this.rafs = [];
    this.xrFramebuffer = null;
    this.grabs = {
      left: null,
      right: null,
    };
    this.grabuses = {
      left: null,
      right: null,
    };
    this.equips = {
      head: null,
      left: null,
      right: null,
      back: null,
    };
    this.rig = null;
    this.rigMatrix = new THREE.Matrix4();
    this.rigMatrixEnabled = false;
    this.avatar = null;
    this.realSession = null;
    this.referenceSpace = null;
    this.loadReferenceSpaceInterval = 0;
    this.cancelFrame = null;

    options.autoStart && this.start();
    options.autoListen && this.listen();
  }
  getContext(type, opts) {
    return getContext.call(this.domElement, type, opts);
  }
  start() {
    this.setSession(null);
  }
  listen() {
    window.addEventListener('resize', e => {
      if (!this.realSession) {
        this.resize(window.innerWidth, window.innerHeight);
      }
    });
  }
  resize(width = this.options.width, height = this.options.height, devicePixelRatio = this.options.devicePixelRatio) {
    this.renderer.xr.isPresenting = false;

    this.renderer.setSize(width, height);
    this.xrState.renderWidth[0] = width / 2 * devicePixelRatio;
    this.xrState.renderHeight[0] = height * devicePixelRatio;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.xr.isPresenting = true;
    
    this.options.width = width;
    this.options.height = height;
    this.options.devicePixelRatio = devicePixelRatio;
  }
  async add(p) {
    p.parent = this;
    this.packages.push(p);

    this.dispatchEvent(new MessageEvent('packageadd', {
      data: p,
    }));

    await p.waitForLoad();

    const {type} = p;
    const adder = xrTypeAdders[type];
    if (adder) {
      await adder.call(this, p);
    } else {
      this.remove(p);
      throw new Error(`unknown xr_type: ${type}`);
    }
  }
  remove(p) {
    const index = this.packages.indexOf(p);
    if (index !== -1) {
      const {type} = p;
      const remover = xrTypeRemovers[type];
      if (remover) {
        remover.call(this, p);
        p.parent = null;

        this.packages.splice(index, 1);

        this.dispatchEvent(new MessageEvent('packageremove', {
          data: p,
        }));
      }
    } else {
      throw new Error(`unknown xr_type: ${type}`);
    }
  }
  setMatrix(m) {
    this.matrix.copy(m);
    // this.container.matrix.getInverse(m).decompose(this.container.position, this.container.quaternion, this.container.scale);

    for (let i = 0; i < this.packages.length; i++) {
      this.packages[i].matrixWorldNeedsUpdate = true;
    }
  }
  getProxySession({
    order = 0,
  } = {}) {
    const session = Object.create(this.fakeSession);
    session.onrequestanimationframe = fn => this.packageRequestAnimationFrame(fn, globalThis, order);
    session.addEventListener = this.fakeSession.addEventListener.bind(this.fakeSession);
    session.removeEventListener = this.fakeSession.removeEventListener.bind(this.fakeSession);
    return session;
  }
  async setSession(realSession) {
    if (this.cancelFrame) {
      this.cancelFrame();
      this.cancelFrame = null;
    }
    if (this.loadReferenceSpaceInterval !== 0) {
      clearInterval(this.loadReferenceSpaceInterval);
      this.loadReferenceSpaceInterval = 0;
    }
    if (realSession) {
      let referenceSpaceType = '';
      const _loadReferenceSpace = async () => {
        const lastReferenceSpaceType = referenceSpaceType;
        let referenceSpace;
        try {
          referenceSpace = await realSession.requestReferenceSpace('local-floor');
          referenceSpaceType = 'local-floor';
        } catch (err) {
          referenceSpace = await realSession.requestReferenceSpace('local');
          referenceSpaceType = 'local';
        }

        if (referenceSpaceType !== lastReferenceSpaceType) {
          console.log(`referenceSpace changed to ${referenceSpaceType}`);
          this.referenceSpace = referenceSpace;
        }
      };
      await _loadReferenceSpace();
      this.loadReferenceSpaceInterval = setInterval(_loadReferenceSpace, 1000);

      const baseLayer = new window.OldXR.XRWebGLLayer(realSession, this.proxyContext);
      realSession.updateRenderState({baseLayer});

      await new Promise((accept, reject) => {
        const _recurse = () => {
          realSession.requestAnimationFrame((timestamp, frame) => {
            const pose = frame.getViewerPose(this.referenceSpace);
            if (pose) {
              const viewport = baseLayer.getViewport(pose.views[0]);
              const width = viewport.width;
              const height = viewport.height;
              /* const fullWidth = (() => {
                let result = 0;
                for (let i = 0; i < pose.views.length; i++) {
                  result += baseLayer.getViewport(pose.views[i]).width;
                }
                return result;
              })(); */

              this.xrState.isPresentingReal[0] = 1;
              this.xrState.stereo[0] = 1;
              this.xrState.renderWidth[0] = width;
              this.xrState.renderHeight[0] = height;

              const animate = (timestamp, frame) => {
                const frameId = realSession.requestAnimationFrame(animate);
                this.cancelFrame = () => {
                  realSession.cancelAnimationFrame(frameId);
                };
                this.tick(timestamp, frame);
              };
              realSession.requestAnimationFrame(animate);

              accept();

              console.log('XR setup complete');
            } else {
              console.warn('XR setup deferred due to no pose');

              _recurse();
            }
          });
        };
        _recurse();
      });
      this.realSession = realSession;
    } else {
      const animate = timestamp => {
        const frameId = window.requestAnimationFrame(animate);
        this.cancelFrame = () => {
          window.cancelAnimationFrame(frameId);
        };
        this.tick(timestamp);
      };
      window.requestAnimationFrame(animate);
      this.realSession = null;
    }

    const xrfb = this.realSession ? this.realSession.renderState.baseLayer.framebuffer : null;
    this.setXrFramebuffer(xrfb);
  }
  setXrFramebuffer(xrfb) {
    this.fakeSession.xrFramebuffer = xrfb;
    for (let i = 0; i < this.packages.length; i++) {
      this.packages[i].setXrFramebuffer(xrfb);
    }
  }
  tick(timestamp = performance.now(), frame = null) {
    this.renderer.clear(true, true, true);

    if (!this.session) {
      this.orbitControls.enabled && this.orbitControls.update();
      this.setCamera(this.camera);
    }

    // emit event
    this.dispatchEvent(new CustomEvent('tick'));

    // update pose
    const {realSession, xrState} = this;
    if (realSession) {
      const pose = frame.getViewerPose(this.referenceSpace);
      if (pose) {
        const inputSources = Array.from(realSession.inputSources);
        const gamepads = navigator.getGamepads();

        const _loadHmd = () => {
          const {views} = pose;

          xrState.poseMatrix.set(pose.transform.matrix);

          xrState.leftViewMatrix.set(views[0].transform.inverse.matrix);
          xrState.leftProjectionMatrix.set(views[0].projectionMatrix);

          xrState.rightViewMatrix.set(views[1].transform.inverse.matrix);
          xrState.rightProjectionMatrix.set(views[1].projectionMatrix);
          
          // console.log('load hmd', frame, pose, views, xrState.leftViewMatrix);

          localMatrix
            .fromArray(xrState.leftViewMatrix)
            .getInverse(localMatrix)
            .decompose(localVector, localQuaternion, localVector2)
          // localVector.toArray(xrState.position);
          // localQuaternion.toArray(xrState.orientation);
        };
        _loadHmd();

        const _loadGamepad = i => {
          const inputSource = inputSources[i];
          if (inputSource) {
            const xrGamepad = xrState.gamepads[inputSource.handedness === 'right' ? 1 : 0];

            let pose, gamepad;
            if ((pose = frame.getPose(inputSource.targetRaySpace, this.referenceSpace)) && (gamepad = inputSource.gamepad || gamepads[i])) {
              const {transform} = pose;
              const {position, orientation, matrix} = transform;
              if (position) { // new WebXR api
                xrGamepad.position[0] = position.x;
                xrGamepad.position[1] = position.y;
                xrGamepad.position[2] = position.z;

                xrGamepad.orientation[0] = orientation.x;
                xrGamepad.orientation[1] = orientation.y;
                xrGamepad.orientation[2] = orientation.z;
                xrGamepad.orientation[3] = orientation.w;
              } else if (matrix) { // old WebXR api
                localMatrix
                  .fromArray(transform.matrix)
                  .decompose(localVector, localQuaternion, localVector2);

                xrGamepad.position[0] = localVector.x;
                xrGamepad.position[1] = localVector.y;
                xrGamepad.position[2] = localVector.z;

                xrGamepad.orientation[0] = localQuaternion.x;
                xrGamepad.orientation[1] = localQuaternion.y;
                xrGamepad.orientation[2] = localQuaternion.z;
                xrGamepad.orientation[3] = localQuaternion.w;
              }
              
              for (let j = 0; j < gamepad.buttons.length; j++) {
                const button = gamepad.buttons[j];
                const xrButton = xrGamepad.buttons[j];
                xrButton.pressed[0] = button.pressed;
                xrButton.touched[0] = button.touched;
                xrButton.value[0] = button.value;
              }
              
              for (let j = 0; j < gamepad.axes.length; j++) {
                xrGamepad.axes[j] = gamepad.axes[j];
              }
              
              xrGamepad.connected[0] = 1;
            } else {
              xrGamepad.connected[0] = 0;
            }
          }
        };
        _loadGamepad(0);
        _loadGamepad(1);
      }
    }

    const _computeDerivedGamepadsData = () => {
      const _deriveGamepadData = gamepad => {
        localQuaternion.fromArray(gamepad.orientation);
        localVector
          .set(0, 0, -1)
          .applyQuaternion(localQuaternion)
          .toArray(gamepad.direction);
        localVector.fromArray(gamepad.position);
        localVector2.set(1, 1, 1);
        localMatrix
          .compose(localVector, localQuaternion, localVector2)
          .toArray(gamepad.transformMatrix);
      };
      for (let i = 0; i < xrState.gamepads.length; i++) {
        _deriveGamepadData(xrState.gamepads[i]);
      }
    };
    _computeDerivedGamepadsData();

    {
      const {rig, camera} = this;
      if (rig) {
        if (this.rigMatrixEnabled) {
          localMatrix.copy(this.rigMatrix)
            .premultiply(localMatrix2.getInverse(this.matrix))
            .decompose(localVector, localQuaternion, localVector2);
        } else {
          const m = localMatrix.fromArray(xrState.leftViewMatrix);
          m.getInverse(m);
          m.premultiply(localMatrix2.getInverse(this.matrix));
          m.decompose(localVector, localQuaternion, localVector2);
        }
        rig.inputs.hmd.position.copy(localVector);
        rig.inputs.hmd.quaternion.copy(localQuaternion);
        if (this.realSession) {
          localMatrix
            .compose(localVector.fromArray(xrState.gamepads[1].position), localQuaternion.fromArray(xrState.gamepads[1].orientation), localVector2.set(1, 1, 1))
            .premultiply(localMatrix2.getInverse(this.matrix))
            .decompose(rig.inputs.leftGamepad.position, rig.inputs.leftGamepad.quaternion, localVector2);
          localMatrix
            .compose(localVector.fromArray(xrState.gamepads[0].position), localQuaternion.fromArray(xrState.gamepads[0].orientation), localVector2.set(1, 1, 1))
            .premultiply(localMatrix2.getInverse(this.matrix))
            .decompose(rig.inputs.rightGamepad.position, rig.inputs.rightGamepad.quaternion, localVector2);
        } else {
          rig.inputs.leftGamepad.position.copy(localVector).add(localVector2.copy(leftHandOffset).applyQuaternion(localQuaternion));
          rig.inputs.leftGamepad.quaternion.copy(localQuaternion);
          rig.inputs.rightGamepad.position.copy(localVector).add(localVector2.copy(rightHandOffset).applyQuaternion(localQuaternion));
          rig.inputs.rightGamepad.quaternion.copy(localQuaternion);
        }

        HANDS.forEach(handedness => {
          const grabuse = this.grabuses[handedness];
          if (grabuse) {
            const {startTime, endTime} = grabuse;
            const input = rig.inputs[_oppositeHand(handedness) + 'Gamepad'];
            const now = Date.now();
            if (now < endTime) {
              const f = Math.min(Math.max((now - startTime) / (endTime - startTime), 0), 1);
              input.position.add(
                localVector.set(0, Math.sin(f * Math.PI * 2) * 0.2, (-1 + Math.cos(f * Math.PI * 2)) * 0.2)
                  .applyQuaternion(input.quaternion)
              );
              input.quaternion.multiply(
                localQuaternion.set(0, 0, 0, 1).slerp(localQuaternion2.setFromAxisAngle(localVector.set(1, 0, 0), -Math.PI*0.5), Math.sin(f * Math.PI))
              );
            } else {
              this.grabuses[handedness] = null;
            }
          }
          const grab = this.grabs[handedness];
          if (grab) {
            const input = rig.inputs[_oppositeHand(handedness) + 'Gamepad'];
            grab.setMatrix(localMatrix.compose(input.position, input.quaternion, input.scale));
          }
        });
        SLOTS.forEach(slot => {
          const equip = this.equips[slot];
          if (equip) {
            const input = _getSlotInput(rig, slot);
            equip.setMatrix(localMatrix.compose(input.position, input.quaternion, input.scale));
          }
        });

        rig.update();
      }
    }

    // update matrices
    for (let i = 0; i < this.packages.length; i++) {
      this.packages[i].updateMatrixWorld();
    }

    for (let i = 0; i < this.packages.length; i++) {
      const p = this.packages[i];
      if (p.context.iframe && p.context.iframe.contentWindow && p.context.iframe.contentWindow.xrpackage && p.context.iframe.contentWindow.xrpackage.session && p.context.iframe.contentWindow.xrpackage.session.renderState.baseLayer) {
        p.context.iframe.contentWindow.xrpackage.session.renderState.baseLayer.context._exokitClearEnabled(false);
      }
      if (p.context.worker) {
        p.context.worker.postMessage({
          method: 'tick',
        });
      }
    }

    // tick rafs
    const _tickRafs = () => {
      const rafs = this.rafs.slice();
      this.rafs.length = 0;
      const timestamp = performance.now();
      for (let i = 0; i < rafs.length; i++) {
        const raf = rafs[i];
        const rafWindow = raf[symbols.windowSymbol];
        const rafPackage = this.packages.find(p => p.context.iframe && p.context.iframe.contentWindow === rafWindow);
        if (!rafPackage || rafPackage.visible) {
          raf(timestamp);
        } else {
          this.rafs.push(raf);
        }
      }
    };
    _tickRafs();

    this.renderer.render(this.scene, this.camera);
  }
  packageRequestAnimationFrame(fn, win) {
    this.rafs.push(fn);

    const id = ++this.ids;
    fn[symbols.rafCbsSymbol] = id;
    fn[symbols.windowSymbol] = win;
    return id;
  }
  packageCancelAnimationFrame(id) {
    const index = this.rafs.findIndex(fn => fn[symbols.rafCbsSymbol].id === id);
    if (index !== -1) {
      this.rafs.splice(index, 1);
    }
  }
  packageRequestPresent(p) {
    p.context.requestPresentPromise.resolve();
  }
  setCamera(camera) {
    camera.matrixWorld.toArray(this.xrState.poseMatrix);

    camera.matrixWorldInverse.toArray(this.xrState.leftViewMatrix);
    camera.projectionMatrix.toArray(this.xrState.leftProjectionMatrix);

    this.xrState.rightViewMatrix.set(this.xrState.leftViewMatrix);
    this.xrState.rightProjectionMatrix.set(this.xrState.leftProjectionMatrix);
  }
  setRigMatrix(rigMatrix) {
    if (rigMatrix) {
      this.rigMatrix.copy(rigMatrix);
      this.rigMatrixEnabled = true;
    } else {
      this.rigMatrixEnabled = false;
    }
  }
  setGamepadsConnected(connected) {
    for (let i = 0; i < this.xrState.gamepads.length; i++) {
      this.xrState.gamepads[i].connected[0] = connected ? 1 : 0;
    }
  }
  grabdown(handedness) {
    if (this.rig && !this.grabs[handedness]) {
      const input = this.rig.inputs[_oppositeHand(handedness) + 'Gamepad'];
      const inputPosition = localVector
        .copy(input.position)
        // .applyMatrix4(localMatrix.getInverse(this.matrix));
      const ps = this.packages
        .sort((a, b) => {
          a.matrix.decompose(localVector2, localQuaternion, localVector4);
          b.matrix.decompose(localVector3, localQuaternion, localVector4);
          return localVector2.distanceTo(inputPosition) - localVector3.distanceTo(inputPosition);
        });
      if (ps.length > 0) {
        const p = ps[0];
        p.matrix.decompose(localVector2, localQuaternion, localVector4);
        if (localVector2.distanceTo(inputPosition) < 1.5) {
          this.grabs[handedness] = p;
        }
      }
    }
  }
  grabup(handedness) {
    this.grabs[handedness] = null;
  }
  grabuse(handedness) {
    const now = Date.now();
    this.grabuses[handedness] = {
      startTime: now,
      endTime: now + 200,
    };
  }
  grabtriggerdown(handedness) {
    const index = handedness === 'right' ? 1 : 0;
    const xrGamepad = this.xrState.gamepads[index];
    const button = xrGamepad.buttons[0];
    button.touched[0] = 1;
    button.pressed[0] = 1;
    button.value[0] = 1;
  }
  grabtriggerup(handedness) {
    const index = handedness === 'right' ? 1 : 0;
    const xrGamepad = this.xrState.gamepads[index];
    const button = xrGamepad.buttons[0];
    button.touched[0] = 0;
    button.pressed[0] = 0;
    button.value[0] = 0;
  }
  equip(slot) {
    if (this.rig) {
      if (this.equips[slot]) {
        this.equips[slot] = null;
      } else {
        const input = _getSlotInput(this.rig, slot);
        const inputPosition = localVector
          .copy(input.position)
          // .applyMatrix4(localMatrix.getInverse(this.matrix));
        const ps = this.packages
          .sort((a, b) => {
            a.matrix.decompose(localVector2, localQuaternion, localVector4);
            b.matrix.decompose(localVector3, localQuaternion, localVector4);
            return localVector2.distanceTo(inputPosition) - localVector3.distanceTo(inputPosition);
          });
        if (ps.length > 0) {
          const p = ps[0];
          p.matrix.decompose(localVector2, localQuaternion, localVector4);
          if (localVector2.distanceTo(inputPosition) < 1.5) {
            this.equips[slot] = p;
          }
        }
      }
    }
  }
  async wearAvatar(p) {
    await p.waitForLoad();

    if (this.rig) {
      this.container.remove(this.rig.model);
      this.rig.destroy();
      this.rig = null;
    }

    const {model} = p.context;
    if (model) {
      model.scene.traverse(o => {
        o.frustumCulled = false;
      });
      this.rig = new Avatar(model, {
        fingers: true,
        hair: true,
        visemes: true,
        decapitate: true,
        microphoneMediaStream: null,
        // debug: !newModel,
      });
      this.container.add(this.rig.model);

      this.avatar = p;
    }

    this.dispatchEvent(new MessageEvent('avatarchange', {
      data: this.avatar,
    }));
  }
  defaultAvatar() {
    if (this.rig) {
      this.container.remove(this.rig.model);
      this.rig.destroy();
      this.rig = null;
    }

    this.rig = new Avatar(null, {
      fingers: true,
      hair: true,
      visemes: true,
      debug: true,
    });
    this.container.add(this.rig.model);

    this.avatar = null;

    this.dispatchEvent(new MessageEvent('avatarchange', {
      data: this.avatar,
    }));
  }
  reset() {
    const ps = this.packages.slice();
    for (let i = 0; i < ps.length; i++) {
      this.remove(ps[i]);
    }
  }
  async importScene(uint8Array) {
    const p = new XRPackage(uint8Array);
    await p.waitForLoad();
    if (p.type === 'xrpackage-scene@0.0.1') {
      this.reset();

      const j = p.context.json;
      const {xrpackage_scene: xrPackageScene} = j;
      const {children} = xrPackageScene;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const {id, hash, matrix} = child;
        if (hash) {
          const p = await XRPackage.download(hash);
          p.id = id;
          p.setMatrix(localMatrix.fromArray(matrix));
          console.log('load matrix 1', matrix);
          this.add(p);
        } else {
          const idUrl = primaryUrl + '/' + id + '.wbn';
          const file = p.files.find(f => f.url === idUrl);
          if (file) {
            const p = new XRPackage(file.response.body);
            p.id = id;
            p.setMatrix(localMatrix.fromArray(matrix));
            this.add(p);
          } else {
            console.warn('unknown file id', id);
          }
        }
      }
    } else {
      throw new Error('invalid type: ' + p.type);
    }
  }
  async exportScene() {
    const manifestJsonPath = primaryUrl + '/manifest.json';
    const builder = new wbn.BundleBuilder(manifestJsonPath);
    const manifestJson = {
      name: this.name,
      description: 'XRPackage scene exported with the browser frontend.',
      xr_type: 'xrpackage-scene@0.0.1',
      start_url: 'manifest.json',
      xrpackage_scene: {
        children: this.packages.map(p => {
          return {
            id: p.id,
            // hash: p.hash,
            matrix: p.matrix.toArray(),
          };
        }),
      },
    };
    builder.addExchange(manifestJsonPath, 200, {
      'Content-Type': 'application/json',
    }, JSON.stringify(manifestJson, null, 2));
    for (let i = 0; i < this.packages.length; i++) {
      const p = this.packages[i];
      builder.addExchange(primaryUrl + '/' + p.id + '.wbn', 200, {
        'Content-Type': 'application/json',
      }, p.data);
    }
    return builder.createBundle();
  }
  async uploadScene() {
    const manifestJsonPath = primaryUrl + '/manifest.json';
    const builder = new wbn.BundleBuilder(manifestJsonPath);
    const hashes = await Promise.all(this.packages.map(p => p.upload()));
    const manifestJson = {
      name: 'XRPackage Scene',
      description: 'XRPackage scene exported with the browser frontend.',
      xr_type: 'xrpackage-scene@0.0.1',
      start_url: 'manifest.json',
      xrpackage_scene: {
        children: this.packages.map((p, i) => {
          return {
            id: p.id,
            hash: hashes[i],
            matrix: p.matrix.toArray(),
          };
        }),
      },
    };
    console.log('upload scene', manifestJson);
    builder.addExchange(manifestJsonPath, 200, {
      'Content-Type': 'application/json',
    }, JSON.stringify(manifestJson, null, 2));
    const uint8Array = builder.createBundle();

    const res = await fetch(`${apiHost}/`, {
      method: 'PUT',
      body: uint8Array,
    });
    if (res.ok) {
      const j = await res.json();
      const {hash} = j;
      return hash;
    } else {
      throw new Error('upload failed: ' + res.status);
    }
  }
  async downloadScene(hash) {
    const res = await fetch(`${apiHost}/${hash}.wbn`);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await this.importScene(uint8Array);
    } else {
      if (res.status === 404) {
        return null;
      } else {
        throw new Error('download failed: ' + res.status);
      }
    }
  }
}

let packageIds = 0;
export class XRPackage extends EventTarget {
  constructor(a) {
    super();

    this.id = ++packageIds;
    this.name = '';
    this.type = '';
    this.main = '';
    this.schema = {};
    this.details = {};

    this.matrix = a instanceof XRPackage ? a.matrix.clone() : new THREE.Matrix4();
    this.matrixWorldNeedsUpdate = true;
    this._visible = true;
    this.parent = null;
    this.context = {};
    this.loaded = false;

    if (a instanceof XRPackage) {
      this.data = a.data;
      this.files = a.files.slice();
    } else {
      this.data = a;

      const bundle = new wbn.Bundle(a);
      const files = [];
      for (const url of bundle.urls) {
        const response = bundle.getResponse(url);
        files.push({
          url,
          response,
        });
      }
      this.files = files;
    }

    this.load();
  }
  load() {
    const j = this.getManifestJson();
    if (j) {
      if (j && typeof j.xr_type === 'string' && typeof j.start_url === 'string') {
        let {
          name,
          xr_type: xrType,
          start_url: startUrl,
          xr_details: xrDetails,
        } = j;
        if (xrDetails === undefined || (typeof xrDetails === 'object' && !Array.isArray(xrDetails))) {
          xrDetails = xrDetails || {};
        } else {
          throw new Error('invalid xr_details in manifest.json');
        }
        let schema;
        if (xrDetails.schema !== undefined && typeof xrDetails.schema === 'object' && !Array.isArray(xrDetails.schema) && Object.keys(xrDetails.schema).every(k => {
          const spec = xrDetails.schema[k];
          return spec && spec.type === 'string' && (spec.default === undefined || typeof spec.default === 'string');
        })) {
          schema = {};
          for (const k in xrDetails.schema) {
            schema[k] = xrDetails.schema[k].default || '';
          }
        } else {
          schema = {};
        }
        let events;
        if (xrDetails.events !== undefined && typeof xrDetails.events === 'object' && !Array.isArray(xrDetails.events) && Object.keys(xrDetails.events).every(k => {
          const spec = xrDetails.events[k];
          return spec && spec.type === 'string';
        })) {
          events = Object.keys(xrDetails.events).map(name => {
            const spec = xrDetails.events[name];
            const {type} = spec;
            return {
              name,
              type,
            };
          });
        } else {
          events = [];
        }

        const loader = xrTypeLoaders[xrType];
        if (loader) {
          this.name = name;
          this.type = xrType;
          this.main = startUrl;
          this.schema = schema;
          this.events = events;
          this.details = xrDetails;

          swLoadPromise
            .then(() => requestSw({
              method: 'hijack',
              id: this.id,
              startUrl: _removeUrlTail(startUrl),
              script: xrDetails ? xrDetails.script : null,
              files: this.files.map(f => ({
                pathname: new URL(f.url).pathname,
                headers: f.response.headers,
                body: f.response.body,
              })),
            }))
            .then(() => loader(this))
            .then(o => {
              this.loaded = true;
              this.dispatchEvent(new MessageEvent('load', {
                data: {
                  type: this.type,
                  object: o,
                },
              }));
            });
        } else {
          throw new Error(`unknown xr_type: ${xrType}`);
        }
      } else {
        throw new Error('could not find xr_type and start_url in manifest.json');
      }
    } else {
      throw new Error('no manifest.json in pack');
    }
  }
  clone() {
    return new XRPackage(this);
  }
  async waitForLoad() {
    if (!this.loaded) {
      await new Promise((accept, reject) => {
        this.addEventListener('load', e => {
          accept();
        }, {once: true});
      });
    }
  }
  get visible() {
    return this._visible;
  }
  set visible(visible) {
    this._visible = visible;

    const o = this.context.object;
    if (o) {
      o.visible = visible;
    }
  }
  setSchema(key, value) {
    this.schema[key] = value;
    this.context.iframe && this.context.iframe.contentWindow.xrpackage.setSchema(key, value);
  }
  sendEvent(name, value) {
    if (this.events.some(e => e.name === name)) {
      this.context.iframe && this.context.iframe.contentWindow.xrpackage.sendEvent(name, value);
    }
  }
  async reload() {
    const {parent} = this;
    if (parent) {
      parent.remove(this);
      await parent.add(this);
    }
  }
  getManifestJson() {
    const manifestJsonFile = this.files.find(file => new URL(file.url).pathname === '/manifest.json');
    if (manifestJsonFile) {
      const s = manifestJsonFile.response.body.toString('utf8');
      const j = JSON.parse(s);
      return j;
    } else {
      return null;
    }
  }
  getMainData() {
    const mainPath = '/' + this.main;
    const mainFile = this.files.find(file => new URL(file.url).pathname === mainPath);
    return mainFile.response.body;
  }
  addFile(pathname, data = '', type = 'application/octet-stream') {
    let bundle = new wbn.Bundle(this.data);
    const builder = _cloneBundle(bundle, {
      except: ['/' + pathname],
    });
    builder.addExchange(primaryUrl + '/' + pathname, 200, {
      'Content-Type': type,
    }, data);
    this.data = builder.createBundle();
    bundle = new wbn.Bundle(this.data);

    const files = [];
    for (const url of bundle.urls) {
      const response = bundle.getResponse(url);
      files.push({
        url,
        response,
      });
    }
    this.files = files;
  }
  removeFile(pathname) {
    let bundle = new wbn.Bundle(this.data);
    const builder = _cloneBundle(bundle, {
      except: ['/' + pathname],
    });
    this.data = builder.createBundle();
    bundle = new wbn.Bundle(this.data);

    const files = [];
    for (const url of bundle.urls) {
      const response = bundle.getResponse(url);
      files.push({
        url,
        response,
      });
    }
    this.files = files;
  }
  static async compileFromFile(file) {
    const _createFile = async (file, xrType, mimeType) => {
      const fileData = await new Promise((accept, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          accept(new Uint8Array(reader.result));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
      return this.compileRaw(
        [
          {
            url: '/' + file.name,
            type: mimeType,
            data: fileData,
          },
          {
            url: '/manifest.json',
            type: 'application/json',
            data: JSON.stringify({
              xr_type: xrType,
              start_url: file.name,
            }, null, 2),
          }
        ]
      );
    };

    if (/\.gltf$/.test(file.name)) {
      return await _createFile(file, 'gltf@0.0.1', 'model/gltf+json');
    } else if (/\.glb$/.test(file.name)) {
      return await _createFile(file, 'gltf@0.0.1', 'application/octet-stream')
    } else if (/\.vrm$/.test(file.name)) {
      return await _createFile(file, 'vrm@0.0.1', 'application/octet-stream');
    } else if (/\.html$/.test(file.name)) {
      return await _createFile(file, 'webxr-site@0.0.1', 'text/html');
    } else if (/\.wbn$/.test(file.name)) {
      const arrayBuffer = await new Promise((accept, reject) => {
        const fr = new FileReader();
        fr.readAsArrayBuffer(file);
        fr.onload = () => {
          accept(fr.result);
        };
        fr.onerror = reject;
      });
      const uint8Array = new Uint8Array(arrayBuffer);
      return uint8Array;
    } else {
      throw new Error(`unknown file type: ${file.type}`);
    }
  }
  static compileRaw(files) {
    const manifestFile = files.find(file => file.url === '/manifest.json');
    const j = JSON.parse(manifestFile.data);
    const {start_url: startUrl} = j;

    // const manifestUrl = primaryUrl + '/manifest.json';
    const builder = new wbn.BundleBuilder(primaryUrl + '/' + startUrl);
      // .setManifestURL(manifestUrl);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const {url, type, data} = file;
      builder.addExchange(primaryUrl + url, 200, {
        'Content-Type': type,
      }, data);
    }
    return builder.createBundle();
  }
  async getScreenshotImage() {
    const j = this.getManifestJson();
    if (j) {
      const {icons = []} = j;
      const previewIcon = icons.find(icon => icon.type === 'image/png' || icon.type === 'image/jpeg' || icon.type === 'image/gif');
      if (previewIcon) {
        const previewIconFile = this.files.find(file => new URL(file.url).pathname === '/' + previewIcon.src);
        if (previewIconFile) {
          const d = previewIconFile.response.body;
          const b = new Blob([d], {
            type: previewIcon.type,
          });
          const u = URL.createObjectURL(b);
          const img = await new Promise((accept, reject) => {
            const img = new Image();
            img.src = u;
            img.onload = () => {
              accept(img);
            };
            img.onerror = reject;
          });
          URL.revokeObjectURL(u);
          return img;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  async getVolumeMesh() {
    const j = this.getManifestJson();
    if (j) {
      const {icons = []} = j;
      const previewIcon = icons.find(icon => icon.type === 'model/gltf-binary+preview');
      if (previewIcon) {
        const previewIconFile = this.files.find(file => new URL(file.url).pathname === '/' + previewIcon.src);
        if (previewIconFile) {
          const d = previewIconFile.response.body;
          const b = new Blob([d], {
            type: previewIcon.type,
          });
          const u = URL.createObjectURL(b);
          const {scene} = await new Promise((accept, reject) => {
            new GLTFLoader().load(u, accept, function onProgress() {}, reject);
          });
          URL.revokeObjectURL(u);
          return scene;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  async getModel() {
    const j = this.getManifestJson();
    if (j) {
      const {start_url: startUrl, icons = []} = j;

      const _loadGltfFileScene = async file => {
        const d = file.response.body;
        const b = new Blob([d], {
          type: 'application/octet-stream',
        });
        const u = URL.createObjectURL(b);
        const {scene} = await new Promise((accept, reject) => {
          new GLTFLoader().load(u, accept, function onProgress() {}, reject);
        });
        URL.revokeObjectURL(u);
        return scene;
      };
      const _loadVoxFileScene = async file => {
        const d = file.response.body;
        const b = new Blob([d], {
          type: 'application/octet-stream',
        });
        const u = URL.createObjectURL(b);
        const o = await new Promise((accept, reject) => {
          new VOXLoader().load(u, accept, function onProgress() {}, reject);
        });
        URL.revokeObjectURL(u);
        return o;
      };

      const previewIcon = icons.find(icon => icon.type === 'model/gltf-binary');
      if (previewIcon) {
        const previewIconFile = this.files.find(file => new URL(file.url).pathname === '/' + previewIcon.src);
        if (previewIconFile) {
          return await _loadGltfFileScene(previewIconFile);
        } else {
          return null;
        }
      } else {
        const mainModelFile = this.files.find(file => new URL(file.url).pathname === '/' + startUrl);
        if (mainModelFile) {
          if (this.type === 'gltf@0.0.1' || this.type === 'vrm@0.0.1') {
            return await _loadGltfFileScene(mainModelFile);
          } else if (this.type === 'vox@0.0.1') {
            return await _loadVoxFileScene(mainModelFile);
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
    } else {
      return null;
    }
  }
  getAabb() {
    const j = this.getManifestJson();
    if (j && typeof j.xr_details == 'object' && Array.isArray(j.xr_details.aabb)) {
      const box = new THREE.Box3();
      box.min.fromArray(j.xr_details.aabb[0]);
      box.max.fromArray(j.xr_details.aabb[1]);
      return box;
    } else {
      return null;
    }
  }
  setMatrix(m) {
    this.matrix.copy(m);
    this.matrixWorldNeedsUpdate = true;
    this.dispatchEvent(new MessageEvent('matrixupdate', {
      data: this.matrix,
    }));
  }
  updateMatrixWorld() {
    if (this.matrixWorldNeedsUpdate) {
      this.matrixWorldNeedsUpdate = false;

      localMatrix
        .copy(this.parent.matrix)
        .premultiply(this.matrix);

      this.context.object &&
        this.context.object.matrix
          .copy(this.matrix)
          .decompose(this.context.object.position, this.context.object.quaternion, this.context.object.scale);
      this.context.iframe && this.context.iframe.contentWindow.xrpackage.setMatrix(localMatrix.toArray(localArray));
    }
  }
  grabrelease() {
    if (this.parent) {
      for (const k in this.parent.grabs) {
        if (this.parent.grabs[k] === this) {
          this.parent.grabs[k] = null;
        }
      }
      for (const k in this.parent.equips) {
        if (this.parent.equips[k] === this) {
          this.parent.equips[k] = null;
        }
      }
    }
  }
  setPose(pose) {
    const [head, leftGamepad, rightGamepad] = pose;
    if (!this.context.rig) {
      const {model} = this.context;
      if (model) {
        model.scene.traverse(o => {
          o.frustumCulled = false;
        });
        this.context.rig = new Avatar(model, {
          fingers: true,
          hair: true,
          visemes: true,
          decapitate: true,
          microphoneMediaStream: null,
          // debug: !newModel,
        });
      } else {
        this.context.rig = new Avatar(null, {
          fingers: true,
          hair: true,
          visemes: true,
          decapitate: true,
          microphoneMediaStream: null,
          // debug: !newModel,
        });
      }
    }
    rig.inputs.hmd.position.fromArray(head[0]);
    rig.inputs.hmd.quaternion.fromArray(head[1]);
    rig.inputs.leftGamepad.position.fromArray(leftGamepad[0]);
    rig.inputs.leftGamepad.quaternion.fromArray(leftGamepad[1]);
    rig.inputs.rightGamepad.position.fromArray(rightGamepad[0]);
    rig.inputs.rightGamepad.quaternion.fromArray(rightGamepad[1]);
  }
  setXrFramebuffer(xrfb) {
    this.context.iframe && this.context.iframe.contentWindow.xrpackage.setXrFramebuffer(xrfb);
  }
  async export() {
    return this.data.slice();
  }
  async upload() {
    const res = await fetch(`${apiHost}/`, {
      method: 'PUT',
      body: this.data,
    });
    if (res.ok) {
      const j = await res.json();
      const {hash} = j;
      return hash;
    } else {
      throw new Error('upload failed: ' + res.status);
    }
  }
  static async download(hash) {
    const res = await fetch(`${apiHost}/${hash}.wbn`);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      return new XRPackage(uint8Array);
    } else {
      if (res.status === 404) {
        return null;
      } else {
        throw new Error('download failed: ' + res.status);
      }
    }
  }
}

window.OldXR = {
  XR: window.XR,
  XRSession: window.XRSession,
  XRRenderState: window.XRRenderState,
  XRWebGLLayer: window.XRWebGLLayer,
  XRFrame: window.XRFrame,
  XRView: window.XRView,
  XRViewport: window.XRViewport,
  XRPose: window.XRPose,
  XRViewerPose: window.XRViewerPose,
  XRInputSource: window.XRInputSource,
  // XRRay,
  // XRInputPose,
  XRInputSourceEvent: window.XRInputSourceEvent,
  XRSpace: window.XRSpace,
  XRReferenceSpace: window.XRReferenceSpace,
  XRBoundedReferenceSpace: window.XRBoundedReferenceSpace,
};

window.XR = XR.XR;
window.XRSession = XR.XRSession;
window.XRRenderState = XR.XRRenderState;
window.XRWebGLLayer = XR.XRWebGLLayer;
window.XRFrame = XR.XRFrame;
window.XRView = XR.XRView;
window.XRViewport = XR.XRViewport;
window.XRPose = XR.XRPose;
window.XRViewerPose = XR.XRViewerPose;
window.XRInputSource = XR.XRInputSource;
window.XRRay = XR.XRRay;
// window.XRInputPose = XR.XRInputPose;
window.XRInputSourceEvent = XR.XRInputSourceEvent;
window.XRSpace = XR.XRSpace;
window.XRReferenceSpace = XR.XRReferenceSpace;
window.XRBoundedReferenceSpace = XR.XRBoundedReferenceSpace;