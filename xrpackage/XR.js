import * as THREE from './three.module.js';
import symbols from './symbols.js';
import utils from './utils.js';
const {_elementGetter, _elementSetter} = utils;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();

class GamepadButton {
  constructor(_value, _pressed, _touched) {
    this._value = _value;
    this._pressed = _pressed;
    this._touched = _touched;
  }

  get value() {
    return this._value[0];
  }
  set value(value) {
    this._value[0] = value;
  }
  get pressed() {
    return this._pressed[0] !== 0;
  }
  set pressed(pressed) {
    this._pressed[0] = pressed ? 1 : 0;
  }
  get touched() {
    return this._touched[0] !== 0;
  }
  set touched(touched) {
    this._touched[0] = touched ? 1 : 0;
  }
}
class GamepadPose {
  constructor() {
    this.hasPosition = true;
    this.hasOrientation = true;
    this.position = new Float32Array(3);
    this.linearVelocity = new Float32Array(3);
    this.linearAcceleration = new Float32Array(3);
    this.orientation = Float32Array.from([0, 0, 0, 1]);
    this.angularVelocity = new Float32Array(3);
    this.angularAcceleration = new Float32Array(3);
  }
}
class GamepadHapticActuator {
  constructor(index) {
    this.index = index;
  }
  get type() {
    return 'vibration';
  }
  set type(type) {}
  pulse(value, duration) {
    self._postMessageUp({
      method: 'emit',
      type: 'hapticPulse',
      event: {
        index: this.index,
        value,
        duration,
      },
    });
  }
}
class Gamepad {
  constructor(index, id, hand, xrGamepad, hapticActuator) {
    this.index = index;
    this.id = id;
    this.hand = hand;
    this._xrGamepad = xrGamepad;

    this.mapping = 'standard';
    this.buttons = (() => {
      const result = Array(xrGamepad.buttons.length);
      for (let i = 0; i < result.length; i++) {
        const vrButtonIndex = i; // xrToVrButtonMappings[i];
        result[vrButtonIndex] = new GamepadButton(xrGamepad.buttons[i].value, xrGamepad.buttons[i].pressed, xrGamepad.buttons[i].touched);
      }
      return result;
    })();
    this.pose = new GamepadPose();
    this.axes = xrGamepad.axes;
    this.hapticActuators = hapticActuator ? [hapticActuator] : [];
    // this.bones = xrGamepad.bones;
  }

  get connected() {
    return this._xrGamepad.connected[0] !== 0;
  }
  set connected(connected) {
    this._xrGamepad.connected[0] = connected ? 1 : 0;
  }
}

class XR extends EventTarget {
  constructor(/*window*/) {
    super();
    // this._window = window;
    this.init();
  }
  init() {
    this.onrequestpresent = null;

    // needed for JanusWeb
    this.supportsSession = function supportsSession(mode) {
      return this.isSessionSupported(mode);
    };
  }
  isSessionSupported(mode) {
    return Promise.resolve(true);
  }
  /* supportsSessionMode(mode) { // non-standard
    return this.supportsSession(mode);
  } */
  async requestSession(mode, options) {
    if (!this.session) {
      /* const session = this._window[symbols.mrDisplaysSymbol].xrSession;
      session.exclusive = exclusive;
      session.outputContext = outputContext;

      await session.onrequestpresent();
      session.isPresenting = true; */
      
      const {session} = this.onrequestpresent();
      session.addEventListener('end', () => {
        // session.isPresenting = false;
        this.session = null;
      }, {
        once: true,
      });
      this.session = session;
    }
    return this.session;
  }
  /* async requestDevice() {
    return new XRDevice(this);
  } */
  get onvrdevicechange() {
    return _elementGetter(this, 'vrdevicechange');
  }
  set onvrdevicechange(onvrdevicechange) {
    _elementSetter(this, 'vrdevicechange', onvrdevicechange);
  }
};

/* class XRDevice { // non-standard
  constructor(xr) {
    this.xr = xr;
  }

  supportsSession(opts) {
    return this.xr.supportsSession(opts);
  }
  requestSession(opts) {
    return this.xr.requestSession();
  }
} */

