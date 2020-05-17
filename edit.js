import * as THREE from './three.module.js';
import {XRPackageEngine, XRPackage} from './xrpackage.js';
import {BufferGeometryUtils} from './BufferGeometryUtils.js';
import {TransformControls} from './TransformControls.js';
import {OutlineEffect} from './OutlineEffect.js';
import {XRChannelConnection} from 'https://raw.githack.com/webaverse/metartc/master/xrrtc.js';
import {JSONClient} from 'https://grid-presence.exokit.org/sync/sync-client.js';
import address from 'https://contracts.webaverse.com/address.js';
import abi from 'https://contracts.webaverse.com/abi.js';
import {pe, renderer, scene, camera, container, getSession} from './run.js';

const apiHost = `https://ipfs.exokit.org/ipfs`;
const network = 'rinkeby';
const infuraApiKey = '4fb939301ec543a0969f3019d74f80c2';
const rpcUrl = `https://${network}.infura.io/v3/${infuraApiKey}`;
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
// window.web3 = web3;
const contract = new web3.eth.Contract(abi, address);

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localBox = new THREE.Box3();

function downloadFile(file, filename) {
  const blobURL = URL.createObjectURL(file);
  const tempLink = document.createElement('a');
  tempLink.style.display = 'none';
  tempLink.href = blobURL;
  tempLink.setAttribute('download', filename);

  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
}

const _makeTargetMesh = () => {
  const targetGeometry = BufferGeometryUtils.mergeBufferGeometries([
    new THREE.BoxBufferGeometry(0.03, 0.2, 0.03)
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0, -0.1, 0)),
    new THREE.BoxBufferGeometry(0.03, 0.2, 0.03)
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1))))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, 0.1)),
    new THREE.BoxBufferGeometry(0.03, 0.2, 0.03)
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0))))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0.1, 0, 0)),
  ]);
  const geometry = BufferGeometryUtils.mergeBufferGeometries([
    targetGeometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, 0.5, -0.5)),
    targetGeometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0))))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, -0.5, -0.5)),
    targetGeometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, 0.5, 0.5)),
    targetGeometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0))))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, 0.5, -0.5)),
    targetGeometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0))))
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5)),
    targetGeometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))))
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, -1, 0))))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, -0.5, 0.5)),
    targetGeometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0))))
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0))))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, -0.5, -0.5)),
    targetGeometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-1, 1, 0).normalize(), new THREE.Vector3(1, -1, 0).normalize())))
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, -0.5, 0.5)),
  ]).applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
  const targetVsh = `
    #define M_PI 3.1415926535897932384626433832795
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      float f = 1.0 + pow(sin(uTime * M_PI), 0.5) * 0.2;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position * f, 1.);
    }
  `;
  const targetFsh = `
    uniform float uHighlight;
    uniform float uTime;
    void main() {
      float f = max(1.0 - pow(uTime, 0.5), 0.1);
      gl_FragColor = vec4(vec3(f * uHighlight), 1.0);
    }
  `;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uHighlight: {
        type: 'f',
        value: 0,
      },
      uTime: {
        type: 'f',
        value: 0,
      },
    },
    vertexShader: targetVsh,
    fragmentShader: targetFsh,
    // transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
};
/* const targetMesh = _makeTargetMesh();
scene.add(targetMesh); */

pe.defaultAvatar();

