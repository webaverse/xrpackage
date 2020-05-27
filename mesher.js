import THREE from './three.module.js';
/* import {GLTFLoader} from './GLTFLoader.js';
import {LegacyGLTFLoader} from './LegacyGLTFLoader.js';
import {OBJLoader2} from './OBJLoader2.js';
import {MTLLoader} from './MTLLoader.js';
import {GLTFExporter} from './GLTFExporter.js'; */

// const NUM_POSITIONS = 1 * 1024 * 1024;
const voxelWidth = 15;
const voxelSize = 1;
const pixelRatio = 3;
const voxelResolution = voxelSize / voxelWidth;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localColor = new THREE.Color();
const localColor2 = new THREE.Color();

/* function mod(a, n) {
  return ((a%n)+n)%n;
} */
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
const _serializeMesh = o => {
  const p = makePromise();
  new GLTFExporter().parse(o, gltf => {
    p.accept(gltf);
  }, {
    binary: true,
    // includeCustomExtensions: true,
  });
  return p;
};
const _deserializeMesh = async (b, renderer, scene, camera) => {
  const blob = new Blob([b], {
    type: 'application/octet-stream',
  });
  const u = URL.createObjectURL(blob);
  const p = makePromise();
  new GLTFLoader().load(u, p.accept, function onProgress() {}, p.reject);
  try {
    let o = await p;
    o = o.scene;
    o.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false;
      }
    });

    const {attributes, textures} = renderer;
    const materialObjects = [];
    o.traverse(o => {
      if (o.isMesh) {
        {
          const {geometry} = o;

          var index = geometry.index;
          var geometryAttributes = geometry.attributes;

          if ( index !== null ) {

            attributes.update( index, 34963 );

          }

          for ( var name in geometryAttributes ) {

            attributes.update( geometryAttributes[ name ], 34962 );

          }

          // morph targets

          var morphAttributes = geometry.morphAttributes;

          for ( var name in morphAttributes ) {

            var array = morphAttributes[ name ];

            for ( var i = 0, l = array.length; i < l; i ++ ) {

              attributes.update( array[ i ], 34962 );

            }

          }
        }
        {
          const {material} = o;

          const ks = Object.getOwnPropertyNames(material);
          ks.forEach(k => {
            const v = material[k];
            if (v && v.isTexture) {
              textures.setTexture2D(v, 0);
            }
          });

          materialObjects.push(o);
        }
      }
    });
    renderer.setCurrentRenderState(scene, camera);
    for (let i = 0; i < materialObjects.length; i++) {
      const o = materialObjects[i];
      renderer.setProgram(camera, scene, o.material, o);
    }

    return o;
  } finally {
    URL.revokeObjectURL(u);
  }
};

const manager = new THREE.LoadingManager();

const depthMaterial = (() => {
  const depthVsh = `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }
  `;
  const depthFsh = `
    uniform float uNear;
    uniform float uFar;
    vec4 encodePixelDepth( float v ) {
      float x = fract(v);
      v -= x;
      v /= 255.0;
      float y = fract(v);
      v -= y;
      v /= 255.0;
      float z = fract(v);
      /* v -= y;
      v /= 255.0;
      float w = fract(v);
      float w = 0.0;
      if (x == 0.0 && y == 0.0 && z == 0.0 && w == 0.0) {
        return vec4(0.0, 0.0, 0.0, 1.0);
      } else { */
        return vec4(x, y, z, 0.0);
      // }
    }
    void main() {
      float originalZ = uNear + gl_FragCoord.z / gl_FragCoord.w * (uFar - uNear);
      gl_FragColor = encodePixelDepth(originalZ);
    }
  `;
  return new THREE.ShaderMaterial({
    uniforms: {
      uNear: {
        type: 'f',
        value: 0,
      },
      uFar: {
        type: 'f',
        value: 0,
      },
    },
    vertexShader: depthVsh,
    fragmentShader: depthFsh,
    // transparent: true,
    side: THREE.DoubleSide,
  });
})();

