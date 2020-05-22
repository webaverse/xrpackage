import * as THREE from './three.module.js';
import {XRPackageEngine, XRPackage} from './xrpackage.js';
import './selector.js';

let currentSession = null;

const pe = new XRPackageEngine({
  orbitControls: true,
});

/* const canvas = document.createElement('canvas');
const context = canvas.getContext('webgl', {
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: false,
}); */
const renderer = new THREE.WebGLRenderer({
  canvas: pe.domElement,
  context: pe.getContext('webgl'),
  antialias: true,
  alpha: true,
  // preserveDrawingBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// renderer.autoClear = false;
renderer.sortObjects = false;
renderer.physicallyCorrectLights = true;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0.5, 1);

const container = new THREE.Object3D();
scene.add(container);

const ambientLight = new THREE.AmbientLight(0xFFFFFF);
container.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
container.add(directionalLight);
const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 3);
container.add(directionalLight2);

const cubeMesh = (() => {
  const geometry = new THREE.BoxBufferGeometry(10, 1, 10);
  const material = new THREE.MeshStandardMaterial({
    color: 0x666666,
    // side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);  
  mesh.frustumCulled = false;
  return mesh;
})();
cubeMesh.position.set(0, -1/2, 0);
// cubeMesh.rotation.order = 'YXZ';
container.add(cubeMesh);

/* window.addEventListener('animate', e => {
  const {timestamp, frame} = e.data;
}); */
function animate(timestamp, frame) {
  /* const timeFactor = 1000;
  targetMesh.material.uniforms.uTime.value = (Date.now() % timeFactor) / timeFactor; */

  window.dispatchEvent(new MessageEvent('animate', {
    data: {
      timestamp,
      frame,
    },
  }));

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
renderer.xr.setSession(pe.fakeSession);

document.addEventListener('dragover', e => {
  e.preventDefault();
});
document.addEventListener('drop', e => {
  e.preventDefault();

  if (e.dataTransfer.files.length > 0) {
    const [file] = e.dataTransfer.files;
    window.dispatchEvent(new MessageEvent('upload', {
      data: file,
    }));
  }
});
window.addEventListener('upload', async e => {
  const file = e.data;

  const d = await XRPackage.compileFromFile(file);
  const p = new XRPackage(d);
  await pe.add(p);

  if (/\.vrm$/.test(file.name)) {
    p.wearAvatar();
  }
});

function onSessionStarted(session) {
  session.addEventListener('end', onSessionEnded);
  
  currentSession = session;

  // renderer.xr.setSession(session);
  pe.setSession(session);
}
function onSessionEnded() {
  currentSession.removeEventListener('end', onSessionEnded);

  currentSession = null;

  // renderer.xr.setSession(null);
  pe.setSession(null);
}
document.getElementById('enter-xr-button').addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  
  if (currentSession === null) {
    navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: [
        'local-floor',
        'bounded-floor',
      ],
    }).then(onSessionStarted);
  } else {
    currentSession.end();
  }
});

const getSession = () => {
  return currentSession;
};

export {
  pe,
  renderer,
  scene,
  camera,
  container,
  getSession,
};