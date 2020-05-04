import * as THREE from './xrpackage/three.module.js';
import * as XR from './xrpackage/XR.js';
import symbols from './xrpackage/symbols.js';
import {getContext, CanvasRenderingContext2D, WebGLRenderingContext, WebGL2RenderingContext} from './xrpackage/Graphics.js';
import GlobalContext from './xrpackage/GlobalContext.js';
import wbn from './xrpackage/wbn.js';
import {GLTFLoader} from './xrpackage/GLTFLoader.js';
import {VOXLoader} from './xrpackage/VOXLoader.js';
import Avatar from './xrpackage/avatars/avatars.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();

let hidden = false;
window.addEventListener('keydown', e => {
  if (e.which === 79) {
    hidden = !hidden;
  }
});
let oldRafs = [];

const xrState = (() => {
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
  result.renderWidth[0] = window.innerWidth / 2 * window.devicePixelRatio;
  result.renderHeight = _makeTypedArray(Float32Array, 1);
  result.renderHeight[0] = window.innerHeight * window.devicePixelRatio;
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
  result.position = _makeTypedArray(Float32Array, 3);
  result.orientation = _makeTypedArray(Float32Array, 4);
  result.orientation[3] = 1;
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
  result.offsetEpoch = _makeTypedArray(Uint32Array, 1);
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
  // result.id = _makeTypedArray(Uint32Array, 1);
  // result.hmdType = _makeTypedArray(Uint32Array, 1);
  // result.tex = _makeTypedArray(Uint32Array, 1);
  // result.depthTex = _makeTypedArray(Uint32Array, 1);
  // result.msTex = _makeTypedArray(Uint32Array, 1);
  // result.msDepthTex = _makeTypedArray(Uint32Array, 1);
  // result.aaEnabled = _makeTypedArray(Uint32Array, 1);
  // result.fakeVrDisplayEnabled = _makeTypedArray(Uint32Array, 1);
  // result.blobId = _makeTypedArray(Uint32Array, 1);

  return result;
})();
GlobalContext.xrState = xrState;
const xrOffsetMatrix = new THREE.Matrix4();
GlobalContext.getXrOffsetMatrix = () => xrOffsetMatrix;
GlobalContext.xrFramebuffer = null;

const xrTypeLoaders = {
  'webxr-site@0.0.1': async function(p) {
    const iframe = document.createElement('iframe');
    iframe.src = `iframe.html#id=${p.id}`;
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    await new Promise((accept, reject) => {
      iframe.addEventListener('load', accept);
      iframe.addEventListener('error', reject);
    });
    p.context.iframe = iframe;
  },
  'gltf@0.0.1': async function(p) {
    const mainPath = '/' + p.main;
    const indexFile = p.files.find(file => new URL(file.url).pathname === mainPath);
    const indexBlob = new Blob([indexFile.response.body]);
    const u = URL.createObjectURL(indexBlob);
    const {scene} = await new Promise((accept, reject) => {
      const loader = new GLTFLoader();
      loader.load(u, accept, function onProgress() {}, reject);
    });
    URL.revokeObjectURL(u);

    p.context.object = scene;
  },
  'vrm@0.0.1': async function(p) {
    const mainPath = '/' + p.main;
    const indexFile = p.files.find(file => new URL(file.url).pathname === mainPath);
    const indexBlob = new Blob([indexFile.response.body]);
    // console.log('load blob!');
    /* const indexBlob = await fetch(`https://raw.githubusercontent.com/exokitxr/avatar-models/master/model17.vrm`)
      .then(res => res.blob()); */
    const u = URL.createObjectURL(indexBlob);
    const o = await new Promise((accept, reject) => {
      const loader = new GLTFLoader();
      loader.load(u, accept, function onProgress() {}, reject);
    });
    URL.revokeObjectURL(u);

    p.context.object = o.scene;
    p.context.model = o;
    o.scene.traverse(o => {
      o.frustumCulled = false;
    });
  },
  'vox@0.0.1': async function(p) {
    const mainPath = '/' + p.main;
    const indexFile = p.files.find(file => new URL(file.url).pathname === mainPath);
    const indexBlob = new Blob([indexFile.response.body]);
    const u = URL.createObjectURL(indexBlob);
    const o = await new Promise((accept, reject) => {
      const loader = new VOXLoader();
      loader.load(u, accept, function onProgress() {}, reject);
    });
    URL.revokeObjectURL(u);

    p.context.object = o;
  },
};
const xrTypeAdders = {
  'webxr-site@0.0.1': async function(p) {
    const mainPath = '/' + p.main;
    const indexFile = p.files.find(file => new URL(file.url).pathname === mainPath);
    const indexHtml = indexFile.response.body.toString('utf-8');
    await p.context.iframe.contentWindow.xrpackage.iframeInit({
      engine: this,
      indexHtml,
      context: GlobalContext.proxyContext,
      xrState,
    });

    this.packages.push(p);
  },
  'gltf@0.0.1': async function(p) {
    this.scene.add(p.context.object);

    this.packages.push(p);
  },
  'vrm@0.0.1': async function(p) {
    this.scene.add(p.context.object);

    this.packages.push(p);
  },
  'vox@0.0.1': async function(p) {
    this.scene.add(p.context.object);

    this.packages.push(p);
  },
};