const idMaterial = (() => {
  const depthVsh = `
    attribute vec3 id;
    varying vec3 vId;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      vId = id;
    }
  `;
  const depthFsh = `
    varying vec3 vId;
    void main() {
      gl_FragColor = vec4(vId, 0.0);
    }
  `;
  return new THREE.ShaderMaterial({
    uniforms: {
      /* uNear: {
        type: 'f',
        value: 0,
      },
      uFar: {
        type: 'f',
        value: 0,
      }, */
    },
    vertexShader: depthVsh,
    fragmentShader: depthFsh,
    // transparent: true,
    side: THREE.DoubleSide,
  });
})();

const makeGlobalMaterial = () => new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: `\
    // attribute vec3 color;
    attribute vec3 barycentric;
    varying vec3 vPosition;
    // varying vec3 vColor;
    varying vec3 vBC;
    void main() {
      // vColor = color;
      vBC = barycentric;
      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      vPosition = modelViewPosition.xyz;
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `,
  fragmentShader: `\
    uniform sampler2D uCameraTex;
    varying vec3 vPosition;
    // varying vec3 vColor;
    varying vec3 vBC;
    vec3 color = vec3(0.984313725490196, 0.5490196078431373, 0.0);
    vec3 lightDirection = vec3(0.0, 0.0, 1.0);
    float edgeFactor() {
      vec3 d = fwidth(vBC);
      vec3 a3 = smoothstep(vec3(0.0), d*1.5, vBC);
      return min(min(a3.x, a3.y), a3.z);
    }
    void main() {
      // vec3 color = vColor;
      float barycentricFactor = (0.2 + (1.0 - edgeFactor()) * 0.8);
      vec3 xTangent = dFdx( vPosition );
      vec3 yTangent = dFdy( vPosition );
      vec3 faceNormal = normalize( cross( xTangent, yTangent ) );
      float lightFactor = dot(faceNormal, lightDirection);
      gl_FragColor = vec4((0.5 + color * barycentricFactor) * lightFactor, 0.5 + barycentricFactor * 0.5);
    }
  `,
  // side: THREE.BackSide,
  /* polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -4, */
  // transparent: true,
  // depthWrite: false,
  extensions: {
    derivatives: true,
  },
});

export class XRRaycaster {
  constructor({width = 512, height = 512, pixelRatio = 1, voxelSize, renderer = new THREE.WebGLRenderer(), onDepthRender = () => {}, onIntersectRender = () => {}} = {}) {
    // this.width = width;
    // this.height = height;
    this.renderer = renderer;

    const depthBufferPixels = new Float32Array(width * pixelRatio * height * pixelRatio * 4);
    // this.depthBufferPixels = depthBufferPixels;

    let camera = new THREE.OrthographicCamera(
      voxelSize / -2, voxelSize / 2,
      voxelSize / 2, voxelSize / -2,
      0.001, voxelSize
    );
    // this.camera = camera;

    let far = voxelSize;

    const depthTarget = {};
    const depthTargets = (() => {
      const result = Array(6);
      for (let i = 0; i < 6; i++) {
        result[i] = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.NearestFilter,
          format: THREE.RGBAFormat,
          type: THREE.FloatType,
          depthBuffer: true,
          stencilBuffer: false,
        });
      }
      return result;
    })();
    depthTarget.updateSize = (uSize, vSize, dSize) => {
      camera.left = uSize / -2;
      camera.right = uSize / 2;
      camera.top = vSize / 2;
      camera.bottom = vSize / -2;
      camera.near = 0.001;
      camera.far = dSize;
      camera.updateProjectionMatrix();

      far = dSize;
    };
    depthTarget.updateView = (x, y, z, q) => {
      if (camera.position.x !== x || camera.position.y !== y || camera.position.z !== z || !camera.quaternion.equals(q)) {
        camera.position.set(x, y, z);
        camera.quaternion.copy(q);
        camera.updateMatrixWorld();
      }
    };
    depthTarget.renderDepthTexture = i => {
      onDepthRender({
        target: depthTargets[i],
        near: 0.001,
        far,
        pixelRatio,
        matrixWorld: camera.matrixWorld.toArray(),
        projectionMatrix: camera.projectionMatrix.toArray(),
      });
    };
    depthTarget.getDepthBufferPixels = (i, depthTextures, offset) => {
      renderer.readRenderTargetPixels(depthTargets[i], 0, 0, width * pixelRatio, height * pixelRatio, new Float32Array(depthTextures.buffer, depthTextures.byteOffset + offset * Float32Array.BYTES_PER_ELEMENT, width * pixelRatio * height * pixelRatio * 4), 0);
    };
    this.depthTarget = depthTarget;

    const intersectTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      // type: THREE.FloatType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    intersectTarget.raycast = (origin, direction) => {
      onIntersectRender({
        origin,
        direction,
        target: intersectTarget,
        pixels: intersectPixels,
      });

      const id = (this.intersectPixels[0] << 16) | (this.intersectPixels[1] << 8) | this.intersectPixels[2];
      return id;
    };
    this.intersectTarget = intersectTarget;
    const intersectPixels = new Uint8Array(4);
    this.intersectPixels = intersectPixels;
  }
  updateView(x, y, z, q) {
    this.depthTarget.updateView(x, y, z, q);
  }
  updateSize(x, y, z) {
    this.depthTarget.updateSize(x, y, z);
  }
  renderDepthTexture(i) {
    this.depthTarget.renderDepthTexture(i);
  }
  getDepthBufferPixels(i, depthTextures, offset) {
    return this.depthTarget.getDepthBufferPixels(i, depthTextures, offset);
  }
  raycast(origin, direction) {
    return this.intersectTarget.raycast(origin, direction);
  }
}