const velocity = new THREE.Vector3();
const extraVelocity = new THREE.Vector3();
function animate(timestamp, frame) {
  /* const timeFactor = 1000;
  targetMesh.material.uniforms.uTime.value = (Date.now() % timeFactor) / timeFactor; */

  const currentSession = getSession();
  if (currentSession) {
    // XXX
  } else if (document.pointerLockElement) {
    const speed = 0.015 * (keys.shift ? 3 : 1);
    const cameraEuler = pe.camera.rotation.clone();
    cameraEuler.x = 0;
    cameraEuler.z = 0;
    extraVelocity.set(0, 0, 0);
    if (keys.left) {
      extraVelocity.add(new THREE.Vector3(-1, 0, 0).applyEuler(cameraEuler));
    }
    if (keys.right) {
      extraVelocity.add(new THREE.Vector3(1, 0, 0).applyEuler(cameraEuler));
    }
    if (keys.up) {
      extraVelocity.add(new THREE.Vector3(0, 0, -1).applyEuler(cameraEuler));
    }
    if (keys.down) {
      extraVelocity.add(new THREE.Vector3(0, 0, 1).applyEuler(cameraEuler));
    }
    if (extraVelocity.length() > 0) {
      extraVelocity.normalize().multiplyScalar(speed);
    }
    velocity.add(extraVelocity);
    pe.camera.position.add(velocity);
    pe.camera.updateMatrixWorld();
    velocity.multiplyScalar(0.7);
  }

  if (selectedTool === 'thirdperson') {
    pe.camera.matrixWorld.decompose(localVector, localQuaternion, localVector2);
    localVector.add(localVector3.set(0, 0, -1).applyQuaternion(localQuaternion));
    if (velocity.lengthSq() > 0) {
      localQuaternion.setFromUnitVectors(localVector3.set(0, 0, -1), localVector4.copy(velocity).normalize());
    }
    pe.setRigMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
  } else {
    pe.setRigMatrix(null);
  }

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
renderer.xr.setSession(pe.fakeSession);

const _bindUploadFileButton = (inputFileEl, handleUpload) => {
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
    newInputFileEl.classList.add('hidden');
    parentNode.appendChild(newInputFileEl);
    _bindUploadFileButton(newInputFileEl, handleUpload);
  });
};
_bindUploadFileButton(document.getElementById('load-package-input'), file => {
  window.dispatchEvent(new MessageEvent('upload', {
    data: file,
  }));
});

let selectedTool = 'camera';
const tools = Array.from(document.querySelectorAll('.tool'));
for (let i = 0; i < tools.length; i++) {
  const tool = document.getElementById('tool-' + (i+1));
  tool.addEventListener('click', e => {
    for (let i = 0; i < tools.length; i++) {
      tools[i].classList.remove('selected');
    }
    tool.classList.add('selected');

    selectedTool = tool.getAttribute('tool');

    pe.orbitControls.enabled = false;

    hoverTarget = null;
    for (let i = 0; i < selectTargets.length; i++) {
      const selectTarget = selectTargets[i];
      selectTarget.control && _unbindTransformControls(selectTarget);
    }
    selectTargets = [];

    switch (selectedTool) {
      case 'camera': {
        pe.orbitControls.enabled = true;
        document.exitPointerLock();
        pe.orbitControls.target.copy(pe.camera.position).add(new THREE.Vector3(0, 0, -3).applyQuaternion(pe.camera.quaternion));
        break;
      }
      case 'firstperson': {
        pe.domElement.requestPointerLock();
        break;
      }
      case 'thirdperson': {
        pe.domElement.requestPointerLock();
        break;
      }
      case 'select': {
        document.exitPointerLock();
        break;
      }
    }
  });
}
document.addEventListener('pointerlockchange', e => {
  if (!document.pointerLockElement) {
    tools.find(tool => tool.matches('.tool[tool=camera]')).click();
  }
});