class XRSession extends EventTarget {
  constructor(xrState, xrOffsetMatrix) {
    super();

    this.xrState = xrState; // non-standard
    this.xrOffsetMatrix = xrOffsetMatrix; // non-standard
    this.xrFramebuffer = null; // non-standard

    this.environmentBlendMode = 'opaque';
    this.renderState = new XRRenderState(this);
    this.viewerSpace = new XRSpace(this);
    // this.isPresenting = false; // non-standard

    this._frame = new XRFrame(this);
    this._referenceSpace = new XRBoundedReferenceSpace(this);
    this._gamepadInputSources = [
      new XRInputSource('left', 'tracked-pointer', 'gamepad', this),
      new XRInputSource('right', 'tracked-pointer', 'gamepad', this),
    ];
    this._handInputSources = [
      new XRInputSource('left', 'gaze', 'hand', this),
      new XRInputSource('right', 'gaze', 'hand', this),
    ];
    this._lastPresseds = [false, false];
    this._rafs = [];
    this._layers = [];

    // this.onrequestpresent = null;
    // this.onmakeswapchain = null;
    // this.onexitpresent = null;
    this.onrequestanimationframe = null;
    this.oncancelanimationframe = null;
    // this.onlayers = null;
  }
  requestReferenceSpace(type, options = {}) {
    // const {disableStageEmulation = false, stageEmulationHeight  = 0} = options;
    return Promise.resolve(this._referenceSpace);
  }
  /* requestFrameOfReference() { // non-standard
    return this.requestReferenceSpace.apply(this, arguments);
  } */
  get inputSources() {
    const inputSources = [];
    for (let i = 0; i < this._gamepadInputSources.length; i++) {
      const inputSource = this._gamepadInputSources[i];
      inputSource.connected && inputSources.push(inputSource);
    }
    for (let i = 0; i < this._handInputSources.length; i++) {
      const inputSource = this._handInputSources[i];
      inputSource.connected && inputSources.push(inputSource);
    }
    return inputSources;
  }
  requestAnimationFrame(fn) {
    // console.log('request animation frame', window.location.href);
    if (this.onrequestanimationframe) {
      const animationFrame = this.onrequestanimationframe(timestamp => {
        this._rafs.splice(animationFrame, 1);
        fn(timestamp, this._frame);
      }, globalThis);
      this._rafs.push(animationFrame);
      return animationFrame;
    }
  }
  cancelAnimationFrame(animationFrame) {
    if (this.oncancelanimationframe) {
      const result = this.oncancelanimationframe(animationFrame);
      const index = this._rafs.indexOf(animationFrame);
      if (index !== -1) {
        this._rafs.splice(index, 1);
      }
      return result;
    }
  }
  /* requestHitTest(origin, direction, coordinateSystem) {
    return new Promise((accept, reject) => {
      if (this.onrequesthittest)  {
        this.onrequesthittest(origin, direction, coordinateSystem)
          .then(accept)
          .catch(reject);
      } else {
        reject(new Error('api not supported'));
      }
    });
  } */
  updateRenderState(newState) {
    this.renderState.update(newState);
  }
  get baseLayer() { // non-standard
    return this.renderState.baseLayer;
  }
  set baseLayer(baseLayer) {
    this.renderState.update({baseLayer});
  }
  async end() {
    await this.onexitpresent();
    this.dispatchEvent(new CustomEvent('end'));
  }

  get onblur() {
    return _elementGetter(this, 'blur');
  }
  set onblur(onblur) {
    _elementSetter(this, 'blur', onblur);
  }
  get onfocus() {
    return _elementGetter(this, 'focus');
  }
  set onfocus(onfocus) {
    _elementSetter(this, 'focus', onfocus);
  }
  get onresetpose() {
    return _elementGetter(this, 'resetpose');
  }
  set onresetpose(onresetpose) {
    _elementSetter(this, 'resetpose', onresetpose);
  }
  get onend() {
    return _elementGetter(this, 'end');
  }
  set onend(onend) {
    _elementSetter(this, 'end', onend);
  }
  get onselect() {
    return _elementGetter(this, 'select');
  }
  set onselect(onselect) {
    _elementSetter(this, 'select', onselect);
  }
  get onselectstart() {
    return _elementGetter(this, 'selectstart');
  }
  set onselectstart(onselectstart) {
    _elementSetter(this, 'selectstart', onselectstart);
  }
  get onselectend() {
    return _elementGetter(this, 'selectend');
  }
  set onselectend(onselectend) {
    _elementSetter(this, 'selectend', onselectend);
  }
}

