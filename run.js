import * as THREE from './three.module.js';
import {XRPackageEngine, XRPackage} from './xrpackage.js';

function parseQuery(queryString) {
  var query = {};
  var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  return query;
}

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

(async () => {
  const q = parseQuery(window.location.search);
  if (q.i) {
    const metadataHash = await contract.methods.getMetadata(parseInt(q.i, 10), 'hash').call();
    const metadata = await fetch(`${apiHost}/${metadataHash}`)
      .then(res => res.json());
    const {dataHash} = metadata;

    const arrayBuffer = await fetch(`${apiHost}/${dataHash}.wbn`)
      .then(res => res.arrayBuffer());

    const p = new XRPackage(new Uint8Array(arrayBuffer));
    await pe.add(p);
  } else if (q.u) {
    const arrayBuffer = await fetch(q.u)
      .then(res => res.arrayBuffer());

    const p = new XRPackage(new Uint8Array(arrayBuffer));
    await pe.add(p);
  } else if (q.h) {
    const [cubeHtml, cubeManifest] = await Promise.all([
      (async () => {
        const res = await fetch('examples/html/cube.html');
        return await res.text();
      })(),
      (async () => {
        const res = await fetch('examples/html/manifest.json');
        return await res.text();
      })(),
    ]);

    const d = XRPackage.compileRaw(
      [
        {
          url: '/cube.html',
          type: 'text/html',
          data: cubeHtml,
        },
        {
          url: '/manifest.json',
          type: 'application/json',
          data: cubeManifest,
        }
      ]
    );
    const p = new XRPackage(d);
    await pe.add(p);
  } else {
    const [cubeHtml, cubeManifest, modelVrm, catVox] = await Promise.all([
      (async () => {
        const res = await fetch('examples/html/cube.html');
        return await res.text();
      })(),
      (async () => {
        const res = await fetch('examples/html/manifest.json');
        return await res.text();
      })(),
      (async () => {
        const res = await fetch('examples/vrm/model.vrm');
        return await res.arrayBuffer();
      })(),
      (async () => {
        const res = await fetch('examples/vox/cat.vox');
        return await res.arrayBuffer();
      })(),
    ]);

    {
      const d = XRPackage.compileRaw(
        [
          {
            url: '/cube.html',
            type: 'text/html',
            data: cubeHtml,
          },
          {
            url: '/manifest.json',
            type: 'application/json',
            data: cubeManifest,
          }
        ]
      );
      const p = new XRPackage(d);
      await pe.add(p);
    }
    {
      const d = XRPackage.compileRaw(
        [
          {
            url: '/model.vrm',
            type: 'application/octet-stream',
            data: new Uint8Array(modelVrm),
          },
          {
            url: '/manifest.json',
            type: 'application/json',
            data: JSON.stringify({
              name: 'Avatar',
              xr_type: 'vrm@0.0.1',
              start_url: 'model.vrm',
            }),
          }
        ]
      );
      const p = new XRPackage(d);
      await pe.add(p);
    }
    {
      const d = XRPackage.compileRaw(
        [
          {
            url: '/cat.vox',
            type: 'application/octet-stream',
            data: new Uint8Array(catVox),
          },
          {
            url: '/manifest.json',
            type: 'application/json',
            data: JSON.stringify({
              name: 'Cat',
              xr_type: 'vox@0.0.1',
              start_url: 'cat.vox',
            }),
          }
        ]
      );
      const p = new XRPackage(d);
      await pe.add(p);
    }
  }
  window.xrLoaded = true;
  window.dispatchEvent(new MessageEvent('xrload'));
})();

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