let tp = false;
window.addEventListener('keydown', e => {
  if (e.which === 80) {
    tp = !tp;
  }
  // console.log('got key', e.which);
});

export class XRPackageEngine extends EventTarget {
  constructor() {
    super();

    /* const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      xrCompatible: true,
    }); */

    const canvas = document.createElement('canvas');
    this.domElement = canvas;
    // this.context = GlobalContext.proxyContext;

    GlobalContext.proxyContext = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
    });
    GlobalContext.contexts = [];

    const context = this.getContext('webgl2');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      // preserveDrawingBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // renderer.setClearAlpha(0);
    renderer.autoClear = false;
    // renderer.sortObjects = false;
    renderer.physicallyCorrectLights = true;
    renderer.xr.enabled = true;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 1);
    this.camera = camera;

    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    scene.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 3);
    scene.add(directionalLight2);

    /* const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      // preserveDrawingBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.autoClear = false;
    renderer.sortObjects = false;
    renderer.physicallyCorrectLights = true;
    renderer.xr.enabled = true;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 2);
    this.camera = camera;

    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    scene.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 3);
    scene.add(directionalLight2);

    const cubeMesh = (() => {
      const geometry = new THREE.BoxBufferGeometry(0.1, 0.1, 0.1);
      const material = new THREE.MeshStandardMaterial({
        color: 0xFF0000,
      });
      const mesh = new THREE.Mesh(geometry, material);  
      mesh.frustumCulled = false;
      return mesh;
    })();
    cubeMesh.position.set(0, 1.5, 0);
    cubeMesh.rotation.order = 'YXZ';
    scene.add(cubeMesh);
    this.cubeMesh = cubeMesh; */

    this.fakeSession = new XR.XRSession();
    this.fakeSession.onrequestanimationframe = this.requestAnimationFrame.bind(this);
    this.fakeSession.oncancelanimationframe = this.cancelAnimationFrame.bind(this);

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

    renderer.xr.setSession(this.fakeSession);

    this.packages = [];
    this.ids = 0;
    this.rafs = [];
    this.rig = null;
    this.realSession = null;
    this.referenceSpace = null;
    this.loadReferenceSpaceInterval = 0;
    this.cancelFrame = null;
    
    const animate = timestamp => {
      const frameId = window.requestAnimationFrame(animate);
      this.cancelFrame = () => {
        window.cancelAnimationFrame(frameId);
      };
      this.tick(timestamp);
    };
    window.requestAnimationFrame(animate);
  }
  getContext(type, opts) {
    return getContext.call(this.domElement, type, opts);
  }
  async add(p) {
    console.log('add loaded 1', p.loaded);
    if (!p.loaded) {
      await new Promise((accept, reject) => {
        p.addEventListener('load', e => {
          accept();
        }, {once: true});
      });
    }
    console.log('add loaded 2', p.loaded);

    const {type} = p;
    const adder = xrTypeAdders[type];
    console.log('add loaded 3', !!adder);
    if (adder) {
      await adder.call(this, p);
      p.parent = this;
    } else {
      throw new Error(`unknown xr_type: ${type}`);
    }
  }
  async setSession(realSession) {
    if (this.loadReferenceSpaceInterval !== 0) {
      clearInterval(this.loadReferenceSpaceInterval);
      this.loadReferenceSpaceInterval = 0;
    }
    if (realSession) {
      this.cancelFrame();
      this.cancelFrame = null;
      
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

      const baseLayer = new window.OldXR.XRWebGLLayer(realSession, GlobalContext.proxyContext);
      realSession.updateRenderState({baseLayer});

      await new Promise((accept, reject) => {
        realSession.requestAnimationFrame((timestamp, frame) => {
          const pose = frame.getViewerPose(this.referenceSpace);
          const viewport = baseLayer.getViewport(pose.views[0]);
          const width = viewport.width;
          const height = viewport.height;
          const fullWidth = (() => {
            let result = 0;
            for (let i = 0; i < pose.views.length; i++) {
              result += baseLayer.getViewport(pose.views[i]).width;
            }
            return result;
          })();

          GlobalContext.xrState.isPresentingReal[0] = 1;
          GlobalContext.xrState.stereo[0] = 1;
          GlobalContext.xrState.renderWidth[0] = width;
          GlobalContext.xrState.renderHeight[0] = height;
          
          GlobalContext.xrFramebuffer = realSession.renderState.baseLayer.framebuffer;

          const animate = (timestamp, frame) => {
            const frameId = realSession.requestAnimationFrame(animate);
            this.cancelFrame = () => {
              realSession.cancelAnimationFrame(frameId);
            };
            this.tick(timestamp, frame);
          };
          realSession.requestAnimationFrame(animate);

          /* win.canvas.width = fullWidth;
          win.canvas.height = height;

          await win.runAsync({
            method: 'enterXr',
          }); */

          accept();

          console.log('XR setup complete');
        });
        // core.setSession(realSession);
        // core.setReferenceSpace(referenceSpace);
      });
    }
    this.realSession = realSession;
    
    this.packages.forEach(p => {
      p.setSession(realSession);
    });
  }
  tick(timestamp, frame) {
    this.renderer.clear(true, true, true);

    // emit event
    this.dispatchEvent(new CustomEvent('tick'));

    // update pose
    const {realSession} = this;
    if (realSession) {
      // console.log('animate session', realSession, frame, referenceSpace);
      // debugger;
      const pose = frame.getViewerPose(this.referenceSpace);
      if (pose) {
        const inputSources = Array.from(realSession.inputSources);
        const gamepads = navigator.getGamepads();

        const _loadHmd = () => {
          const {views} = pose;

          xrState.leftViewMatrix.set(views[0].transform.inverse.matrix);
          xrState.leftProjectionMatrix.set(views[0].projectionMatrix);

          xrState.rightViewMatrix.set(views[1].transform.inverse.matrix);
          xrState.rightProjectionMatrix.set(views[1].projectionMatrix);
          
          // console.log('load hmd', frame, pose, views, xrState.leftViewMatrix);

          localMatrix
            .fromArray(xrState.leftViewMatrix)
            .getInverse(localMatrix)
            .decompose(localVector, localQuaternion, localVector2)
          localVector.toArray(xrState.position);
          localQuaternion.toArray(xrState.orientation);
        };
        _loadHmd();

        const _loadGamepad = i => {
          const inputSource = inputSources[i];
          const xrGamepad = xrState.gamepads[i];

          let pose, gamepad;
          if (inputSource && (pose = frame.getPose(inputSource.targetRaySpace, referenceSpace)) && (gamepad = inputSource.gamepad || gamepads[i])) {
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
        // console.log('update rig', camera.position.toArray());
        const m = new THREE.Matrix4().fromArray(xrState.leftViewMatrix);
        m.getInverse(m)
        m.decompose(camera.position, camera.quaternion, camera.scale);
        if (tp) {
          camera.position.add(new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion));
          // console.log('got position 2.1', rig.inputs.hmd.position.toArray());
          rig.undecapitate();
        } else {
          rig.decapitate();
        }
        rig.inputs.hmd.position.copy(camera.position);
        rig.inputs.hmd.quaternion.copy(camera.quaternion);
        rig.inputs.leftGamepad.position.copy(camera.position).add(localVector.set(0.3, -0.15, -0.5).applyQuaternion(camera.quaternion));
        rig.inputs.leftGamepad.quaternion.copy(camera.quaternion);
        rig.inputs.rightGamepad.position.copy(camera.position).add(localVector.set(-0.3, -0.15, -0.5).applyQuaternion(camera.quaternion));
        rig.inputs.rightGamepad.quaternion.copy(camera.quaternion);

        rig.update();
      }
    }

    /* for (let i = 0; i < GlobalContext.contexts.length; i++) {
      const context =  GlobalContext.contexts[i];
      context._exokitClearEnabled && context._exokitClearEnabled(true);
      if (context._exokitBlendEnabled) {
        if (highlight) {
          context._exokitBlendEnabled(false);
          context._exokitEnable(context.BLEND);
          context._exokitBlendFuncSeparate(context.CONSTANT_COLOR, context.ONE_MINUS_SRC_ALPHA, context.CONSTANT_COLOR, context.ONE_MINUS_SRC_ALPHA);
          context._exokitBlendEquationSeparate(context.FUNC_ADD, context.FUNC_ADD);
          context._exokitBlendColor(highlight[0], highlight[1], highlight[2], highlight[3]);
        } else {
          context._exokitBlendEnabled(true);
        }
      }
    }
    const layerContext = layered ? vrPresentState.glContext : null;
    if (layerContext) {
      layerContext._exokitClearEnabled(false);
    } */
    for (let i = 0; i < this.packages.length; i++) {
      const p = this.packages[i];
      if (p.context.iframe && p.context.iframe.contentWindow.xrpackage.session.renderState.baseLayer) {
        p.context.iframe.contentWindow.xrpackage.session.renderState.baseLayer.context._exokitClearEnabled(false);
        // console.log('got iframe', p.context.iframe.contentWindow.xrpackage.session.renderState.baseLayer.context.canvas.transferToImageBitmap());
        // debugger;
      }
    }

    // tick rafs
    const _tickRafs = () => {
      let rafs = this.rafs.slice();
      if (!hidden) {
        oldRafs.push.apply(oldRafs, rafs.slice(2));
        rafs = rafs.slice(0, 2);
      } else {
        rafs = rafs.concat(oldRafs);
        oldRafs.length = 0;
      }
      this.rafs.length = 0;
      for (let i = 0; i < rafs.length; i++) {
        rafs[i]();
      }
    };
    _tickRafs();

    // console.log('render context 1');
    this.renderer.render(this.scene, this.camera);
    // console.log('render context 2', GlobalContext.proxyContext.getError());
  }
  requestAnimationFrame(fn) {
    this.rafs.push(fn);

    const id = ++this.ids;
    fn[symbols.rafCbsSymbol] = id;
    return id;
  }
  cancelAnimationFrame(id) {
    const index = this.rafs.findIndex(fn => fn[symbols.rafCbsSymbol].id === id);
    if (index !== -1) {
      this.rafs.splice(index, 1);
    }
  }
  setCamera(camera) {
    camera.matrixWorldInverse.toArray(xrState.leftViewMatrix);
    camera.projectionMatrix.toArray(xrState.leftProjectionMatrix);

    xrState.rightViewMatrix.set(xrState.leftViewMatrix);
    xrState.rightProjectionMatrix.set(xrState.leftProjectionMatrix);
  }
  setLocalAvatar(model) {
    if (this.rig) {
      this.scene.remove(this.rig);
      this.rig.destroy();
      this.rig = null;
    }

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
      this.scene.add(this.rig.model);
    }
  }
}