class Allocator {
  constructor() {
    this.offsets = [];
  }
  alloc(constructor, size) {
    const offset = self.Module._doMalloc(size * constructor.BYTES_PER_ELEMENT);
    const b = new constructor(self.Module.HEAP8.buffer, self.Module.HEAP8.byteOffset + offset, size);
    b.offset = offset;
    this.offsets.push(offset);
    return b;
  }
  freeAll() {
    for (let i = 0; i < this.offsets.length; i++) {
      self.Module._doFree(this.offsets[i]);
    }
    this.offsets.length = 0;
  }
}

class Mesher extends EventTarget {
  constructor(renderer, scene, camera) {
    super();

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.previewMaterial = makeGlobalMaterial();
    this.worker = (() => {
      let cbs = [];
      const w = new Worker('mc-worker.js', {
        type: 'module',
      });
      w.onmessage = async e => {
        const {data} = e;
        const {error, result, type, payload} = data;
        if (error || result) {
          cbs.shift()(error, result);
        } else if (type) {
          switch (type) {
            case 'previewMesh': {
              const {positions, barycentrics, meshId, aabb: {min, max}} = payload;
              const geometry = new THREE.BufferGeometry();
              geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
              geometry.setAttribute('barycentric', new THREE.BufferAttribute(barycentrics, 3));
              const previewMesh = new THREE.Mesh(geometry, this.previewMaterial);
              previewMesh.boundingSphere = new THREE.Box3(
                new THREE.Vector3().fromArray(min),
                new THREE.Vector3().fromArray(max),
              );
              previewMesh.meshId = meshId;
              this.previewMeshes.push(previewMesh);

              this.dispatchEvent(new MessageEvent('previewMesh', {
                data: {
                  previewMesh,
                },
              }));
              break;
            }
            case 'mesh': {
              const {arrayBuffer, meshId, aabb: {min, max}} = payload;
              const mesh = await _deserializeMesh(arrayBuffer, this.renderer, this.scene, this.camera);
              mesh.traverse(o => {
                if (o.isMesh) {
                  o.frustumCulled = false;
                }
              });
              mesh.meshId = meshId;
              this.meshes.push(mesh);

              const previewMeshIndex = this.previewMeshes.findIndex(previewMesh => previewMesh.meshId === meshId);
              const previewMesh = previewMeshIndex !== -1 ? this.previewMeshes[previewMeshIndex] : null;
              if (previewMeshIndex !== -1) {
                this.previewMeshes.splice(previewMeshIndex, 1);
              }
              this.dispatchEvent(new MessageEvent('mesh', {
                data: {
                  mesh,
                  previewMesh,
                },
              }));
              break;
            }
            case 'removeMesh': {
              const {meshId} = payload;
              const meshIndex = this.meshes.findIndex(mesh => mesh.meshId === meshId);
              const mesh = meshIndex !== -1 ? this.meshes[meshIndex] : null;
              if (meshIndex !== -1) {
                this.meshes.splice(meshIndex, 1);
              }
              const previewMeshIndex = this.previewMeshes.findIndex(previewMesh => previewMesh.meshId === meshId);
              const previewMesh = previewMeshIndex !== -1 ? this.previewMeshes[previewMeshIndex] : null;
              if (previewMeshIndex !== -1) {
                this.previewMeshes.splice(previewMeshIndex, 1);
              }

              this.dispatchEvent(new MessageEvent('removeMesh', {
                data: {
                  mesh,
                  previewMesh,
                },
              }));
              break;
            }
            default: {
              console.warn('unknown message type', data);
              break;
            }
          }
        } else {
          console.warn('unknown message format', data);
        }
      };
      w.onerror = err => {
        console.warn(err);
      };
      w.message = (req, transfers) => new Promise((accept, reject) => {
        w.postMessage(req, transfers);
      });
      w.request = (req, transfers) => new Promise((accept, reject) => {
        w.postMessage(req, transfers);

        cbs.push((err, result) => {
          if (!err) {
            accept(result);
          } else {
            reject(err);
          }
        });
      });
      return w;
    })();

    this.previewMeshes = [];
    this.meshes = [];
    this.chunks = [];

  }
  addMesh(url, position = new THREE.Vector3()) {
    this.worker.message({
      method: 'addMesh',
      url,
      position: position.toArray(),
    });
  }
  registerChunk(aabb) {
    this.worker.message({
      method: 'registerChunk',
      aabb: {
        min: aabb.min.toArray(),
        max: aabb.max.toArray(),
      },
    });
  }
  unregisterChunk(aabb) {
    this.worker.message({
      method: 'unregisterChunk',
      aabb: {
        min: aabb.min.toArray(),
        max: aabb.max.toArray(),
      },
    });
  }
  getChunk(aabb) {
    const chunk = new EventTarget();
    this.registerChunk(aabb);
    chunk.destroy = () => {
      this.unregisterChunk(aabb);
      this.chunks.splice(this.chunks.indexOf(chunk), 1);
    };
    this.chunks.push(chunk);
    return chunk;
  }
  async intersectMeshes(origin, direction) {
    const res = await this.worker.request({
      method: 'intersectMeshes',
      origin,
      direction,
    });
    return res;
  }
}

