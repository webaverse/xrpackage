import THREE from './three.module.js';
import {XRPackageEngine} from './xrpackage.js';
import {MesherServer} from './mesher.js';

const voxelWidth = 15;
const voxelSize = 1;
const pixelRatio = 3;
const voxelResolution = voxelSize / voxelWidth;

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

const getPreviewMesh = async p => {
  const pe = new XRPackageEngine({
    autoStart: false,
  });
  const camera = new THREE.OrthographicCamera(Math.PI, Math.PI, Math.PI, Math.PI, 0.001, 1000);
  pe.camera = camera;
  const gl = pe.context;
  const xrfb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, xrfb);
  
  const colorRenderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderbuffer);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRenderbuffer);

  const depthRenderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.DEPTH32F_STENCIL8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio);
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
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  
  const depthTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTex);
  // gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH24_STENCIL8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio, 0, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH32F_STENCIL8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio);
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
  const program = createProgram(gl, vShader, fShader);
  const vertexAttributes = {
    vertexPositionNDC: gl.getAttribLocation(program, 'vertexPositionNDC'),
  };
  const uniforms = {
    colorMap: gl.getUniformLocation(program, 'colorMap'),
    uNear: gl.getUniformLocation(program, 'uNear'),
    uFar: gl.getUniformLocation(program, 'uFar'),
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
    const pixels = new Uint8Array(pe.options.width * pe.options.devicePixelRatio * pe.options.height * pe.options.devicePixelRatio * 4);
    gl.readPixels(0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
 
    const depths = new Float32Array(pe.options.width * pe.options.devicePixelRatio * pe.options.height * pe.options.devicePixelRatio);
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

    const updateView = (p, q) => {
      if (!camera.position.equals(p) || !camera.quaternion.equals(q)) {
        camera.position.copy(p);
        camera.quaternion.copy(q);
        camera.updateMatrixWorld();
      }
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
        0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio,
        0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio,
        gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT, gl.NEAREST
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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
    const getDepthPixels = (i, depthTextures, offset) => {
      gl.readPixels(0, 0, width * pixelRatio, height * pixelRatio, new Float32Array(depthTextures.buffer, depthTextures.byteOffset + offset * Float32Array.BYTES_PER_ELEMENT, width * pixelRatio * height * pixelRatio * 4), 0);
    };
    
    /* const aabb = new THREE.Box3().setFromObject(m);
    const center = aabb.getCenter(new THREE.Vector3());
    const size = aabb.getSize(new THREE.Vector3()); */
    const center = new THREE.Vector3(0, 0, 0);
    const size = new THREE.Vector3(3, 3, 3);
    // size.multiplyScalar(1.5);

    const voxelResolution = size.clone().divideScalar(voxelWidth);

    const _multiplyLength = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;

    const depthTextures = new Float32Array(voxelWidth * pixelRatio * voxelWidth * pixelRatio * 4 * 6);
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
      updateView(x, y, z, localQuaternion);
      updateSize(_multiplyLength(size, sx), _multiplyLength(size, sy), _multiplyLength(size, sz));
      renderDepth();
      getDepthPixels(i, depthTextures, voxelWidth * pixelRatio * voxelWidth * pixelRatio * 4 * i);
    });

    this.scene.remove(m);

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
    });
    console.log('got res', res);
  }

  document.body.appendChild(pe.domElement);
  const server = new MesherServer();
  return new THREE.Object3D();
};
export {
  getPreviewMesh,
};