const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  shift: false,
};
window.addEventListener('keydown', e => {
  switch (e.which) {
    case 49: // 1
    case 50:
    case 51:
    case 52: // 4
    {
      tools[e.which - 49].click();
      break;
    }
    case 87: { // W
      if (!document.pointerLockElement) {
        // nothing
      } else {
        keys.up = true;
      }
      break;
    }
    case 65: { // A
      if (!document.pointerLockElement) {
        // nothing
      } else {
        keys.left = true;
      }
      break;
    }
    case 83: { // S
      if (!document.pointerLockElement) {
        // nothing
      } else {
        keys.down = true;
      }
      break;
    }
    case 68: { // D
      if (!document.pointerLockElement) {
        // nothing
      } else {
        keys.right = true;
      }
      break;
    }
    case 69: { // E
      selectTargets.forEach(selectedObjectMesh => {
        selectedObjectMesh.control.setMode('rotate');
      });
      break;
    }
    case 82: { // R
      selectTargets.forEach(selectedObjectMesh => {
        selectedObjectMesh.control.setMode('scale');
      });
      break;
    }
    case 16: { // shift
      if (document.pointerLockElement) {
        keys.shift = true;
      }
      break;
    }
    case 8: // backspace
    case 46: // del
    {
      /* if (selectedObjectMeshes.length > 0) {
        const oldSelectedObjectMeshes = selectedObjectMeshes;

        _setHoveredObjectMesh(null);
        _setSelectedObjectMesh(null, false);

        const action = createAction('removeObjects', {
          oldObjectMeshes: oldSelectedObjectMeshes,
          container,
          objectMeshes,
        });
        execute(action);
      } */
      break;
    }
  }
});
window.addEventListener('keyup', e => {
  switch (e.which) {
    case 87: { // W
      if (document.pointerLockElement) {
        keys.up = false;
      }
      break;
    }
    case 65: { // A
      if (document.pointerLockElement) {
        keys.left = false;
      }
      break;
    }
    case 83: { // S
      if (document.pointerLockElement) {
        keys.down = false;
      }
      break;
    }
    case 68: { // D
      if (document.pointerLockElement) {
        keys.right = false;
      }
      break;
    }
    case 16: { // shift
      if (document.pointerLockElement) {
        keys.shift = false;
      }
      break;
    }
  }
});

document.getElementById('reset-scene-button').addEventListener('click', e => {
  pe.reset();
});
let shieldLevel = 1;
const _placeholdPackage = p => {
  p.visible = false;
  if (!p.placeholderBox) {
    p.placeholderBox = _makeTargetMesh();
    p.placeholderBox.package = p;
    p.placeholderBox.matrix.copy(p.matrix).decompose(p.placeholderBox.position, p.placeholderBox.quaternion, p.placeholderBox.scale);
  }
  scene.add(p.placeholderBox);
};
const _unplaceholdPackage = p => {
  p.visible = true;
  if (p.placeholderBox) {
    scene.remove(p.placeholderBox);
  }
};
document.getElementById('shield-slider').addEventListener('change', e => {
  const newShieldLevel = parseInt(e.target.value, 10);
  const {packages} = pe;
  switch (newShieldLevel) {
    case 0: {
      for (const p of packages) {
        _placeholdPackage(p);
      }
      shieldLevel = newShieldLevel;
      hoverTarget = null;
      selectTargets = [];
      break;
    }
    case 1: {
      for (const p of packages) {
        _unplaceholdPackage(p);
      }
      shieldLevel = newShieldLevel;
      hoverTarget = null;
      for (let i = 0; i < selectTargets.length; i++) {
        const selectTarget = selectTargets[i];
        selectTarget.control && _unbindTransformControls(selectTarget);
      }
      selectTargets = [];
      break;
    }
  }
});
function _matrixUpdate(e) {
  const p = this;
  const matrix = e.data;
  jsonClient.setItem(['children', p.id, 'matrix'], p.matrix.toArray());
}
const _bindPackage = p => {
  p.addEventListener('matrixupdate', _matrixUpdate);
};
const _unbindPackage = p => {
  p.removeEventListener('matrixupdate', _matrixUpdate);
};
pe.packages.forEach(p => {
  _bindPackage(p);
});
pe.addEventListener('packageadd', async e => {
  const p = e.data;

  if (shieldLevel === 0) {
    _placeholdPackage(p);
  }
  _renderPackages();

  if (channelConnection) {
    p.hash = await p.upload();

    if (p.parent) {
      jsonClient.setItem(['children', p.id], {
        id: p.id,
        hash: p.hash,
        matrix: p.matrix.toArray(),
      });
      _bindPackage(p);
    }
  }
});
pe.addEventListener('packageremove', e => {
  const p = e.data;
  if (p.placeholderBox) {
    scene.remove(p.placeholderBox);
  }

  if (selectedPackage === p) {
    selectedPackage = null;
  }
  _renderPackages();

  if (p.hash) {
    jsonClient.removeItem(['children', p.id]);
    _unbindPackage(p);
  }
});