class MesherServer {
  constructor() {
    const canvas = new OffscreenCanvas(1, 1);
    this.canvas = canvas;
    const context = canvas.getContext('webgl2');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      context,
    });
    this.renderer = renderer;

    const scene = new THREE.Scene();

    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
    directionalLight.position.set(0.5, 1, 0.5).multiplyScalar(100);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 3);
    directionalLight2.position.set(-0.5, -0.1, 0.5).multiplyScalar(100);
    scene.add(directionalLight2);

    this.scene = scene;

    const raycasterCamera = new THREE.PerspectiveCamera();
    const onDepthRender = ({target, near, far, pixelRatio, matrixWorld, projectionMatrix}) => {
      raycasterCamera.near = near;
      raycasterCamera.far = far;
      raycasterCamera.matrixWorld.fromArray(matrixWorld).decompose(raycasterCamera.position, raycasterCamera.quaternion, raycasterCamera.scale);
      raycasterCamera.projectionMatrix.fromArray(projectionMatrix);
      depthMaterial.uniforms.uNear.value = near;
      depthMaterial.uniforms.uFar.value = far;

      // console.log('render', target, near, far, matrixWorld, projectionMatrix);

      // const unhideUiMeshes = _hideUiMeshes();

      scene.overrideMaterial = depthMaterial;
      // const oldVrEnabled = renderer.vr.enabled;
      // renderer.vr.enabled = false;
      // const oldClearColor = localColor.copy(renderer.getClearColor());
      // const oldClearAlpha = renderer.getClearAlpha();
      renderer.setRenderTarget(target);

      renderer.setClearColor(new THREE.Color(0, 0, 0), 1);
      // renderer.setViewport(0, 0, width*pixelRatio, height*pixelRatio);
      renderer.render(scene, raycasterCamera);

      scene.overrideMaterial = null;
      // renderer.vr.enabled = oldVrEnabled;
      // renderer.setClearColor(oldClearColor, oldClearAlpha);

      // unhideUiMeshes();

      renderer.setRenderTarget(null);
    };
    const onIntersectRender = ({origin, direction, target, pixels}) => {
      raycasterCamera.position.fromArray(origin);
      raycasterCamera.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3().fromArray(direction));
      raycasterCamera.updateMatrixWorld();
      raycasterCamera.near = 0.1
      raycasterCamera.far = 1000;
      raycasterCamera.updateProjectionMatrix();

      // console.log('render', target, near, far, matrixWorld, projectionMatrix);

      // const unhideUiMeshes = _hideUiMeshes();

      scene.overrideMaterial = idMaterial;
      // const oldVrEnabled = renderer.vr.enabled;
      // renderer.vr.enabled = false;
      // const oldClearColor = localColor.copy(renderer.getClearColor());
      // const oldClearAlpha = renderer.getClearAlpha();
      renderer.setRenderTarget(target);

      renderer.setClearColor(new THREE.Color(0, 0, 0), 1);
      // renderer.setViewport(0, 0, width*pixelRatio, height*pixelRatio);
      renderer.render(scene, raycasterCamera);

      scene.overrideMaterial = null;
      // renderer.vr.enabled = oldVrEnabled;
      // renderer.setClearColor(oldClearColor, oldClearAlpha);

      // unhideUiMeshes();

      renderer.setRenderTarget(null);

      renderer.readRenderTargetPixels(target, 0, 0, 1, 1, pixels, 0);
    };
    this.xrRaycaster = new XRRaycaster({
      width: voxelWidth,
      height: voxelWidth,
      pixelRatio,
      voxelSize,
      renderer,
      onDepthRender,
      onIntersectRender,
    });

    this.running = false;
    this.queue = [];

    this.ids = 0;
    this.meshes = [];
    this.chunks = [];
  }
  /* reset() {
    if (!this.arrayBuffer) {
      this.arrayBuffer = this.arrayBuffers.pop();
    }
    if (!this.arrayBuffer) {
      const arrayBufferSize =
        NUM_POSITIONS*3*Float32Array.BYTES_PER_ELEMENT +
        NUM_POSITIONS*3*Float32Array.BYTES_PER_ELEMENT +
        NUM_POSITIONS*3*Float32Array.BYTES_PER_ELEMENT +
        NUM_POSITIONS*2*Float32Array.BYTES_PER_ELEMENT +
        NUM_POSITIONS*Uint32Array.BYTES_PER_ELEMENT;
      this.arrayBuffer = new ArrayBuffer(arrayBufferSize);
    }

    if (!this.globalMaterial) {
      this.globalMaterial = makeGlobalMaterial();
    }
  } */
  pushMesh(o) {
    o.updateMatrixWorld();
    o.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false;
        o.isSkinnedMesh = false;
      }
    });
    const meshId = ++this.ids;
    o.meshId = meshId;
    const c = Uint8Array.from([
      ((meshId >> 16) & 0xFF),
      ((meshId >> 8) & 0xFF),
      (meshId & 0xFF),
    ]);
    o.traverse(o => {
      if (o.isMesh) {
        const numPositions = o.geometry.attributes.position.array.length;
        const ids = new Uint8Array(numPositions);
        for (let i = 0; i < numPositions; i += 3) {
          ids.set(c, i);
        }
        o.geometry.setAttribute('id', new THREE.BufferAttribute(ids, 3, true));
      }
    });
    o.aabb = new THREE.Box3().setFromObject(o);
    o.chunks = [];
    this.meshes.push(o);
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i].notifyMesh(o);
    }
  }
  async voxelize(m) {
    /* m.updateMatrixWorld();
    m.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false;
        o.isSkinnedMesh = false;
      }
    }); */
    this.scene.add(m);

    const aabb = new THREE.Box3().setFromObject(m);
    const center = aabb.getCenter(new THREE.Vector3());
    const size = aabb.getSize(new THREE.Vector3());
    size.multiplyScalar(1.5);

    const voxelResolution = size.clone().divideScalar(voxelWidth);

    const _multiplyLength = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;

    const depthTextures = new Float32Array(voxelWidth * pixelRatio * voxelWidth * pixelRatio * 4 * 6);
    // depthTextures.fill(Infinity);
    [
      [center.x, center.y, center.z + size.z/2, 0, 0, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)],
      [center.x + size.x/2, center.y, center.z, Math.PI/2, 0, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)],
      [center.x, center.y, center.z - size.z/2, Math.PI/2*2, 0, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)],
      [center.x - size.x/2, center.y, center.z, Math.PI/2*3, 0, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)],
      [center.x, center.y + size.y/2, center.z, 0, -Math.PI/2, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
      [center.x, center.y - size.y/2, center.z, 0, Math.PI/2, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
    ].forEach(([x, y, z, ry, rx, sx, sy, sz], i) => {
      if (ry !== 0) {
        localQuaternion.setFromAxisAngle(localVector.set(0, 1, 0), ry);
      } else if (rx !== 0) {
        localQuaternion.setFromAxisAngle(localVector.set(1, 0, 0), rx);
      } else {
        localQuaternion.set(0, 0, 0, 1);
      }
      this.xrRaycaster.updateView(x, y, z, localQuaternion);
      this.xrRaycaster.updateSize(_multiplyLength(size, sx), _multiplyLength(size, sy), _multiplyLength(size, sz));
      this.xrRaycaster.renderDepthTexture(i);
    });
    for (let i = 0; i < 6; i++) {
      this.xrRaycaster.getDepthBufferPixels(i, depthTextures, voxelWidth * pixelRatio * voxelWidth * pixelRatio * 4 * i);
    }

    this.scene.remove(m);

    // this.reset();

    // const {arrayBuffer} = this;
    // this.arrayBuffer = null;
    const res = await this.marchPotentials({
      // method: 'marchPotentials',
      depthTextures,
      dims: [voxelWidth, voxelWidth, voxelWidth],
      shift: [voxelResolution.x/2 + center.x - size.x/2, voxelResolution.y/2 + center.y - size.y/2, voxelResolution.z/2 + center.z - size.z/2],
      size: [size.x, size.y, size.z],
      pixelRatio,
      value: 1,
      nvalue: -1,
      // arrayBuffer,
    });
    // console.log('got res', res);
    return res;

    /* const mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.globalMaterial);
    mesh.geometry.setAttribute('position', new THREE.BufferAttribute(res.positions, 3));
    mesh.geometry.setAttribute('barycentric', new THREE.BufferAttribute(res.barycentrics, 3));

    return mesh; */
  }
  async marchPotentials(data) {
    if (!this.running) {
      this.running = true;

      const {depthTextures: depthTexturesData, dims: dimsData, shift: shiftData, size: sizeData, pixelRatio, value, nvalue} = data;

      const allocator = new Allocator();

      const depthTextures = allocator.alloc(Float32Array, depthTexturesData.length);
      depthTextures.set(depthTexturesData);

      const positions = allocator.alloc(Float32Array, 1024*1024*Float32Array.BYTES_PER_ELEMENT);
      const barycentrics = allocator.alloc(Float32Array, 1024*1024*Float32Array.BYTES_PER_ELEMENT);

      const numPositions = allocator.alloc(Uint32Array, 1);
      numPositions[0] = positions.length;
      const numBarycentrics = allocator.alloc(Uint32Array, 1);
      numBarycentrics[0] = barycentrics.length;

      const dims = allocator.alloc(Int32Array, 3);
      dims.set(Int32Array.from(dimsData));

      const shift = allocator.alloc(Float32Array, 3);
      shift.set(Float32Array.from(shiftData));

      const size = allocator.alloc(Float32Array, 3);
      size.set(Float32Array.from(sizeData));

      self.Module._doMarchPotentials(
        depthTextures.offset,
        dims.offset,
        shift.offset,
        size.offset,
        pixelRatio,
        value,
        nvalue,
        positions.offset,
        barycentrics.offset,
        numPositions.offset,
        numBarycentrics.offset
      );

      // console.log('out num positions', numPositions[0], numBarycentrics[0]);

      const arrayBuffer2 = new ArrayBuffer(
        Uint32Array.BYTES_PER_ELEMENT +
        numPositions[0]*Float32Array.BYTES_PER_ELEMENT +
        Uint32Array.BYTES_PER_ELEMENT +
        numBarycentrics[0]*Uint32Array.BYTES_PER_ELEMENT
      );
      let index = 0;

      const outP = new Float32Array(arrayBuffer2, index, numPositions[0]);
      outP.set(new Float32Array(positions.buffer, positions.byteOffset, numPositions[0]));
      index += Float32Array.BYTES_PER_ELEMENT * numPositions[0];

      const outB = new Float32Array(arrayBuffer2, index, numBarycentrics[0]);
      outB.set(new Float32Array(barycentrics.buffer, barycentrics.byteOffset, numBarycentrics[0]));
      index += Float32Array.BYTES_PER_ELEMENT * numBarycentrics[0];

      return {
        result: {
          positions: outP,
          barycentrics: outB,
        },
        cleanup: () => {
          allocator.freeAll();

          this.running = false;
          if (this.queue.length > 0) {
            const fn = this.queue.shift();
            fn();
          }
        },
      };
    } else {
      const p = makePromise();
      this.queue.push(p.accept);
      await p;
      return await this.marchPotentials(data);
    }
  }
  raycast(origin, direction) {
    for (let i = 0; i < this.meshes.length; i++) {
      this.scene.add(this.meshes[i]);
    }

    const id = this.xrRaycaster.raycast(origin, direction);

    for (let i = 0; i < this.meshes.length; i++) {
      this.scene.remove(this.meshes[i]);
    }

    return id;
  }
  postMessage(m, txs) {
    self.postMessage(m, txs)
  }
  async handleMessage(data) {
    const {method} = data;
    switch (method) {
      case 'addMesh': {
        const allocator = new Allocator();

        const {url, position} = data;

        if (/\.obj$/.test(url)) {
          const p = makePromise();
          new MTLLoader(manager)
            .load(url.replace('.obj', '.mtl'), materials => {
              materials.preload();
              p.accept(materials);
            });
          let materials = await p;
          materials = Object.keys(materials.materials).map(k => materials.materials[k]);
          
          const p2 = makePromise();
          const loader = new OBJLoader2(manager);
          loader.parser.setMaterials( materials );
          loader.load(url, p2.accept, function onProgress() {}, p2.reject);

          const o = await p2;
          o.traverse(o => {
            if (o.isMesh) {
              o.geometry
                .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)))
                // .applyMatrix4(new THREE.Matrix4().makeTranslation(-rowSize/2 + x, 0, z));
              // o.material = materials;
            }
          });
          o.position.fromArray(position);
          this.pushMesh(o);
        } else if (/\.vrm$/.test(url)) {
          const p = makePromise();
          new GLTFLoader(manager).load(url, p.accept, function onProgress() {}, p.reject);
          let o = await p;
          o = o.scene;
          o.position.fromArray(position);
          this.pushMesh(o);
        } else {
          throw new Error(`unknown model type: ${url}`);
        }

        break;
      }
      case 'registerChunk': {
        const {
          aabb: {
            min,
            max,
          },
        } = data;
        const aabb = new THREE.Box3(
          new THREE.Vector3().fromArray(min),
          new THREE.Vector3().fromArray(max),
        );
        const chunk = new ChunkServer(aabb, this);
        this.chunks.push(chunk);

        for (let i = 0; i < this.meshes.length; i++) {
          const mesh = this.meshes[i];
          chunk.notifyMesh(mesh);
        }
        break;
      }
      case 'unregisterChunk': {
        const {
          aabb: {
            min,
            max,
          },
        } = data;
        const aabb = new THREE.Box3(
          new THREE.Vector3().fromArray(min),
          new THREE.Vector3().fromArray(max),
        );
        const index = this.chunks.findIndex(c => c.aabb.min.equals(aabb.min) && c.aabb.max.equals(aabb.max));
        if (index !== -1) {
          const [chunk] = this.chunks.splice(index, 1);
          chunk.destroy();
        }
        break;
      }
      case 'intersectMeshes': {
        const {
          origin,
          direction,
        } = data;
        const id = this.raycast(origin, direction);

        self.postMessage({
          result: {
            id,
          },
        });

        break;
      }
      default: {
        console.warn('unknown method', data.method);
        break;
      }
    }
  };
}