class XRRenderState {
  constructor(session) {
    this.session = session;

    this._inlineVerticalFieldOfView = 90;
    this._baseLayer = null;
    this._outputContext = null;
  }

  get depthNear() {
    return this.session.xrState.depthNear[0];
  }
  set depthNear(depthNear) {
    this.session.xrState.depthNear[0] = depthNear;
  }
  get depthFar() {
    return this.session.xrState.depthFar[0];
  }
  set depthFar(depthFar) {
    this.session.xrState.depthFar[0] = depthFar;
  }
  get inlineVerticalFieldOfView() {
    return this._inlineVerticalFieldOfView;
  }
  set inlineVerticalFieldOfView(inlineVerticalFieldOfView) {
    this._inlineVerticalFieldOfView = inlineVerticalFieldOfView;
  }
  get baseLayer() {
    return this._baseLayer;
  }
  set baseLayer(baseLayer) {
    this._baseLayer = baseLayer;
  }
  /* get outputContext() {
    return this._outputContext;
  }
  set outputContext(outputContext) {
    this._outputContext = outputContext;
  } */

  update(newState) {
    for (const k in newState) {
      this[k] = newState[k];
    }
  }
};

class XRWebGLLayer {
  constructor(session, context, options = {}) {
    this.session = session;
    this.context = context;
    
    const {
      antialias = true,
      depth = false,
      stencil = false,
      alpha = true,
      framebufferScaleFactor = 1,
    } = options;
    this.antialias = antialias;
    this.depth = depth;
    this.stencil = stencil;
    this.alpha = alpha;

    // this.session.onmakeswapchain && this.session.onmakeswapchain(context.canvas, context);
    /* const {fbo} = this.session.onmakeswapchain(context);
    
    this.framebuffer = {
      id: fbo,
    }; */
  }
  getViewport(view) {
    return view._viewport;
  }
  requestViewportScaling(viewportScaleFactor) {
    throw new Error('not implemented'); // XXX
  }
  
  get framebuffer() {
    return this.session.xrFramebuffer;
  }
  set framebuffer(framebuffer) {}

  get framebufferWidth() {
    return this.session.xrState.renderWidth[0]*2;
  }
  set framebufferWidth(framebufferWidth) {}
  
  get framebufferHeight() {
    return this.session.xrState.renderHeight[0];
  }
  set framebufferHeight(framebufferHeight) {}
}

const _applyXrOffsetToPose = (pose, xrOffsetMatrix, inverse, premultiply, inverse2) => {
  /* if (!pose._realViewMatrix) {
    debugger;
  } */
  localMatrix.fromArray(pose._realViewMatrix);
  const inverseXrOffsetMatrix = inverse ? localMatrix2.getInverse(xrOffsetMatrix) : xrOffsetMatrix;
  if (premultiply) {
    localMatrix.premultiply(inverseXrOffsetMatrix);
  } else {
    localMatrix.multiply(inverseXrOffsetMatrix);
  }
  localMatrix.toArray(pose._localViewMatrix);
  if (inverse2) {
    localMatrix.getInverse(localMatrix);
  }
  localMatrix.toArray(pose.transform.matrix);
};

