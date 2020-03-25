import * as THREE from 'https://raw.githack.com/mrdoob/three.js/dev/build/three.module.js';

const rafSymbol = Symbol();

export class RealityScriptEngine {
  constructor() {
    const canvas = document.createElement('canvas');

    const renderer = new THREE.WebGLRenderer({
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
    this.cubeMesh = cubeMesh;

    let currentSession = null;
    function onSessionStarted(session) {
      session.addEventListener('end', onSessionEnded);

      renderer.xr.setSession(session);

      currentSession = session;
    }
    function onSessionEnded() {
      currentSession.removeEventListener('end', onSessionEnded);

      currentSession = null;
    }

    document.getElementById('enter-vr-button').addEventListener('click', e => {
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

    this.domElement = canvas;
    this.ids = 0;
    this.rafs = [];
  }
  async add(rs) {
    const queue = [];
    const iframe = document.createElement('iframe');
    iframe.src = 'iframe.html';
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
    this.iframe = iframe;
    
    await new Promise((accept, reject) => {
      iframe.addEventListener('load', accept);
      iframe.addEventListener('error', reject);
    });

    const {files} = rs;
    const indexFile = files.find(file => new URL(file.url).pathname === '/');
    console.log('got index file', indexFile);
    const indexHtml = indexFile.response.body.toString('utf-8');
    await iframe.contentWindow.rs.iframeInit({
      engine: this,
      indexHtml,
      canvas: this.domElement,
    });
    console.log('iframe init post');
  }
  tick() {
    this.renderer.state.reset();
      
    const f = (Date.now()%2000)/2000 * Math.PI*2;
    this.cubeMesh.rotation.x = f;
    this.cubeMesh.rotation.y = f;
    this.cubeMesh.rotation.z = f;

    this.renderer.render(this.scene, this.camera);

    const rafs = this.rafs.slice();
    this.rafs.length = 0;
    for (let i = 0; i < rafs.length; i++) {
      rafs[i]();
    }
  }
  requestAnimationFrame(fn) {
    this.rafs.push(fn);

    const id = ++this.ids;
    fn[rafSymbol] = id;
    return id;
  }
  cancelAnimationFrame(id) {
    const index = this.rafs.findIndex(fn => fn[rafSymbol].id === id);
    if (index !== -1) {
      this.rafs.splice(index, 1);
    }
  }
}

export class RealityScript {
  constructor(d) {
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
  }
  static compile(primaryUrl, manifestUrl, files) {
    const builder = (new wbn.BundleBuilder(primaryUrl))
      .setManifestURL(manifestUrl);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const {url, type, data} = file;
      builder.addExchange(url, 200, {
        'Content-Type': type,
      }, data);
    }
    return builder.createBundle();
  }
}