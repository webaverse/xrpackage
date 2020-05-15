import * as THREE from './three.module.js';
import {XRPackageEngine, XRPackage} from './xrpackage.js';
import {BufferGeometryUtils} from './BufferGeometryUtils.js';
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
const localQuaternion = new THREE.Quaternion();
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

// const objects = [];
function animate(timestamp, frame) {
  /* const timeFactor = 1000;
  targetMesh.material.uniforms.uTime.value = (Date.now() % timeFactor) / timeFactor; */

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
    _bindUploadFileButton(newInputFileEl);
  });
};
_bindUploadFileButton(document.getElementById('load-package-input'), file => {
  window.dispatchEvent(new MessageEvent('upload', {
    data: file,
  }));
});

document.getElementById('new-scene-button').addEventListener('click', e => {
  pe.reset();
});
let shieldLevel = 1;
document.getElementById('shield-slider').addEventListener('change', e => {
  const newShieldLevel = parseInt(e.target.value, 10);
  const {packages} = pe;
  switch (newShieldLevel) {
    case 0: {
      for (const p of packages) {
        p.visible = false;
        if (!p.placeholderBox) {
          p.placeholderBox = _makeTargetMesh();
          p.placeholderBox.matrix.copy(p.matrix).decompose(p.placeholderBox.position, p.placeholderBox.quaternion, p.placeholderBox.scale);
        }
        scene.add(p.placeholderBox);
      }
      shieldLevel = newShieldLevel;
      hoverTarget = null;
      selectTargets = [];
      break;
    }
    case 1: {
      for (const p of packages) {
        p.visible = true;
        if (p.placeholderBox) {
          scene.remove(p.placeholderBox);
        }
      }
      shieldLevel = newShieldLevel;
      hoverTarget = null;
      selectTargets = [];
      break;
    }
  }
});
pe.addEventListener('packageremove', e => {
  const p = e.data;
  if (p.placeholderBox) {
    scene.remove(p.placeholderBox);
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
  raycaster.setFromCamera(mouse, camera);
  // raycaster.ray.origin.add(raycaster.ray.direction);
};
renderer.domElement.addEventListener('mousemove', e => {
  if (!getSession()) {
    _updateRaycasterFromMouseEvent(raycaster, e);

    hoverTarget = null;
    if (shieldLevel === 0) {
      for (let i = 0; i < pe.packages.length; i++) {
        const p = pe.packages[i];
        p.matrix.decompose(localVector, localQuaternion, localVector2);
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
  selectTargets = hoverTarget ? [hoverTarget] : [];
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

const jsonClient = new JSONClient({});
jsonClient.addEventListener('localUpdate', e => {
  const j = e.data;
  console.log('update local json', j);
  /* const newValue = e.data;
  if (newValue !== codeInput.value) {
    codeInput.value = newValue;
    codeInput.dispatchEvent(new CustomEvent('input'));
  } */
});
jsonClient.addEventListener('message', e => {
  console.log('send ops 1', e.data);
  if (channelConnection) {
    const {ops, baseIndex} = e.data;
    console.log('send ops 2', {ops, baseIndex});
    channelConnection.send(JSON.stringify({
      method: 'ops',
      ops,
      baseIndex,
    }));
  }
});

let selectedPackage = null;
const packagesEl = document.getElementById('packages');
const _renderPackages = () => {
  if (selectedPackage) {
    const p = selectedPackage;
    packagesEl.innerHTML = `
      <div class=package-detail>
        <h1><nav class=back-button><i class="fa fa-arrow-left"></i></nav>${p.name}</h1>
        <nav class="button remove-button">Remove</nav>
        <b>Position</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number value=0>
          </label>
          <label>
            <span>Y</span>
            <input type=number value=0>
          </label>
          <label>
            <span>Z</span>
            <input type=number value=0>
          </label>
        </div>
        <b>Quaternion</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number value=0>
          </label>
          <label>
            <span>Y</span>
            <input type=number value=0>
          </label>
          <label>
            <span>Z</span>
            <input type=number value=0>
          </label>
          <label>
            <span>W</span>
            <input type=number value=0>
          </label>
        </div>
        <b>Scale</b>
        <div class=row>
          <label>
            <span>X</span>
            <input type=number value=0>
          </label>
          <label>
            <span>Y</span>
            <input type=number value=0>
          </label>
          <label>
            <span>Z</span>
            <input type=number value=0>
          </label>
        </div>
      </div>
    `;
    const backButton = packagesEl.querySelector('.back-button');
    backButton.addEventListener('click', e => {
      selectedPackage = null;
      _renderPackages();
    });
    const removeButton = packagesEl.querySelector('.remove-button');
    removeButton.addEventListener('click', e => {
      pe.remove(p);
      backButton.click();
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
        _renderPackages();
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
window.addEventListener('xrpackageload', e => {
  _renderPackages();
});