class XRFrame {
  constructor(session) {
    this.session = session;

    this._viewerPose = new XRViewerPose(this, session);
  }
  getViewerPose(coordinateSystem) {
    for (let i = 0; i < this._viewerPose.views.length; i++) {
      _applyXrOffsetToPose(this._viewerPose.views[i], this.session.xrOffsetMatrix, false, false, true);
    }

    return this._viewerPose;
  }
  /* getDevicePose() { // non-standard
    return this.getViewerPose.apply(this, arguments);
  } */
  getPose(sourceSpace, destinationSpace) {
    /* if (!sourceSpace._pose || !this.session.xrOffsetMatrix) {
      debugger;
    } */
    _applyXrOffsetToPose(sourceSpace._pose, this.session.xrOffsetMatrix, true, true, false);
    return sourceSpace._pose;
  }
  getJointPose(sourceSpace, destinationSpace) {
    if (sourceSpace._pose._xrHand[sourceSpace._pose._index].visible[0]) {
      _applyXrOffsetToPose(sourceSpace._pose, this.session.xrOffsetMatrix, true, true, false);
      return sourceSpace._pose;
    } else {
      return null;
    }
  }
  /* getInputPose(inputSource, coordinateSystem) { // non-standard
    _applyXrOffsetToPose(inputSource._inputPose, this.session.xrOffsetMatrix, true, true);
    inputSource._inputPose.targetRay.transformMatrix.set(inputSource._inputPose._localViewMatrix);
    inputSource._inputPose.gripTransform.matrix.set(inputSource._inputPose._localViewMatrix);

    return inputSource._inputPose;
  } */
}

class XRView {
  constructor(eye = 'left', session) {
    this.session = session; // non-standard

    this.eye = eye;
    this.transform = new XRRigidTransform(eye, session);
    this.projectionMatrix = eye === 'left' ? session.xrState.leftProjectionMatrix : session.xrState.rightProjectionMatrix;

    this._viewport = new XRViewport(eye, session);
    this._realViewMatrix = this.transform.inverse.matrix;
    this._localViewMatrix = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this.transform.inverse.matrix = this._localViewMatrix;

    // this.viewMatrix = this.transform.inverse.matrix; // non-standard
  }
}

class XRViewport {
  constructor(eye, session) {
    this.session = session; // non-standard

    this.eye = eye;
  }
  get x() {
    if (this.session.xrState.stereo[0]) {
      return this.eye === 'left' ? 0 : this.session.xrState.renderWidth[0];
    } else {
      return this.eye === 'left' ? 0 : this.session.xrState.renderWidth[0] * 2;
    }
  }
  set x(x) {}
  get y() {
    return 0;
  }
  set y(y) {}
  get width() {
    if (this.session.xrState.stereo[0]) {
      return this.session.xrState.renderWidth[0];
    } else {
      if (this.eye === 'left') {
        return this.session.xrState.renderWidth[0] * 2;
      } else {
        return 0;
      }
    }
  }
  set width(width) {}
  get height() {
    return this.session.xrState.renderHeight[0];
  }
  set height(height) {}
}

class XRPose {
  constructor(session) {
    this.session = session; // non-standard

    this.transform = new XRRigidTransform();
    this.emulatedPosition = false;

    this._realViewMatrix = this.transform.inverse.matrix;
    this._localViewMatrix = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this.transform.inverse.matrix = this._localViewMatrix;
    this.transform.matrix = session.xrState.poseMatrix;
  }
}

class XRViewerPose extends XRPose {
  constructor(frame, session) {
    super(session);

    this.frame = frame; // non-standard

    this._views = [
      new XRView('left', session),
      new XRView('right', session),
    ];

    // this.poseModelMatrix = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); // non-standard
  }
  get views() {
    return this._views;
  }
  set views(views) {}
  /* getViewMatrix(view) { // non-standard
    return localMatrix
      .fromArray(view._realViewMatrix)
      .multiply(this.session.xrOffsetMatrix)
      .toArray(view._localViewMatrix);
  } */
}

class XRJointPose extends XRPose {
  constructor(session, xrHand, index) {
    super(session);

    this._xrHand = xrHand;
    this._index = index;
  }
  get radius() {
    return this._xrHand[index].radius[0];
  }
}