let hoverTarget = null;
let selectTargets = [];

const hoverOutlineEffect = new OutlineEffect(renderer, {
  defaultThickness: 0.01,
  defaultColor: new THREE.Color(0x42a5f5).toArray(),
  defaultAlpha: 0.5,
  // defaultKeepAlive: false,//true,
});
const selectOutlineEffect = new OutlineEffect(renderer, {
  defaultThickness: 0.01,
  defaultColor: new THREE.Color(0x66bb6a).toArray(),
  defaultAlpha: 0.5,
  // defaultKeepAlive: false,//true,
});

let transformControlsHovered = false;
const _bindTransformControls = o => {
  const control = new TransformControls(camera, renderer.domElement, document);
  // control.setMode(transformMode);
  control.size = 3;
  // control.visible = toolManager.getSelectedElement() === xrIframe;
  // control.enabled = control.visible;
  /* control.addEventListener('dragging-changed', e => {
    orbitControls.enabled = !e.value;
  }); */
  control.addEventListener('mouseEnter', () => {
    transformControlsHovered = true;
  });
  control.addEventListener('mouseLeave', () => {
    transformControlsHovered = false;
  });
  const _snapshotTransform = o => ({
    position: o.position.clone(),
    quaternion: o.quaternion.clone(),
    scale: o.scale.clone(),
  });
  let lastTransform = _snapshotTransform(o);
  let changed = false;
  control.addEventListener('mouseDown', () => {
    lastTransform = _snapshotTransform(o);
  });
  control.addEventListener('mouseUp', () => {
    if (changed) {
      changed = false;

      const newTransform = _snapshotTransform(o);
      o.position.copy(newTransform.position);
      o.quaternion.copy(newTransform.quaternion);
      o.scale.copy(newTransform.scale);
      o.updateMatrixWorld();
      o.package.setMatrix(o.matrix);
      /* const action = createAction('transform', {
        object: o,
        oldTransform: lastTransform,
        newTransform,
      });
      execute(action); */
      lastTransform = newTransform;
    }
  });
  control.addEventListener('objectChange', e => {
    changed = true;
  });
  control.attach(o);
  scene.add(control);
  o.control = control;
};
const _unbindTransformControls = o => {
  scene.remove(o.control);
  o.control.dispose();
  o.control = null;
  transformControlsHovered = false;
};

let renderingOutline = false;
const outlineScene = new THREE.Scene();
scene.onAfterRender = () => {
  if (renderingOutline) return;
  renderingOutline = true;

  outlineScene.position.copy(container.position);
  outlineScene.quaternion.copy(container.quaternion);
  outlineScene.scale.copy(container.scale);

  let oldHoverParent;
  if (hoverTarget) {
    oldHoverParent = hoverTarget.parent;
    outlineScene.add(hoverTarget);
  }
  hoverOutlineEffect.renderOutline(outlineScene, camera);
  if (oldHoverParent) {
    oldHoverParent.add(hoverTarget);
  }

  const oldSelectParents = selectTargets.map(o => o.parent);
  for (let i = 0; i < selectTargets.length; i++) {
    outlineScene.add(selectTargets[i]);
  }
  selectOutlineEffect.renderOutline(outlineScene, camera);
  for (let i = 0; i < selectTargets.length; i++) {
    const oldSelectParent = oldSelectParents[i];
    oldSelectParent && oldSelectParent.add(selectTargets[i]);
  }

  renderingOutline = false;
};

