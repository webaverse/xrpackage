import THREE from './three.module.js';
import {XRPackageEngine} from './xrpackage.js';
import {MesherServer} from './mesher.js';

const voxelWidth = 15;
const voxelSize = 1;
const pixelRatio = 3;
const voxelResolution = voxelSize / voxelWidth;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();

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

const modulePromise = makePromise();
self.wasmModule = (moduleName, moduleFn) => {
  if (moduleName === 'mc') {
    self.Module = moduleFn({
      print(text) { console.log(text); },
      printErr(text) { console.warn(text); },
      locateFile(path, scriptDirectory) {
        if (path === 'mc.wasm') {
          return 'bin/' + path;
        } else {
          return path;
        }
      },
      onRuntimeInitialized: () => {
        modulePromise.accept();
      },
    });

    // console.log('got module', Module);
  } else {
    console.warn('unknown wasm module', moduleName);
  }
};
import('./bin/mc.js');

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

const getPreviewMesh = async p => {
  const pe = new XRPackageEngine({
    width: voxelWidth,
    height: voxelWidth,
    devicePixelRatio: pixelRatio,
    autoStart: false,
  });
  const camera = new THREE.OrthographicCamera(Math.PI, Math.PI, Math.PI, Math.PI, 0.001, 1000);
  pe.camera = camera;
  const gl = pe.context;
  const xrfb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, xrfb);
  
  const colorRenderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderbuffer);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, voxelWidth * pixelRatio, voxelWidth * pixelRatio);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRenderbuffer);

  const depthRenderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.DEPTH32F_STENCIL8, voxelWidth * pixelRatio, voxelWidth * pixelRatio);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer);

  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
  pe.setXrFramebuffer(xrfb);

  await pe.add(p);

  const rfb = gl.createFramebuffer();
  
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, xrfb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rfb);
  
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, voxelWidth * pixelRatio, voxelWidth * pixelRatio, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  
  const depthTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH32F_STENCIL8, voxelWidth * pixelRatio, voxelWidth * pixelRatio);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
  
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

  const vsh = `
precision highp float;

// xy = vertex position in normalized device coordinates ([-1,+1] range).
attribute vec2 vertexPositionNDC;

varying vec2 vTexCoords;

const vec2 scale = vec2(0.5, 0.5);

void main() {
  vTexCoords  = vertexPositionNDC * scale + scale; // scale vertex attribute to [0,1] range
  gl_Position = vec4(vertexPositionNDC, 0.0, 1.0);
}
`;
  const fsh = `
precision highp float;

uniform sampler2D colorMap;
varying vec2 vTexCoords;

uniform float uNear;
uniform float uFar;
vec4 encodePixelDepth(float v) {
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
  // gl_FragColor = texture2D(colorMap, vTexCoords);
  float z_b = texture2D(colorMap, vTexCoords).r;
  float z_n = 2.0 * z_b - 1.0;
  float z_e = 2.0 * uNear * uFar / (uFar + uNear - z_n * (uFar - uNear));
  gl_FragColor = encodePixelDepth(z_e);
}`;
  function compileShader(gl, shaderSource, shaderType) {
    // Create the shader object
    var shader = gl.createShader(shaderType);
   
    // Set the shader source code.
    gl.shaderSource(shader, shaderSource);
   
    // Compile the shader
    gl.compileShader(shader);
   
    // Check if it compiled
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      // Something went wrong during compilation; get the error
      throw "could not compile shader:" + gl.getShaderInfoLog(shader);
    }
   
    return shader;
  }
  function createProgram(gl, vertexShader, fragmentShader) {
    // create a program.
    var program = gl.createProgram();
   
    // attach the shaders.
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
   
    // link the program.
    gl.linkProgram(program);
   
    // Check if it linked.
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        // something went wrong with the link
        throw ("program failed to link:" + gl.getProgramInfoLog (program));
    }
   
    return program;
  }

  const vShader = compileShader(gl, vsh, gl.VERTEX_SHADER);
  const fShader = compileShader(gl, fsh, gl.FRAGMENT_SHADER);
  const shaderProgram = createProgram(gl, vShader, fShader);
  const vertexAttributes = {
    vertexPositionNDC: gl.getAttribLocation(shaderProgram, 'vertexPositionNDC'),
  };
  const uniforms = {
    colorMap: gl.getUniformLocation(shaderProgram, 'colorMap'),
    uNear: gl.getUniformLocation(shaderProgram, 'uNear'),
    uFar: gl.getUniformLocation(shaderProgram, 'uFar'),
  };
  
  const verts = [
    // First triangle:
     1.0,  1.0,
    -1.0,  1.0,
    -1.0, -1.0,
    // Second triangle:
    -1.0, -1.0,
     1.0, -1.0,
     1.0,  1.0
  ];
  const screenQuadVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, screenQuadVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  {
    const updateView = (p, q) => {
      // if (!camera.position.equals(p) || !camera.quaternion.equals(q)) {
        camera.position.copy(p);
        camera.quaternion.copy(q);
        camera.updateMatrixWorld();
      // }
    };
    const updateSize = (uSize, vSize, dSize) => {
      camera.left = uSize / -2;
      camera.right = uSize / 2;
      camera.top = vSize / 2;
      camera.bottom = vSize / -2;
      camera.near = 0.001;
      camera.far = dSize;
      camera.updateProjectionMatrix();
    };
    const renderDepth = () => {
      // render
      pe.tick();

      // resolve
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, xrfb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rfb);
      gl.blitFramebuffer(
        0, 0, voxelWidth * pixelRatio, voxelWidth * pixelRatio,
        0, 0, voxelWidth * pixelRatio, voxelWidth * pixelRatio,
        gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT, gl.NEAREST
      );

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

      // read
      gl.useProgram(shaderProgram);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, depthTex);
      gl.uniform1i(uniforms.colorMap, 0);
      gl.uniform1f(uniforms.uNear, camera.near);
      gl.uniform1f(uniforms.uFar, camera.far);

      gl.bindBuffer(gl.ARRAY_BUFFER, screenQuadVBO);
      gl.enableVertexAttribArray(vertexAttributes.vertexPositionNDC);
      gl.vertexAttribPointer(vertexAttributes.vertexPositionNDC, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    };
    const getDepthPixels = (depthTextures, i) => {
      const pixels = new Uint8Array(voxelWidth * pixelRatio * voxelWidth * pixelRatio * 4);
      gl.readPixels(0, 0, voxelWidth * pixelRatio, voxelWidth * pixelRatio, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
   
      const depths = new Float32Array(depthTextures.buffer, depthTextures.byteOffset + i * voxelWidth * pixelRatio * voxelWidth * pixelRatio * Float32Array.BYTES_PER_ELEMENT, voxelWidth * pixelRatio * voxelWidth * pixelRatio);
      let j = 0;
      for (let i = 0; i < depths.length; i++) {
        let v = 
          pixels[j++]/255.0 +
          pixels[j++] +
          pixels[j++]*255.0 +
          pixels[j++]*255.0*255.0;
        if (v > camera.far) {
          v = Infinity;
        }
        depths[i] = v;
      }
    };
    
    /* const aabb = new THREE.Box3().setFromObject(m);
    const center = aabb.getCenter(new THREE.Vector3());
    const size = aabb.getSize(new THREE.Vector3()); */
    const center = new THREE.Vector3(0, 0, 0);
    const size = new THREE.Vector3(3, 3, 3);
    // size.multiplyScalar(1.5);

    const voxelResolution = size.clone().divideScalar(voxelWidth);

    const _multiplyLength = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;

    const depthTextures = new Float32Array(voxelWidth * pixelRatio * voxelWidth * pixelRatio * 6);
    [
      [center.x, center.y, center.z + size.z/2, 0, 0, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)],
      [center.x + size.x/2, center.y, center.z, Math.PI/2, 0, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)],
      [center.x, center.y, center.z - size.z/2, Math.PI/2*2, 0, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)],
      [center.x - size.x/2, center.y, center.z, Math.PI/2*3, 0, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)],
      [center.x, center.y + size.y/2, center.z, 0, -Math.PI/2, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
      [center.x, center.y - size.y/2, center.z, 0, Math.PI/2, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
    ].forEach(([x, y, z, ry, rx, sx, sy, sz], i) => {
      localVector.set(x, y, z);
      if (ry !== 0) {
        localQuaternion.setFromAxisAngle(localVector2.set(0, 1, 0), ry);
      } else if (rx !== 0) {
        localQuaternion.setFromAxisAngle(localVector2.set(1, 0, 0), rx);
      } else {
        localQuaternion.set(0, 0, 0, 1);
      }
      // console.log('render', localVector.toArray().join(','), localQuaternion.toArray().join(','));
      updateView(localVector, localQuaternion);
      updateSize(_multiplyLength(size, sx), _multiplyLength(size, sy), _multiplyLength(size, sz));
      renderDepth();

      const canvas = document.createElement('canvas');
      canvas.width = voxelWidth * pixelRatio;
      canvas.height = voxelWidth * pixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(pe.domElement, 0, 0);
      document.body.appendChild(canvas);

      getDepthPixels(depthTextures, i);
    });

    async function marchPotentials(data) {
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
        // result: {
          positions: outP,
          barycentrics: outB,
        /* },
        cleanup: () => {
          allocator.freeAll();

          this.running = false;
          if (this.queue.length > 0) {
            const fn = this.queue.shift();
            fn();
          }
        }, */
      };
    }
    const res = await marchPotentials({
      depthTextures,
      dims: [voxelWidth, voxelWidth, voxelWidth],
      shift: [voxelResolution.x/2 + center.x - size.x/2, voxelResolution.y/2 + center.y - size.y/2, voxelResolution.z/2 + center.z - size.z/2],
      size: [size.x, size.y, size.z],
      pixelRatio,
      value: 1,
      nvalue: -1,
    });
    console.log('got res', res);
    return res;
  }

  const server = new MesherServer();
  return new THREE.Object3D();
};
export {
  getPreviewMesh,
};