class XRJointSpace {
  constructor(session, xrHand, index) {
    this._pose = new XRJointPose(session, xrHand, index);
    this._pose.transform.position._buffer = xrHand[index].position;
    this._pose.transform.orientation._buffer = xrHand[index].orientation;
    this._pose._realViewMatrix = xrHand[index].transformMatrix;
    this._pose._localViewMatrix = this._pose.transform.inverse.matrix;
  }
}
class XRHand {
  constructor(session, xrHand) {
    const joints = Array(25);
    for (let i = 0; i < joints.length; i++) {
      joints[i] = new XRJointSpace(session, xrHand, i);
    }
    for (let i = 0; i < joints.length; i++) {
      Object.defineProperty(this, i, {
        get() {
          return this._xrHand[i].visible[0] ? joints[i] : null;
        },
      });
    }
    this.length = joints.length;
    this._xrHand = xrHand;
  }
  static WRIST = 0;
  static THUMB_METACARPAL = 1;
  static THUMB_PHALANX_PROXIMAL = 2;
  static THUMB_PHALANX_DISTAL = 3;
  static THUMB_PHALANX_TIP = 4;
  static INDEX_METACARPAL = 5;
  static INDEX_PHALANX_PROXIMAL = 6;
  static INDEX_PHALANX_INTERMEDIATE = 7;
  static INDEX_PHALANX_DISTAL = 8;
  static INDEX_PHALANX_TIP = 9;
  static MIDDLE_METACARPAL = 10;
  static MIDDLE_PHALANX_PROXIMAL = 11;
  static MIDDLE_PHALANX_INTERMEDIATE = 12;
  static MIDDLE_PHALANX_DISTAL = 13;
  static MIDDLE_PHALANX_TIP = 14;
  static RING_METACARPAL = 15;
  static RING_PHALANX_PROXIMAL = 16;
  static RING_PHALANX_INTERMEDIATE = 17;
  static RING_PHALANX_DISTAL = 18;
  static RING_PHALANX_TIP = 19;
  static LITTLE_METACARPAL = 20;
  static LITTLE_PHALANX_PROXIMAL = 21;
  static LITTLE_PHALANX_INTERMEDIATE = 22;
  static LITTLE_PHALANX_DISTAL = 23;
  static LITTLE_PHALANX_TIP = 24;
}

class XRInputSource {
  constructor(handedness, targetRayMode, type, session) {
    this.session = session; // non-standard
    this.xrStateGamepad = this.session.xrState.gamepads[handedness === 'right' ? 1 : 0]; // non-standard
    this.xrStateHand = this.session.xrState.hands[handedness === 'right' ? 1 : 0];

    this.handedness = handedness;
    this.targetRayMode = targetRayMode;

    this.targetRaySpace = new XRSpace(session);
    this.targetRaySpace._pose.transform.position._buffer = this.xrStateGamepad.position;
    this.targetRaySpace._pose.transform.orientation._buffer = this.xrStateGamepad.orientation;
    this.targetRaySpace._pose._realViewMatrix = this.xrStateGamepad.transformMatrix;
    this.targetRaySpace._pose._localViewMatrix = this.targetRaySpace._pose.transform.inverse.matrix;

    this.gripSpace = new XRSpace(session);
    this.gripSpace._pose.transform.position._buffer = this.xrStateGamepad.gripPosition;
    this.gripSpace._pose.transform.orientation._buffer = this.xrStateGamepad.gripOrientation;
    this.gripSpace._pose._realViewMatrix = this.xrStateGamepad.gripTransformMatrix;
    this.gripSpace._pose._localViewMatrix = this.gripSpace._pose.transform.inverse.matrix;

    /* this._inputPose = new XRInputPose();
    this._inputPose.targetRay.origin.values = this.xrStateGamepad.position;
    this._inputPose.targetRay.direction.values = this.xrStateGamepad.direction;
    this._inputPose._realViewMatrix = this.xrStateGamepad.transformMatrix;
    this._inputPose._localViewMatrix = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); */
    
    this.gamepad = null;
    this.hand = null;
    this.profiles = ['webxr'];

    this._type = type;
    switch (this._type) {
      case 'gamepad': {
        this.gamepad = new Gamepad(handedness === 'right' ? 1 : 0, 'WebXR Gamepad', handedness, this.xrStateGamepad, false);
        break;
      }
      case 'hand': {
        this.hand = new XRHand(session, this.xrStateHand);
        break;
      }
    }
  }
  get connected() {
    switch (this._type) {
      case 'gamepad': return this.xrStateGamepad.connected[0] !== 0;
      case 'hand': return this.xrStateHand.connected[0] !== 0;
      default: return false;
    }
  }
}