const raycaster = new THREE.Raycaster();
const _updateRaycasterFromMouseEvent = (raycaster, e) => {
  const mouse = new THREE.Vector2(( ( e.clientX ) / window.innerWidth ) * 2 - 1, - ( ( e.clientY ) / window.innerHeight ) * 2 + 1);
  raycaster.setFromCamera(mouse, pe.camera);
  // raycaster.ray.origin.add(raycaster.ray.direction);
};
const _updateMouseMovement = e => {
  const {movementX, movementY} = e;
  if (selectedTool === 'thirdperson') {
    pe.camera.position.add(localVector.set(0, -0.5, -2).applyQuaternion(pe.camera.quaternion));
  }
  pe.camera.rotation.y -= movementX * Math.PI*2*0.001;
  pe.camera.rotation.x -= movementY * Math.PI*2*0.001;
  pe.camera.rotation.x = Math.min(Math.max(pe.camera.rotation.x, -Math.PI/2), Math.PI/2);
  pe.camera.quaternion.setFromEuler(pe.camera.rotation);
  if (selectedTool === 'thirdperson') {
    pe.camera.position.sub(localVector.set(0, -0.5, -2).applyQuaternion(pe.camera.quaternion));
  }
  pe.camera.updateMatrixWorld();
  pe.setCamera(camera);
};
renderer.domElement.addEventListener('mousemove', e => {
  if (selectedTool === 'firstperson') {
    _updateMouseMovement(e);
  } else if (selectedTool === 'thirdperson') {
    _updateMouseMovement(e);
  } else if (selectedTool === 'select' && !getSession()) {
    _updateRaycasterFromMouseEvent(raycaster, e);

    hoverTarget = null;
    if (shieldLevel === 0) {
      for (let i = 0; i < pe.packages.length; i++) {
        const p = pe.packages[i];
        p.matrix.decompose(localVector, localQuaternion, localVector2);
        localVector.add(localVector3.set(0, 1/2, 0));
        localBox.setFromCenterAndSize(localVector, localVector2);
        if (raycaster.ray.intersectsBox(localBox)) {
          hoverTarget = p.placeholderBox;
          break;
        }
      }
    }
  }
});
renderer.domElement.addEventListener('click', e => {
  for (let i = 0; i < selectTargets.length; i++) {
    const selectTarget = selectTargets[i];
    if (selectTarget.control) {
      _unbindTransformControls(selectTarget);
    }
  }
  selectTargets = hoverTarget ? [hoverTarget] : [];
  for (let i = 0; i < selectTargets.length; i++) {
    _bindTransformControls(selectTargets[i]);
  }
});

const dropdownButton = document.getElementById('dropdown-button');
const dropdown = document.getElementById('dropdown');
const tabs = Array.from(dropdown.querySelectorAll('.tab'));
const tabContents = Array.from(dropdown.querySelectorAll('.tab-content'));
dropdownButton.addEventListener('click', e => {
  dropdownButton.classList.toggle('open');
  dropdown.classList.toggle('open');
});
for (let i = 0; i < tabs.length; i++) {
  const tab = tabs[i];
  const tabContent = tabContents[i];
  tab.addEventListener('click', e => {
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tabContent = tabContents[i];
      tab.classList.remove('open');
      tabContent.classList.remove('open');
    }

    tab.classList.add('open');
    tabContent.classList.add('open');

    if (selectedPackage) {
      selectedPackage = null;
      _renderPackages();
    }
  });
}

