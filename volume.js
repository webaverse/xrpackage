import THREE from './three.module.js';
import {XRPackageEngine} from './xrpackage.js';
import {MesherServer} from './mesher.js';

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
  const gl = pe.context;
  const xrfb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, xrfb);
  
  const colorRenderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderbuffer);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRenderbuffer);

  const depthRenderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.DEPTH24_STENCIL8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthRenderbuffer);

  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
  pe.setXrFramebuffer(xrfb);

  await pe.add(p);
  pe.tick();

  const rfb = gl.createFramebuffer();
  
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, xrfb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rfb);
  
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  
  const depthTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH24_STENCIL8, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio, 0, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
  
  gl.blitFramebuffer(
    0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio,
    0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio,
    gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT, gl.NEAREST
  );
  
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

void main() {
  gl_FragColor = texture2D(colorMap, vTexCoords);
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
  function drawFullScreenQuad(gl, shaderProgram, vertexAttributes, uniforms) {
    gl.useProgram(shaderProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uniforms.colorMap, 0);

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

    // Bind:
    gl.bindBuffer(gl.ARRAY_BUFFER, screenQuadVBO);
    gl.enableVertexAttribArray(vertexAttributes.vertexPositionNDC);
    gl.vertexAttribPointer(vertexAttributes.vertexPositionNDC, 2, gl.FLOAT, false, 0, 0);

    // Draw 6 vertexes => 2 triangles:
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Cleanup:
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  {
    const vShader = compileShader(gl, vsh, gl.VERTEX_SHADER);
    const fShader = compileShader(gl, fsh, gl.FRAGMENT_SHADER);
    const program = createProgram(gl, vShader, fShader);
    const vertexAttributes = {
      vertexPositionNDC: gl.getAttribLocation(program, 'vertexPositionNDC'),
    };
    const uniforms = {
      colorMap: gl.getUniformLocation(program, 'colorMap'),
    };
    drawFullScreenQuad(gl, program, vertexAttributes, uniforms);
    console.log('got program', program);

    /* gl.blitFramebuffer(
      0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio,
      0, 0, pe.options.width * pe.options.devicePixelRatio, pe.options.height * pe.options.devicePixelRatio,
      gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT, gl.NEAREST
    );

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null); */
  }

  document.body.appendChild(pe.domElement);
  const server = new MesherServer();
  return new THREE.Object3D();
};
export {
  getPreviewMesh,
};