class DOMPoint {
  constructor(x, y, z, w) {
    if (typeof x === 'object') {
      this._buffer = x;
    } else {
      if (x === undefined) {
        x = 0;
      }
      if (y === undefined) {
        y = 0;
      }
      if (z === undefined) {
        z = 0;
      }
      if (w === undefined) {
        w = 1;
      }
      this._buffer = Float32Array.from([x, y, z, w]);
    }
  }
  get x() { return this._buffer[0]; }
  set x(x) { this._buffer[0] = x; }
  get y() { return this._buffer[1]; }
  set y(y) { this._buffer[1] = y; }
  get z() { return this._buffer[2]; }
  set z(z) { this._buffer[2] = z; }
  get w() { return this._buffer[3]; }
  set w(w) { this._buffer[3] = w; }
  fromPoint(p) {
    return new DOMPoint(p.x, p.y, p.z, p.w);
  }
}

/* class XRRay { // non-standard
  constructor() {
    this.origin = new DOMPoint();
    this.direction = new DOMPoint(0, 0, -1);
    this.transformMatrix = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
}

class XRInputPose { // non-standard
  constructor() {
    this.targetRay = new XRRay();
    this.gripTransform = new XRRigidTransform();
  }
} */

class XRInputSourceEvent extends Event {
  constructor(type, init = {}) {
    super(type);

    this.frame = init.frame !== undefined ? init.frame : null;
    this.inputSource = init.inputSource !== undefined ? init.inputSource : null;
  }
}

class XRRigidTransform extends EventTarget {
  constructor(position, orientation, scale) {
    super();

    if (typeof position == 'object') {
      const inverse = orientation instanceof XRRigidTransform ? orientation : null;

      this.initialize(position, inverse);
    } else if (typeof position === 'string') {
      const eye = position;
      const session = orientation;

      const result = new XRRigidTransform();
      result.inverse.matrix = eye === 'left' ? session.xrState.leftViewMatrix : session.xrState.rightViewMatrix; // XXX share all other XRRigidTransform properties
      return result;
    } else {
      this.initialize();

      if (!position) {
        position = {x: 0, y: 0, z: 0};
      }
      if (!orientation) {
        orientation = {x: 0, y: 0, z: 0, w: 1};
      }
      if (!scale) {
        scale = {x: 1, y: 1, z: 1};
      }

      this._position._buffer[0] = position.x;
      this._position._buffer[1] = position.y;
      this._position._buffer[2] = position.z;

      this._orientation._buffer[0] = orientation.x;
      this._orientation._buffer[1] = orientation.y;
      this._orientation._buffer[2] = orientation.z;
      this._orientation._buffer[3] = orientation.w;

      this._scale._buffer[0] = scale.x;
      this._scale._buffer[1] = scale.y;
      this._scale._buffer[2] = scale.z;

      localMatrix
        .compose(localVector.fromArray(this._position._buffer), localQuaternion.fromArray(this._orientation._buffer), localVector2.fromArray(this._scale._buffer))
        .toArray(this.matrix);
      localMatrix
        .getInverse(localMatrix)
        .toArray(this.matrixInverse);
      localMatrix
        .decompose(localVector, localQuaternion, localVector2);
      localVector.toArray(this._positionInverse._buffer);
      localQuaternion.toArray(this._orientationInverse._buffer);
      localVector2.toArray(this._scaleInverse._buffer);
    }

    if (!this._inverse) {
      this._inverse = new XRRigidTransform(this._buffer, this);
    }
  }
  