let channelConnection = null;
const connectButton = document.getElementById('connect-button');
const disconnectButton = document.getElementById('disconnect-button');
const roomNameEl = document.getElementById('room-name');
connectButton.addEventListener('click', e => {
  const roomName = roomNameEl.value;
  if (roomName) {
    channelConnection = new XRChannelConnection(`wss://grid-presence.exokit.org/?c=${encodeURIComponent(roomName)}`);
    channelConnection.addEventListener('open', e => {
      // console.log('got open', e);
    });
    channelConnection.addEventListener('peerconnection', e => {
      const peerConnection = e.data;
      console.log('got peer connection', peerConnection);
    });
    channelConnection.addEventListener('message', e => {
      const m = e.data;
      const {method} = m;
      switch (method) {
        case 'init': {
          const {json, baseIndex} = m;
          jsonClient.pullInit(json, baseIndex);
          break;
        }
        case 'ops': {
          const {ops, baseIndex} = m;
          jsonClient.pullOps(ops, baseIndex);
          break;
        }
        default: {
          console.warn('unknown channel connection method: ', JSON.stringify(method), m);
          break;
        }
      }
      // console.log('xr channel message', m);
    });
    channelConnection.addEventListener('close', e => {
      console.log('channel connection close', e);
    });

    connectButton.style.display = 'none';
    disconnectButton.style.display = null;
  }
});
disconnectButton.addEventListener('click', e => {
  channelConnection.close();
  channelConnection = null;

  connectButton.style.display = null;
  disconnectButton.style.display = 'none';
});

const _pullPackages = async children => {
  const keepPackages = [];
  for (const id in children) {
    const child = children[id];
    let p = pe.packages.find(p => p.id === child.id);
    if (!p) {
      p = await XRPackage.download(child.hash);
      p.id = child.id;
      pe.add(p);
    }
    localMatrix.fromArray(child.matrix);
    if (!p.matrix.equals(localMatrix)) {
      p.setMatrix(localMatrix);
    }
    keepPackages.push(p);
  }
  const packages = pe.packages.slice();
  for (let i = 0; i < packages.length; i++) {
    const p = packages[i];
    if (!keepPackages.includes(p)) {
      pe.remove(p);
    }
  }
};

const jsonClient = new JSONClient({});
jsonClient.addEventListener('localUpdate', e => {
  const j = e.data;
  const {children = []} = j;
  _pullPackages(children);
  // console.log('update local json', j);
  /* const newValue = e.data;
  if (newValue !== codeInput.value) {
    codeInput.value = newValue;
    codeInput.dispatchEvent(new CustomEvent('input'));
  } */
});
jsonClient.addEventListener('message', e => {
  // console.log('send ops 1', e.data);
  if (channelConnection) {
    const {ops, baseIndex} = e.data;
    // console.log('send ops 2', {ops, baseIndex});
    channelConnection.send(JSON.stringify({
      method: 'ops',
      ops,
      baseIndex,
    }));
  }
});

const avatarMe = document.getElementById('avatar-me');
const _renderAvatars = () => {
  const {avatar} = pe;
  const previewEl = avatarMe.querySelector('.preview');
  // previewEl.src = avatar.getPreviewUrl();
  const nameEl = avatarMe.querySelector('.name');
  nameEl.innerText = avatar.name;
};
pe.addEventListener('avatarchange', e => {
  _renderAvatars();
});