class ChunkServer {
  constructor(aabb, mesherServer) {
    this.aabb = aabb;
    this.mesherServer = mesherServer;
    this.meshes = [];
    this.live = true;
  }
  async notifyMesh(mesh) {
    if (mesh.aabb.intersectsBox(this.aabb)) {
      this.meshes.push(mesh);
      mesh.chunks.push(this);

      if (mesh.chunks.length === 1) {
        {
          const {result, cleanup} = await this.mesherServer.voxelize(mesh);
          if (!this.live) return;
          const {positions, barycentrics} = result;

          const arrayBuffer2 = new ArrayBuffer(
            Uint32Array.BYTES_PER_ELEMENT +
            positions.length*Float32Array.BYTES_PER_ELEMENT +
            Uint32Array.BYTES_PER_ELEMENT +
            barycentrics.length*Uint32Array.BYTES_PER_ELEMENT
          );
          let index = 0;

          new Uint32Array(arrayBuffer2, index, 1)[0] = positions.length;
          index += Uint32Array.BYTES_PER_ELEMENT;
          const outP = new Float32Array(arrayBuffer2, index, positions.length);
          outP.set(new Float32Array(positions.buffer, positions.byteOffset, positions.length));
          index += Float32Array.BYTES_PER_ELEMENT * positions.length;

          new Uint32Array(arrayBuffer2, index, 1)[0] = barycentrics.length;
          index += Uint32Array.BYTES_PER_ELEMENT;
          const outB = new Float32Array(arrayBuffer2, index, barycentrics.length);
          outB.set(new Float32Array(barycentrics.buffer, barycentrics.byteOffset, barycentrics.length));
          index += Float32Array.BYTES_PER_ELEMENT * barycentrics.length;

          this.mesherServer.postMessage({
            type: 'previewMesh',
            payload: {
              positions: outP,
              barycentrics: outB,
              meshId: mesh.meshId,
              aabb: {
                min: mesh.aabb.min.toArray(),
                max: mesh.aabb.max.toArray(),
              },
            },
          }, [arrayBuffer2]);

          cleanup();
        }
        {
          const arrayBuffer = await _serializeMesh(mesh);
          if (!this.live) return;

          this.mesherServer.postMessage({
            type: 'mesh',
            payload: {
              arrayBuffer,
              meshId: mesh.meshId,
              aabb: {
                min: mesh.aabb.min.toArray(),
                max: mesh.aabb.max.toArray(),
              },
            },
          }, [arrayBuffer]);
        }
      }
    }
  }
  destroy() {
    for (let i = 0; i < this.meshes.length; i++){
      const mesh = this.meshes[i];
      const index = mesh.chunks.indexOf(this);
      if (index !== -1) {
        mesh.chunks.splice(index, 1);
        if (mesh.chunks.length === 0) {
          this.mesherServer.postMessage({
            type: 'removeMesh',
            payload: {
              meshId: mesh.meshId,
            },
          });
        }
      }
    }
    this.meshes.length = 0;
    this.live = false;
  }
}

export {
  makePromise,
  Mesher,
  MesherServer,
};