let packageIds = Date.now();
export class XRPackage extends EventTarget {
  constructor(d) {
    super();

    this.id = ++packageIds;
    this.loaded = false;

    const bundle = new wbn.Bundle(d);
    const files = [];
    for (const url of bundle.urls) {
      const response = bundle.getResponse(url);
      files.push({
        url,
        // status: response.status,
        // headers: response.headers,
        response,
        // body: response.body.toString('utf-8')
      });
    }
    this.files = files;
    
    const manifestJsonFile = files.find(file => new URL(file.url).pathname === '/manifest.json');
    if (manifestJsonFile) {
      const s = manifestJsonFile.response.body.toString('utf-8');
      const j = JSON.parse(s);
      if (j && typeof j.xr_type === 'string' && typeof j.start_url === 'string') {
        const {
          xr_type: xrType,
          start_url: startUrl,
        } = j;
        const loader = xrTypeLoaders[xrType];
        if (loader) {
          this.type = xrType;
          this.main = startUrl;

          loader(this)
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

    this.parent = null;
    this.context = {};
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
    } else {
      throw new Error(`unknown file type: ${file.type}`);
    }
  }
  static compileRaw(files) {
    const manifestFile = files.find(file => file.url === '/manifest.json');
    const j = JSON.parse(manifestFile.data);
    const {start_url: startUrl} = j;

    const primaryUrl = `https://xrpackage.org`;
    // const manifestUrl = primaryUrl + '/manifest.json';
    const builder = (new wbn.BundleBuilder(primaryUrl + '/' + startUrl))
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
  getObject() {
    return this.context.object;
  }
  setMatrix(matrix) {
    this.context.object &&
      this.context.object.matrix
        .copy(matrix)
        .decompose(this.context.object.position, this.context.object.quaternion, this.context.object.scale);
  }
  setSession(session) {
    this.context.iframe && this.context.iframe.contentWindow.rs.setSession(session);
  }
  wearAvatar() {
    console.log('wear ava', this.context.model);
    if (this.context.model) {
      this.parent.setLocalAvatar(this.context.model);
    }
  }
}