let selectedPackage = null;
const packagesEl = document.getElementById('packages');
const _renderPackages = () => {
  if (selectedPackage) {
    const p = selectedPackage;
    packagesEl.innerHTML = `
      <div class=package-detail>
        <h1><nav class=back-button><i class="fa fa-arrow-left"></i></nav>${p.name}</h1>
        <nav class="button wear-button">Wear</nav>
        <nav class="button remove-button">Remove</nav>
        <b>Position</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number class=position-x value=0 step=0.1>
          </label>
          <label>
            <span>Y</span>
            <input type=number class=position-y value=0 step=0.1>
          </label>
          <label>
            <span>Z</span>
            <input type=number class=position-z value=0 step=0.1>
          </label>
        </div>
        <b>Quaternion</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number class=quaternion-x value=0 step=0.1>
          </label>
          <label>
            <span>Y</span>
            <input type=number class=quaternion-y value=0 step=0.1>
          </label>
          <label>
            <span>Z</span>
            <input type=number class=quaternion-z value=0 step=0.1>
          </label>
          <label>
            <span>W</span>
            <input type=number class=quaternion-w value=1 step=0.1>
          </label>
        </div>
        <b>Scale</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number class=scale-x value=1 step=0.1>
          </label>
          <label>
            <span>Y</span>
            <input type=number class=scale-y value=1 step=0.1>
          </label>
          <label>
            <span>Z</span>
            <input type=number class=scale-z value=1 step=0.1>
          </label>
        </div>
      </div>
    `;
    const backButton = packagesEl.querySelector('.back-button');
    backButton.addEventListener('click', e => {
      selectedPackage = null;
      _renderPackages();
    });
    const wearButton = packagesEl.querySelector('.wear-button');
    wearButton.addEventListener('click', async e => {
      const p2 = p.clone();
      // await pe.add(p2);
      await pe.wearAvatar(p2);
    });
    const removeButton = packagesEl.querySelector('.remove-button');
    removeButton.addEventListener('click', e => {
      pe.remove(p);
    });

    const _setPosition = (e, key) => {
      p.matrix.decompose(localVector, localQuaternion, localVector2);
      localVector[key] = e.target.value;
      p.setMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
    };
    const _setQuaternion = (e, key) => {
      p.matrix.decompose(localVector, localQuaternion, localVector2);
      localQuaternion[key] = e.target.value;
      localQuaternion.normalize();
      ['x', 'y', 'z', 'w'].forEach(k => {
        packagesEl.querySelector('.quaternion-' + k).value = localQuaternion[k];
      });
      p.setMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
    };
    const _setScale = (e, key) => {
      p.matrix.decompose(localVector, localQuaternion, localVector2);
      localVector2[key] = e.target.value;
      p.setMatrix(localMatrix.compose(localVector, localQuaternion, localVector2));
    };
    packagesEl.querySelector('.position-x').addEventListener('change', e => {
      _setPosition(e, 'x');
    });
    packagesEl.querySelector('.position-y').addEventListener('change', e => {
      _setPosition(e, 'y');
    });
    packagesEl.querySelector('.position-y').addEventListener('change', e => {
      _setPosition(e, 'z');
    });
    packagesEl.querySelector('.quaternion-x').addEventListener('change', e => {
      _setQuaternion(e, 'x');
    });
    packagesEl.querySelector('.quaternion-y').addEventListener('change', e => {
      _setQuaternion(e, 'y');
    });
    packagesEl.querySelector('.quaternion-z').addEventListener('change', e => {
      _setQuaternion(e, 'z');
    });
    packagesEl.querySelector('.quaternion-w').addEventListener('change', e => {
      _setQuaternion(e, 'w');
    });
    packagesEl.querySelector('.scale-x').addEventListener('change', e => {
      _setScale(e, 'x');
    });
    packagesEl.querySelector('.scale-y').addEventListener('change', e => {
      _setScale(e, 'y');
    });
    packagesEl.querySelector('.scale-z').addEventListener('change', e => {
      _setScale(e, 'z');
    });
  } else {
    packagesEl.innerHTML = pe.packages.map((p, i) => `
      <div class=package index=${i}>
        <span class=name>${p.name}</span>
        <nav class=close-button><i class="fa fa-times"></i></nav>
      </div>
    `).join('\n');
    Array.from(packagesEl.querySelectorAll('.package')).forEach(packageEl => {
      const index = parseInt(packageEl.getAttribute('index'), 10);
      const p = pe.packages[index];
      packageEl.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        selectedPackage = p;
        _renderPackages();
      });
      const closeButton = packageEl.querySelector('.close-button');
      closeButton.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        pe.remove(p);
      });
    });
  }
};
(async () => {
  if (!window.xrLoaded) {
    await new Promise((accept, reject) => {
      window.addEventListener('xrload', e => {
        accept();
      });
    });
  }
  _renderPackages();
})();