  initialize(_buffer = new ArrayBuffer((3 + 4 + 3 + 16) * 2 * Float32Array.BYTES_PER_ELEMENT), inverse = null) {
    this._buffer = _buffer;
    this._inverse = inverse;

    {
      let index = this._inverse ? ((3 + 4 + 3 + 16) * Float32Array.BYTES_PER_ELEMENT) : 0;

      this._position = new DOMPoint(new Float32Array(this._buffer, index, 3));
      index += 3 * Float32Array.BYTES_PER_ELEMENT;

      this._orientation = new DOMPoint(new Float32Array(this._buffer, index, 4));
      index += 4 * Float32Array.BYTES_PER_ELEMENT;

      this._scale = new DOMPoint(new Float32Array(this._buffer, index, 3));
      index += 3 * Float32Array.BYTES_PER_ELEMENT;

      this.matrix = new Float32Array(this._buffer, index, 16);
      index += 16 * Float32Array.BYTES_PER_ELEMENT;
    }
    {
      let index = this._inverse ? 0 : ((3 + 4 + 3 + 16) * Float32Array.BYTES_PER_ELEMENT);

      this._positionInverse = new DOMPoint(new Float32Array(this._buffer, index, 3));
      index += 3 * Float32Array.BYTES_PER_ELEMENT;

      this._orientationInverse = new DOMPoint(new Float32Array(this._buffer, index, 4));
      index += 4 * Float32Array.BYTES_PER_ELEMENT;

      this._scaleInverse = new DOMPoint(new Float32Array(this._buffer, index, 3));
      index += 3 * Float32Array.BYTES_PER_ELEMENT;

      this.matrixInverse = new Float32Array(this._buffer, index, 16);
      index += 16 * Float32Array.BYTES_PER_ELEMENT;
    }
  }
  
  get inverse() {
    return this._inverse;
  }
  set inverse(inverse) {}

  get position() {
    return this._position;
  }
  set position(position) {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        key: 'position',
        value: position,
      },
    }));
  }
  get orientation() {
    return this._orientation;
  }
  set orientation(orientation) {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        key: 'orientation',
        value: orientation,
      },
    }));
  }
  get scale() {
    return this._scale;
  }
  set scale(scale) {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        key: 'scale',
        value: scale,
      },
    }));
  }

  pushUpdate() {
    localMatrix
      .compose(
        localVector.fromArray(this._position._buffer),
        localQuaternion.fromArray(this._orientation._buffer),
        localVector2.fromArray(this._scale._buffer)
      )
      .toArray(this.matrix);
    localMatrix
      .getInverse(localMatrix)
      .toArray(this.matrixInverse);
    localMatrix
      .decompose(localVector, localQuaternion, localVector2);
    localVector.toArray(this._positionInverse._buffer);
    localQuaternion.toArray(this._orientationInverse._buffer);
    localVector2.toArray(this._scaleInverse._buffer);
  }
}

class XRSpace extends EventTarget {
  constructor(session) {
    super();

    this.session = session; // non-standard
    
    this._pose = new XRPose(session);
  }
}

class XRReferenceSpace extends XRSpace {
  constructor(session) {
    super(session);
  }
  getOffsetReferenceSpace(originOffset) {
    return this; // XXX do the offsetting
  }
  get onreset() {
    return _elementGetter(this, 'reset');
  }
  set onreset(onreset) {
    _elementSetter(this, 'reset', onreset);
  }
}

class XRBoundedReferenceSpace extends XRReferenceSpace {
  constructor(session) {
    super(session);

    this.boundsGeometry = [
      new DOMPoint(-3, -3),
      new DOMPoint(3, -3),
      new DOMPoint(3, 3),
      new DOMPoint(-3, 3),
    ];
    this.emulatedHeight = 0;
  }
}

export {
  XR,
  // XRDevice,
  XRSession,
  XRRenderState,
  XRWebGLLayer,
  XRFrame,
  XRView,
  XRViewport,
  XRPose,
  XRViewerPose,
  XRJointPose,
  XRJointSpace,
  XRHand,
  XRInputSource,
  DOMPoint,
  // XRRay,
  // XRInputPose,
  XRInputSourceEvent,
  XRRigidTransform,
  XRSpace,
  XRReferenceSpace,
  XRBoundedReferenceSpace,
};
