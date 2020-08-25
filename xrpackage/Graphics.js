import webGlToOpenGl from './modules/webgl-to-opengl.js';

import symbols from './symbols.js';
import utils from './utils.js';
const {hasWebGL2, WebGLStateFramebuffer, WebGLStateRenderBuffer, WebGLStateTextureUnit} = utils;

let {WebGLRenderingContext, WebGL2RenderingContext, CanvasRenderingContext2D} = globalThis;

class WebGLState {
  constructor(gl) {
    this.vao = null;

    this.arrayBuffer = null;
    this.framebuffer = new WebGLStateFramebuffer(gl);
    this.renderbuffer = new WebGLStateRenderBuffer(gl);

    this.blend = false;
    this.cullFace = false;
    this.depthTest = false;
    this.dither = false;
    this.polygonOffsetFill = false;
    this.sampleAlphaToCoverage = false;
    this.sampleCoverageValue = false;
    this.scissorTest = false;
    this.stencilTest = false;

    this.activeTexture = gl.TEXTURE0;

    this.packAlignment = 4;
    this.unpackAlignment = 4;
    this.unpackColorspaceConversion = gl.BROWSER_DEFAULT_WEBGL;
    this.unpackFlipY = 0;
    this.unpackPremultiplyAlpha = 0;

    this.currentProgram = null;
    this.viewport = [0, 0, gl.canvas.width, gl.canvas.height];
    this.scissor = [0, 0, 0, 0];
    this.blendFunc = [gl.ONE, gl.ZERO, gl.ONE, gl.ZERO];
    this.blendEquation = [gl.FUNC_ADD, gl.FUNC_ADD];
    this.blendColor = [0, 0, 0, 0];
    this.colorClearValue = [0, 0, 0, 0];
    this.colorMask = [true, true, true, true];
    this.cullFaceMode = gl.BACK;
    this.depthClearValue = 1;
    this.depthFunc = gl.LESS;
    this.depthRange = [0, 1];
    this.depthMask = true;
    this.frontFace = gl.CCW;
    this.generateMipmapHint = gl.DONT_CARE;
    this.lineWidth = 1;
    this.polygonOffset = [0, 0];
    this.sampleCoverage = [1, false];
    this.stencilFuncBack = [gl.ALWAYS, 0, 0xFFFFFFFF];
    this.stencilOpBack = [gl.KEEP, gl.KEEP, gl.KEEP];
    this.stencilFunc = [gl.ALWAYS, 0, 0xFFFFFFFF];
    this.stencilOp = [gl.KEEP, gl.KEEP, gl.KEEP];
    this.stencilBackWriteMask = 0xFFFFFFFF;
    this.stencilWriteMask = 0xFFFFFFFF;
    this.stencilClearValue = 0;

    const numTextureUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    const textureUnits = Array(numTextureUnits);
    for (let i = 0; i < numTextureUnits; i++) {
      textureUnits[i] = new WebGLStateTextureUnit();
    }
    this.textureUnits = textureUnits;
  }
}

const gls = [window.WebGLRenderingContext, window.WebGL2RenderingContext].map((WebGLRenderingContext, index) => {

if (!WebGLRenderingContext) {
  return WebGLRenderingContext;
}
const isWebGL2 = index === 1;

function ProxiedWebGLRenderingContext(canvas) {
  Object.defineProperty(this, 'canvas', { // Object.defineProperty to avoid proxying
    get() {
      return canvas;
    },
  });
  Object.defineProperty(this, 'drawingBufferWidth', {
    get() {
      return canvas.width;
    },
    // set(w) {}
  });
  Object.defineProperty(this, 'drawingBufferHeight', {
    get() {
      return canvas.height;
    },
    // set(h) {}
  });

  this.state = new WebGLState(canvas.proxyContext);
  this._enabled = {
    blend: true,
    clear: true,
    xrFramebuffer: null,
  };

  if (hasWebGL2) {
    if (this.createVertexArray) {
      const vao = this.createVertexArray();
      this.bindVertexArray(vao);
    } else {
      const extension = this.getExtension('OES_vertex_array_object');
      const vao = extension.createVertexArrayOES();
      extension.bindVertexArrayOES(vao);
    }
  }
}
ProxiedWebGLRenderingContext.prototype = Object.create(WebGLRenderingContext.prototype);

for (const k in WebGLRenderingContext) {
  ProxiedWebGLRenderingContext[k] = WebGLRenderingContext[k];
}
for (const k in WebGLRenderingContext.prototype) {
  const o = Object.getOwnPropertyDescriptor(WebGLRenderingContext.prototype, k);
  if (o.get) {
    o.get = (get => function() {
      return this.canvas.proxyContext[k];
    })(o.get);
    o.set = (set => function(v) {
      this.canvas.proxyContext[k] = v;
    })(o.set);
    Object.defineProperty(ProxiedWebGLRenderingContext.prototype, k, o);
  } else {
    const {value} = o;
    if (typeof value === 'function') {
      if (k === 'drawElements' || k === 'drawArrays' || k === 'drawElementsInstanced' || k === 'drawArraysInstanced' || k === 'clear') {
        ProxiedWebGLRenderingContext.prototype[k] = function() {
          // if (window[symbols.mrDisplaysSymbol].vrDisplay.isPresenting) {
            this.setProxyState();
            return this.canvas.proxyContext[k].apply(this.canvas.proxyContext, arguments);
          // }
        };
      } else if (k === 'texImage2D' || k === 'texSubImage2D') {
        ProxiedWebGLRenderingContext.prototype[k] = function(a, b, c, d, e, f, g, h, i) {
          this.setProxyState();
          if (c === this.canvas.proxyContext.RGBA && h === this.canvas.proxyContext.FLOAT) {
            c = this.canvas.proxyContext.RGBA32F;
            return this.canvas.proxyContext[k].call(this.canvas.proxyContext, a, b, c, d, e, f, g, h, i);
          } else {
            return this.canvas.proxyContext[k].apply(this.canvas.proxyContext, arguments);
          }
        };
      } else {
        ProxiedWebGLRenderingContext.prototype[k] = function() {
          this.setProxyState();
          return this.canvas.proxyContext[k].apply(this.canvas.proxyContext, arguments);
        };
      }
    }
  }
}
ProxiedWebGLRenderingContext.prototype._exokitClear = function _exokitClear() {
  const gl = this.canvas.proxyContext;
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
};
ProxiedWebGLRenderingContext.prototype._exokitClearEnabled = function _exokitClearEnabled(enabled) {
  this._enabled.clear = enabled;
};
ProxiedWebGLRenderingContext.prototype._exokitEnable = function _exokitEnable(flag) {
  const gl = this.canvas.proxyContext;
  gl.enable(flag);
};
ProxiedWebGLRenderingContext.prototype._exokitDisable = function _exokitDisable(flag) {
  const gl = this.canvas.proxyContext;
  gl.disable(flag);
};
ProxiedWebGLRenderingContext.prototype._exokitBlendFuncSeparate = function _exokitBlendFuncSeparate(srcRgb, dstRgb, srcAlpha, dstAlpha) {
  const gl = this.canvas.proxyContext;
  gl.blendFuncSeparate(srcRgb, dstRgb, srcAlpha, dstAlpha);
};
ProxiedWebGLRenderingContext.prototype._exokitBlendEquationSeparate = function _exokitBlendEquationSeparate(rgb, a) {
  const gl = this.canvas.proxyContext;
  gl.blendEquationSeparate(rgb, a);
};
ProxiedWebGLRenderingContext.prototype._exokitBlendColor = function _exokitBlendColor(r, g, b, a) {
  const gl = this.canvas.proxyContext;
  gl.blendColor(r, g, b, a);
};
ProxiedWebGLRenderingContext.prototype._exokitBlendEnabled = function _exokitBlendEnabled(enabled) {
  this._enabled.blend = enabled;
};
ProxiedWebGLRenderingContext.prototype._exokitSetXrFramebuffer = function _exokitSetXrFramebuffer(xrfb) {
  this._enabled.xrFramebuffer = xrfb;
};
class OES_vertex_array_object {
  constructor(gl) {
    this.gl = gl;

    this.VERTEX_ARRAY_BINDING_OES = OES_vertex_array_object.VERTEX_ARRAY_BINDING_OES;
  }
  createVertexArrayOES() {
    return this.gl.canvas.proxyContext.createVertexArray();
  }
  bindVertexArrayOES(vao) {
    this.gl.state.vao = vao;
    return this.gl.canvas.proxyContext.bindVertexArray(vao);
  }
  deleteVertexArrayOES(vao) {
    if (this.gl.state.vao === vao) {
      this.gl.state.vao = null;
    }
    return this.gl.canvas.proxyContext.deleteVertexArray(vao);
  }
  isVertexArrayOES(vao) {
    return this.gl.canvas.proxyContext.isVertexArray(vao);
  }
  static get VERTEX_ARRAY_BINDING_OES() {
    return WebGL2RenderingContext.VERTEX_ARRAY_BINDING;
  }
}
class ANGLE_instanced_arrays {
  constructor(gl) {
    this.gl = gl;
  }
  drawArraysInstancedANGLE(mode, first, count, primcount) {
    return this.gl.canvas.proxyContext.drawArraysInstanced(mode, first, count, primcount);
  }
  drawElementsInstancedANGLE(mode, count, type, offset, primcount) {
    return this.gl.canvas.proxyContext.drawElementsInstanced(mode, count, type, offset, primcount);
  }
  vertexAttribDivisorANGLE(index, divisor) {
    return this.gl.canvas.proxyContext.vertexAttribDivisor(index, divisor);
  }
}
ProxiedWebGLRenderingContext.prototype.getExtension = (_getExtension => function getExtension(name) {
  if (name === 'OES_vertex_array_object') {
    if (hasWebGL2) {
      return new OES_vertex_array_object(this);
    } else {
      return this.canvas.proxyContext.getExtension(name);
    }
  } else if (name === 'ANGLE_instanced_arrays') {
    if (hasWebGL2) {
      return new ANGLE_instanced_arrays(this);
    } else {
      return this.canvas.proxyContext.getExtension(name);
    }
  } else if ([
    'EXT_texture_filter_anisotropic',
    'WEBGL_debug_renderer_info',
    'EXT_disjoint_timer_query',
    'EXT_disjoint_timer_query_webgl2',
    'KHR_parallel_shader_compile',
    'OES_texture_float_linear',
    'OES_texture_float extension',
    'EXT_color_buffer_float',
    'WEBGL_compressed_texture_astc',
    'EXT_texture_compression_bptc',
    'WEBGL_compressed_texture_etc1',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_compressed_texture_pvrtc',
    'WEBKIT_WEBGL_compressed_texture_pvrtc',
  ].includes(name)) {
    return this.canvas.proxyContext.getExtension(name);
  } else if (name === 'WEBGL_depth_texture') {
    return (hasWebGL2 && !isWebGL2) ? {
      UNSIGNED_INT_24_8_WEBGL: this.canvas.proxyContext.UNSIGNED_INT_24_8,
    } : this.canvas.proxyContext.getExtension(name);
  } else if ([ // implicit in WebGL2
    'OES_texture_float',
    'OES_texture_half_float',
    'OES_texture_half_float_linear',
    'OES_standard_derivatives',
    'OES_element_index_uint',
    'EXT_blend_minmax',
    'EXT_frag_depth',
    'WEBGL_draw_buffers',
    'EXT_shader_texture_lod',
  ].includes(name)) {
    return (hasWebGL2 && !isWebGL2) ? {} : this.canvas.proxyContext.getExtension(name);
  } else {
    return null;
  }
})(ProxiedWebGLRenderingContext.prototype.getExtension);
ProxiedWebGLRenderingContext.prototype.enable = (oldEnable => function enable(flag) {
  if (flag !== this.BLEND || this._enabled.blend) {
    oldEnable.apply(this, arguments);
  }
})(ProxiedWebGLRenderingContext.prototype.enable);
ProxiedWebGLRenderingContext.prototype.disable = (oldDisable => function disable(flag) {
  if (flag !== this.BLEND || this._enabled.blend) {
    oldDisable.apply(this, arguments);
  }
})(ProxiedWebGLRenderingContext.prototype.disable);
ProxiedWebGLRenderingContext.prototype.clear = (oldClear => function clear() {
  const gl = this.canvas.proxyContext;
  // if (this._enabled.clear || this.state.framebuffer[gl.DRAW_FRAMEBUFFER] !== null) {
  if (!this._enabled.xrFramebuffer || this.state.framebuffer[gl.DRAW_FRAMEBUFFER] !== this._enabled.xrFramebuffer) {
    oldClear.apply(this, arguments);
  }
})(ProxiedWebGLRenderingContext.prototype.clear);
ProxiedWebGLRenderingContext.prototype.makeXRCompatible = async function makeXRCompatible() {};
function enableDisable(gl, feature, enable, enable2) {
  if (enable !== enable2) {
    if (enable) {
      gl.enable(feature);
    } else {
      gl.disable(feature);
    }
  }
}
function setValue(gl, fn, state, state2) {
  if (state !== state2) {
    fn.call(gl, state);
  }
}
function setKeyValue(gl, fn, key, state, state2) {
  if (state !== state2) {
    fn.call(gl, key, state);
  }
}
function setArray2(gl, fn, state, state2) {
  if (state[0] !== state2[0] || state[1] !== state2[1]) {
    fn.call(gl, state[0], state[1]);
  }
}
function setArray4(gl, fn, state, state2) {
  if (state[0] !== state2[0] || state[1] !== state2[1] || state[2] !== state2[2] || state[3] !== state2[3]) {
    fn.call(gl, state[0], state[1], state[2], state[3]);
  }
}
function setKeyArray3(gl, fn, key, state, state2) {
  if (state[0] !== state2[0] || state[1] !== state2[1] || state[2] !== state2[2]) {
    fn.call(gl, key, state[0], state[1], state[2]);
  }
}
function setTextureUnits(gl, state, state2) {
  let lastActiveTexture = -1;
  for (let i = state.textureUnits.length - 1; i >= 0; i--) {
    const textureUnit = state.textureUnits[i];
    const textureUnit2 = state2.textureUnits[i];
    const texture2DDiff = textureUnit.texture2D !== textureUnit2.texture2D;
    const textureCubemapDiff = textureUnit.textureCubemap !== textureUnit2.textureCubemap;
    if (texture2DDiff || textureCubemapDiff) {
      gl.activeTexture(lastActiveTexture = gl.TEXTURE0 + i);
      if (texture2DDiff) {
        gl.bindTexture(gl.TEXTURE_2D, textureUnit.texture2D);
      }
      if (textureCubemapDiff) {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, textureUnit.textureCubemap);
      }
    }
  }
  if (state.activeTexture !== lastActiveTexture) {
    gl.activeTexture(state.activeTexture);
  }
}
ProxiedWebGLRenderingContext.prototype.setProxyState = function setProxyState() {
  const gl = this.canvas.proxyContext;
  if (gl.binding !== this) {
    const {state} = this;
    const state2 = gl.binding ? gl.binding.state : new WebGLState(gl);

    if (hasWebGL2) {
      setValue(gl, gl.bindVertexArray, state.vao, state2.vao);
    }

    setKeyValue(gl, gl.bindBuffer, gl.ARRAY_BUFFER, state.arrayBuffer, state2.arrayBuffer);
    setKeyValue(gl, gl.bindRenderbuffer, gl.RENDERBUFFER, state.renderbuffer[gl.RENDERBUFFER], state2.renderbuffer[gl.RENDERBUFFER]);
    if (hasWebGL2) {
      setKeyValue(gl, gl.bindFramebuffer, gl.READ_FRAMEBUFFER, state.framebuffer[gl.READ_FRAMEBUFFER], state2.framebuffer[gl.READ_FRAMEBUFFER]);
      setKeyValue(gl, gl.bindFramebuffer, gl.DRAW_FRAMEBUFFER, state.framebuffer[gl.DRAW_FRAMEBUFFER], state2.framebuffer[gl.DRAW_FRAMEBUFFER]);
    } else {
      setKeyValue(gl, gl.bindFramebuffer, gl.FRAMEBUFFER, state.framebuffer[gl.FRAMEBUFFER], state2.framebuffer[gl.FRAMEBUFFER]);
    }

    if (this._enabled.blend) {
      enableDisable(gl, gl.BLEND, state.blend, state2.blend);
    }
    enableDisable(gl, gl.CULL_FACE, state.cullFace, state2.cullFace);
    enableDisable(gl, gl.DEPTH_TEST, state.depthTest, state2.depthTest);
    enableDisable(gl, gl.DITHER, state.dither, state2.dither);
    enableDisable(gl, gl.POLYGON_OFFSET_FILL, state.polygonOffsetFill, state2.polygonOffsetFill);
    enableDisable(gl, gl.SAMPLE_ALPHA_TO_COVERAGE, state.sampleAlphaToCoverage, state2.sampleAlphaToCoverage);
    enableDisable(gl, gl.SAMPLE_COVERAGE, state.sampleCoverageValue, state2.sampleCoverageValue);
    enableDisable(gl, gl.SCISSOR_TEST, state.scissorTest, state2.scissorTest);
    enableDisable(gl, gl.STENCIL_TEST, state.stencilTest, state2.stencilTest);

    setKeyValue(gl, gl.pixelStorei, gl.PACK_ALIGNMENT, state.packAlignment, state2.packAlignment);
    setKeyValue(gl, gl.pixelStorei, gl.UNPACK_ALIGNMENT, state.unpackAlignment, state2.unpackAlignment);
    setKeyValue(gl, gl.pixelStorei, gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, state.unpackColorspaceConversion, state2.unpackColorspaceConversion);
    setKeyValue(gl, gl.pixelStorei, gl.UNPACK_FLIP_Y_WEBGL, state.unpackFlipY, state2.unpackFlipY);
    setKeyValue(gl, gl.pixelStorei, gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, state.unpackPremultiplyAlpha, state2.unpackPremultiplyAlpha);

    setValue(gl, gl.useProgram, state.currentProgram, state2.currentProgram);

    setArray4(gl, gl.viewport, state.viewport, state2.viewport);
    setArray4(gl, gl.scissor, state.scissor, state2.scissor);
    if (this._enabled.blend) {
      setArray4(gl, gl.blendFunc, state.blendFunc, state2.blendFunc);
      setArray2(gl, gl.blendEquationSeparate, state.blendEquation, state2.blendEquation);
      setArray4(gl, gl.blendColor, state.blendColor, state2.blendColor);
    }
    setArray4(gl, gl.clearColor, state.colorClearValue, state2.colorClearValue);
    setArray4(gl, gl.colorMask, state.colorMask, state2.colorMask);
    setValue(gl, gl.cullFace, state.cullFaceMode, state2.cullFaceMode);
    setValue(gl, gl.clearDepth, state.depthClearValue, state2.depthClearValue);
    setValue(gl, gl.depthFunc, state.depthFunc, state2.depthFunc);
    setArray4(gl, gl.depthRange, state.depthRange, state2.depthRange);
    setValue(gl, gl.depthMask, state.depthMask, state2.depthMask);
    // setValue(gl, gl.frontFace, state.frontFace, state2.frontFace);
    gl.frontFace(state.frontFace); // XXX initial value is not captured connectly
    setKeyValue(gl, gl.hint, gl.GENERATE_MIPMAP_HINT, state.generateMipmapHint, state2.generateMipmapHint);
    setValue(gl, gl.lineWidth, state.lineWidth, state2.lineWidth);
    setArray2(gl, gl.polygonOffset, state.polygonOffset, state2.polygonOffset);
    setArray2(gl, gl.sampleCoverage, state.sampleCoverage, state2.sampleCoverage);
    setKeyArray3(gl, gl.stencilFuncSeparate, gl.BACK, state.stencilFuncBack, state2.stencilFuncBack);
    setKeyArray3(gl, gl.stencilFuncSeparate, gl.FRONT, state.stencilFunc, state2.stencilFunc);
    setKeyArray3(gl, gl.stencilOpSeparate, gl.BACK, state.stencilOpBack, state2.stencilOpBack);
    setKeyArray3(gl, gl.stencilOpSeparate, gl.FRONT, state.stencilOp, state2.stencilOp);
    setKeyValue(gl, gl.stencilMaskSeparate, gl.BACK, state.stencilBackWriteMask, state2.stencilBackWriteMask);
    setKeyValue(gl, gl.stencilMaskSeparate, gl.FRONT, state.stencilWriteMask, state2.stencilWriteMask);
    setValue(gl, gl.clearStencil, state.stencilClearValue, state2.stencilClearValue);

    setTextureUnits(gl, state, state2);

    gl.binding = this;
  }
};
ProxiedWebGLRenderingContext.prototype.destroy = function destroy() {
  // nothing
};

// state memoization

if (WebGLRenderingContext.prototype.bindVertexArray) {
  ProxiedWebGLRenderingContext.prototype.bindVertexArray = (_bindVertexArray => function bindVertexArray(vao) {
    this.state.vao = vao;
    return _bindVertexArray.apply(this, arguments);
  })(ProxiedWebGLRenderingContext.prototype.bindVertexArray);
  ProxiedWebGLRenderingContext.prototype.deleteVertexArray = (_deleteVertexArray => function deleteVertexArray(vao) {
    if (this.state.vao === vao) {
      this.state.vao = null;
    }
    return _deleteVertexArray.apply(this, arguments);
  })(ProxiedWebGLRenderingContext.prototype.deleteVertexArray);
}
/* ProxiedWebGLRenderingContext.prototype.getExtension = (_getExtension => function getExtension(name) {
  const gl = this;
  const extension = _getExtension.apply(this, arguments);
  if (name === 'OES_vertex_array_object' && !extension.bindVertexArrayOES._bound) {
    extension.bindVertexArrayOES = (_bindVertexArrayOES => function bindVertexArrayOES(vao) {
      gl.state.vao = vao;
      return _bindVertexArrayOES.apply(this, arguments);
    })(extension.bindVertexArrayOES);
    extension.bindVertexArrayOES._bound = true;
  }
  return extension;
})(WebGLRenderingContext.prototype.getExtension); */
ProxiedWebGLRenderingContext.prototype.bindBuffer = (_bindBuffer => function bindBuffer(target, b) {
  if (target === this.ARRAY_BUFFER) {
    this.state.arrayBuffer = b;
  }
  return _bindBuffer.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.bindBuffer);
ProxiedWebGLRenderingContext.prototype.deleteBuffer = (_deleteBuffer => function deleteBuffer(b) {
  if (this.state.arrayBuffer === b) {
    this.state.arrayBuffer = null;
  }
  return _deleteBuffer.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.deleteBuffer);
ProxiedWebGLRenderingContext.prototype.bindRenderbuffer = (_bindRenderbuffer => function bindRenderbuffer(target, rbo) {
  this.state.renderbuffer[target] = rbo;
  return _bindRenderbuffer.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.bindRenderbuffer);
ProxiedWebGLRenderingContext.prototype.deleteRenderbuffer = (_deleteRenderbuffer => function deleteRenderbuffer(rbo) {
  for (const k in this.state.renderbuffer) {
    if (this.state.renderbuffer[k] === rbo) {
      this.state.renderbuffer[k] = null;
    }
  }
  return _deleteRenderbuffer.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.deleteRenderbuffer);
ProxiedWebGLRenderingContext.prototype.bindFramebuffer = (_bindFramebuffer => function bindFramebuffer(target, fbo) {
  const gl = this.canvas.proxyContext;
  if (hasWebGL2 && target === gl.FRAMEBUFFER) {
    this.state.framebuffer[gl.READ_FRAMEBUFFER] = fbo;
    this.state.framebuffer[gl.DRAW_FRAMEBUFFER] = fbo;
  } else {
    this.state.framebuffer[target] = fbo;
  }
  return _bindFramebuffer.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.bindFramebuffer);
ProxiedWebGLRenderingContext.prototype.deleteFramebuffer = (_deleteFramebuffer => function deleteFramebuffer(fbo) {
  for (const k in this.state.framebuffer) {
    if (this.state.framebuffer[k] === fbo) {
      this.state.framebuffer[k] = null;
    }
  }
  return _deleteFramebuffer.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.deleteFramebuffer);
const targetStateKeys = {
  [WebGLRenderingContext.BLEND]: 'blend',
  [WebGLRenderingContext.CULL_FACE]: 'cullFace',
  [WebGLRenderingContext.DEPTH_TEST]: 'depthTest',
  [WebGLRenderingContext.DITHER]: 'dither',
  [WebGLRenderingContext.POLYGON_OFFSET_FILL]: 'polygonOffsetFill',
  [WebGLRenderingContext.SAMPLE_ALPHA_TO_COVERAGE]: 'sampleAlphaToCoverage',
  [WebGLRenderingContext.SAMPLE_COVERAGE]: 'sampleCoverage',
  [WebGLRenderingContext.SCISSOR_TEST]: 'scissorTest',
  [WebGLRenderingContext.STENCIL_TEST]: 'stencilTest',
  [WebGLRenderingContext.PACK_ALIGNMENT]: 'packAlignment',
  [WebGLRenderingContext.UNPACK_ALIGNMENT]: 'unpackAlignment',
  [WebGLRenderingContext.UNPACK_COLORSPACE_CONVERSION_WEBGL]: 'unpackColorspaceConversion',
  [WebGLRenderingContext.UNPACK_FLIP_Y_WEBGL]: 'unpackFlipY',
  [WebGLRenderingContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL]: 'unpackPremultiplyAlpha',
  [WebGLRenderingContext.GENERATE_MIPMAP_HINT]: 'generateMipmapHint',
};
ProxiedWebGLRenderingContext.prototype.enable = (_enable => function enable(target) {
  const stateKey = targetStateKeys[target];
  if (stateKey !== undefined) {
    this.state[stateKey] = true;
  }
  return _enable.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.enable);
ProxiedWebGLRenderingContext.prototype.disable = (_disable => function disable(target) {
  const stateKey = targetStateKeys[target];
  if (stateKey !== undefined) {
    this.state[stateKey] = false;
  }
  return _disable.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.disable);
ProxiedWebGLRenderingContext.prototype.activeTexture = (_activeTexture => function activeTexture(slot) {
  this.state.activeTexture = slot;
  return _activeTexture.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.activeTexture);
ProxiedWebGLRenderingContext.prototype.pixelStorei = (_pixelStorei => function pixelStorei(name, value) {
  const stateKey = targetStateKeys[name];
  if (stateKey !== undefined) {
    this.state[stateKey] = value;
  }
  return _pixelStorei.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.pixelStorei);
ProxiedWebGLRenderingContext.prototype.useProgram = (_useProgram => function useProgram(program) {
  this.state.currentProgram = program;
  return _useProgram.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.useProgram);
ProxiedWebGLRenderingContext.prototype.deleteProgram = (_deleteProgram => function deleteProgram(program) {
  if (this.state.currentProgram === program) {
    this.state.currentProgram = null;
  }
  return _deleteProgram.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.deleteProgram);
ProxiedWebGLRenderingContext.prototype.viewport = (_viewport => function viewport(x, y, w, h) {
  this.state.viewport[0] = x;
  this.state.viewport[1] = y;
  this.state.viewport[2] = w;
  this.state.viewport[3] = h;
  return _viewport.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.viewport);
ProxiedWebGLRenderingContext.prototype.scissor = (_scissor => function scissor(x, y, w, h) {
  this.state.scissor[0] = x;
  this.state.scissor[1] = y;
  this.state.scissor[2] = w;
  this.state.scissor[3] = h;
  return _scissor.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.scissor);
ProxiedWebGLRenderingContext.prototype.blendFunc = (_blendFunc => function blendFunc(blendSrc, blendDst) {
  this.state.blendFunc[0] = blendSrc;
  this.state.blendFunc[1] = blendDst;
  this.state.blendFunc[2] = blendSrc;
  this.state.blendFunc[3] = blendDst;
  if (this._enabled.blend) {
    return _blendFunc.apply(this, arguments);
  }
})(ProxiedWebGLRenderingContext.prototype.blendFunc);
ProxiedWebGLRenderingContext.prototype.blendFuncSeparate = (_blendFuncSeparate => function blendFuncSeparate(blendSrcRgb, blendDstRgb, blendSrcAlpha, blendDstAlpha) {
  this.state.blendFunc[0] = blendSrcRgb;
  this.state.blendFunc[1] = blendDstRgb;
  this.state.blendFunc[2] = blendSrcAlpha;
  this.state.blendFunc[3] = blendDstAlpha;
  if (this._enabled.blend) {
    return _blendFuncSeparate.apply(this, arguments);
  }
})(ProxiedWebGLRenderingContext.prototype.blendFuncSeparate);
ProxiedWebGLRenderingContext.prototype.blendEquation = (_blendEquation => function blendEquation(blendEquation) {
  this.state.blendEquation[0] = blendEquation;
  this.state.blendEquation[1] = blendEquation;
  if (this._enabled.blend) {
    return _blendEquation.apply(this, arguments);
  }
})(ProxiedWebGLRenderingContext.prototype.blendEquation);
ProxiedWebGLRenderingContext.prototype.blendEquationSeparate = (_blendEquationSeparate => function blendEquationSeparate(blendEquationRgb, blendEquationAlpha) {
  this.state.blendEquation[0] = blendEquationRgb;
  this.state.blendEquation[1] = blendEquationAlpha;
  if (this._enabled.blend) {
    return _blendEquationSeparate.apply(this, arguments);
  }
})(ProxiedWebGLRenderingContext.prototype.blendEquationSeparate);
ProxiedWebGLRenderingContext.prototype.blendColor = (_blendColor => function blendColor(r, g, b, a) {
  this.state.blendColor[0] = r;
  this.state.blendColor[1] = g;
  this.state.blendColor[2] = b;
  this.state.blendColor[3] = a;
  if (this._enabled.blend) {
    return _blendColor.apply(this, arguments);
  }
})(ProxiedWebGLRenderingContext.prototype.blendColor);
ProxiedWebGLRenderingContext.prototype.clearColor = (_clearColor => function clearColor(r, g, b, a) {
  this.state.colorClearValue[0] = r;
  this.state.colorClearValue[1] = g;
  this.state.colorClearValue[2] = b;
  this.state.colorClearValue[3] = a;
  return _clearColor.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.clearColor);
ProxiedWebGLRenderingContext.prototype.colorMask = (_colorMask => function colorMask(r, g, b, a) {
  this.state.colorMask[0] = r;
  this.state.colorMask[1] = g;
  this.state.colorMask[2] = b;
  this.state.colorMask[3] = a;
  return _colorMask.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.colorMask);
ProxiedWebGLRenderingContext.prototype.cullFace = (_cullFace => function cullFace(cullFaceMode) {
  this.state.cullFaceMode = cullFaceMode;
  return _cullFace.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.cullFace);
ProxiedWebGLRenderingContext.prototype.clearDepth = (_clearDepth => function clearDepth(depthClearValue) {
  this.state.depthClearValue = depthClearValue;
  return _clearDepth.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.clearDepth);
ProxiedWebGLRenderingContext.prototype.depthFunc = (_depthFunc => function depthFunc(df) {
  this.state.depthFunc = df;
  return _depthFunc.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.depthFunc);
ProxiedWebGLRenderingContext.prototype.depthRange = (_depthRange => function depthRange(near, far) {
  this.state.depthRange[0] = near;
  this.state.depthRange[1] = far;
  return _depthRange.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.depthRange);
ProxiedWebGLRenderingContext.prototype.depthMask = (_depthMask => function depthMask(dm) {
  this.state.depthMask = dm;
  return _depthMask.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.depthMask);
ProxiedWebGLRenderingContext.prototype.frontFace = (_frontFace => function frontFace(ff) {
  this.state.frontFace = ff;
  return _frontFace.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.frontFace);
ProxiedWebGLRenderingContext.prototype.hint = (_hint => function hint(target, value) {
  const stateKey = targetStateKeys[target];
  if (stateKey !== undefined) {
    this.state[stateKey] = value;
  }
  return _hint.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.hint);
ProxiedWebGLRenderingContext.prototype.lineWidth = (_lineWidth => function lineWidth(lw) {
  this.state.lineWidth = lw;
  return _lineWidth.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.lineWidth);
ProxiedWebGLRenderingContext.prototype.polygonOffset = (_polygonOffset => function polygonOffset(polygonOffsetFactor, polygonOffsetUnits) {
  this.state.polygonOffset[0] = polygonOffsetFactor;
  this.state.polygonOffset[1] = polygonOffsetUnits;
  return _polygonOffset.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.polygonOffset);
ProxiedWebGLRenderingContext.prototype.sampleCoverage = (_sampleCoverage => function sampleCoverage(sampleCoverageValue, sampleCoverageUnits) {
  this.state.sampleCoverage[0] = sampleCoverageValue;
  this.state.sampleCoverage[1] = sampleCoverageUnits;
  return _sampleCoverage.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.sampleCoverage);
ProxiedWebGLRenderingContext.prototype.stencilFunc = (_stencilFunc => function stencilFunc(func, ref, mask) {
  this.state.stencilFuncBack[0] = func;
  this.state.stencilFuncBack[1] = ref;
  this.state.stencilFuncBack[2] = mask;

  this.state.stencilFunc[0] = func;
  this.state.stencilFunc[1] = ref;
  this.state.stencilFunc[2] = mask;

  return _stencilFunc.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.stencilFunc);
ProxiedWebGLRenderingContext.prototype.stencilFuncSeparate = (_stencilFuncSeparate => function stencilFuncSeparate(face, func, ref, mask) {
  if (face === this.BACK) {
    this.state.stencilFuncBack[0] = func;
    this.state.stencilFuncBack[1] = ref;
    this.state.stencilFuncBack[2] = mask;
  } else if (face === this.FRONT) {
    this.state.stencilFunc[0] = func;
    this.state.stencilFunc[1] = ref;
    this.state.stencilFunc[2] = mask;
  }
  return _stencilFuncSeparate.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.stencilFuncSeparate);
ProxiedWebGLRenderingContext.prototype.stencilOp = (_stencilOp => function stencilOp(fail, zfail, zpass) {
  this.state.stencilOpBack[0] = fail;
  this.state.stencilOpBack[1] = zfail;
  this.state.stencilOpBack[2] = zpass;

  this.state.stencilOp[0] = fail;
  this.state.stencilOp[1] = zfail;
  this.state.stencilOp[2] = zpass;

  return _stencilOp.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.stencilOp);
ProxiedWebGLRenderingContext.prototype.stencilOpSeparate = (_stencilOpSeparate => function stencilOpSeparate(face, fail, zfail, zpass) {
  if (face === this.BACK) {
    this.state.stencilOpBack[0] = fail;
    this.state.stencilOpBack[1] = zfail;
    this.state.stencilOpBack[2] = zpass;
  } else if (face === this.FRONT) {
    this.state.stencilOp[0] = fail;
    this.state.stencilOp[1] = zfail;
    this.state.stencilOp[2] = zpass;
  }
  return _stencilOpSeparate.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.stencilOpSeparate);
ProxiedWebGLRenderingContext.prototype.stencilMask = (_stencilMask => function stencilMask(face, mask) {
  this.state.stencilBackWriteMask = mask;
  this.state.stencilWriteMask = mask;
  return _stencilMask.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.stencilMask);
ProxiedWebGLRenderingContext.prototype.stencilMaskSeparate = (_stencilMaskSeparate => function stencilMaskSeparate(face, mask) {
  if (face === this.BACK) {
    this.state.stencilBackWriteMask = mask;
  } else if (face === this.FRONT) {
    this.state.stencilWriteMask = mask;
  }
  return _stencilMaskSeparate.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.stencilMaskSeparate);
ProxiedWebGLRenderingContext.prototype.clearStencil = (_clearStencil => function stencilClearValue(stencilClearValue) {
  this.state.stencilClearValue = stencilClearValue;
  return _clearStencil.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.clearStencil);
ProxiedWebGLRenderingContext.prototype.bindTexture = (_bindTexture => function bindTexture(target, texture) {
  if (target === this.TEXTURE_2D) {
    this.state.textureUnits[this.state.activeTexture - this.TEXTURE0].texture2D = texture;
  } else if (target === this.TEXTURE_CUBE_MAP) {
    this.state.textureUnits[this.state.activeTexture - this.TEXTURE0].textureCubemap = texture;
  }
  return _bindTexture.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.bindTexture);

ProxiedWebGLRenderingContext.prototype.deleteTexture = (_deleteTexture => function deleteTexture(texture) {
  for (let i = 0; i < this.state.textureUnits.length; i++) {
    const textureUnit = this.state.textureUnits[i];
    if (textureUnit.texture2D === texture) {
      textureUnit.texture2D = null;
    }
    if (textureUnit.textureCubemap === texture) {
      textureUnit.textureCubemap = null;
    }
  }
  return _deleteTexture.apply(this, arguments);
})(ProxiedWebGLRenderingContext.prototype.deleteTexture);

// WebGL1 -> WebGL2 translations
if (hasWebGL2 && WebGLRenderingContext.name === 'WebGLRenderingContext') {
  const glslVersion = '300 es';
  ProxiedWebGLRenderingContext.prototype.createShader = (_createShader => function createShader(type) {
    const result = _createShader.call(this, type);
    result.type = type;
    return result;
  })(ProxiedWebGLRenderingContext.prototype.createShader);
  ProxiedWebGLRenderingContext.prototype.shaderSource = (_shaderSource => function shaderSource(shader, source) {
    if (shader.type === this.VERTEX_SHADER) {
      // const oldSource = source;
      source = webGlToOpenGl.vertex(source, glslVersion);
      // console.log('change source 1', this, oldSource, source);
    } else if (shader.type === this.FRAGMENT_SHADER) {
      // const oldSource = source;
      source = webGlToOpenGl.fragment(source, glslVersion);
      // console.log('change source 2', this, oldSource, source);
    }
    return _shaderSource.call(this, shader, source);
  })(ProxiedWebGLRenderingContext.prototype.shaderSource);
  ProxiedWebGLRenderingContext.prototype.getActiveAttrib = (_getActiveAttrib => function getActiveAttrib(program, index) {
    let result = _getActiveAttrib.call(this, program, index);
    if (result) {
      result = {
        size: result.size,
        type: result.type,
        name: webGlToOpenGl.unmapName(result.name),
      };
    }
    return result;
  })(ProxiedWebGLRenderingContext.prototype.getActiveAttrib);
  ProxiedWebGLRenderingContext.prototype.getActiveUniform = (_getActiveUniform => function getActiveUniform(program, index) {
    let result = _getActiveUniform.call(this, program, index);
    if (result) {
      result = {
        size: result.size,
        type: result.type,
        name: webGlToOpenGl.unmapName(result.name),
      };
    }
    return result;
  })(ProxiedWebGLRenderingContext.prototype.getActiveUniform);
  ProxiedWebGLRenderingContext.prototype.getAttribLocation = (_getAttribLocation => function getAttribLocation(program, path) {
    path = webGlToOpenGl.mapName(path);
    return _getAttribLocation.call(this, program, path);
  })(ProxiedWebGLRenderingContext.prototype.getAttribLocation);
  ProxiedWebGLRenderingContext.prototype.getUniformLocation = (_getUniformLocation => function getUniformLocation(program, path) {
    path = webGlToOpenGl.mapName(path);
    return _getUniformLocation.call(this, program, path);
  })(ProxiedWebGLRenderingContext.prototype.getUniformLocation);
}

return ProxiedWebGLRenderingContext;

});

const getContext = (oldGetContext => function getContext(type, init = {}) {
  const askedForWebGLType = /^(?:experimental-)?webgl2?$/.test(type);
  if (askedForWebGLType) {
    const canvas = this;
    const gl = (() => {
      // const match = type.match(/^(?:experimental-)?(webgl2?)$/);
      // const askedForWebGL2 = !!match && (hasWebGL2 || match[1] !== 'webgl2');
      const askedForWebGL2 = /^(?:experimental-)?webgl2$/.test(type);
      if (askedForWebGL2) {
        if (hasWebGL2) {
          // nothing
        } else {
          return null;
        }
      }
      if (!canvas.proxyContext) {
        canvas.proxyContext = HTMLCanvasElement.proxyContext;
      }
      const [WebGLRenderingContext, WebGL2RenderingContext] = gls;
      const gl = askedForWebGL2 ? new WebGL2RenderingContext(canvas) : new WebGLRenderingContext(canvas);
      return gl;
    })();
    if (gl) {
      canvas.getContext = function getContext() {
        return gl;
      };
      canvas.toBlob = function toBlob(cb, type, quality) {
        const canvas2 = document.createElement('canvas');
        canvas2.width = canvas.width;
        canvas2.height = canvas.height;
        const ctx2 = oldGetContext.call(canvas2, '2d');
        ctx2.drawImage(
          this.proxyContext.canvas,
          0, this.proxyContext.canvas.height - canvas2.height, canvas.width, canvas.height,
          0, 0, canvas.width, canvas.height
        );
        return canvas2.toBlob(cb, type, quality);
      };
    }
    return gl;
  } else {
    return oldGetContext.call(this, type, init);
  }
})(HTMLCanvasElement.prototype.getContext);

const hijackCanvas = proxyContext => {

HTMLCanvasElement.proxyContext = proxyContext;
HTMLCanvasElement.prototype.getContext = getContext;
Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', {
  get() {
    return this.width;
  },
});
Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', {
  get() {
    return this.height;
  },
});
/* HTMLCanvasElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  const {canvasViewport} = this.session.xrState;
  return new DOMRect(canvasViewport[0], canvasViewport[1], canvasViewport[2], canvasViewport[3]);
}; */

WebGLRenderingContext = gls[0];
WebGL2RenderingContext = gls[1];

};

const getExports = () => ({
  getContext,
  WebGLRenderingContext,
  WebGL2RenderingContext,
  CanvasRenderingContext2D,
});

export {
  hijackCanvas,
  getExports,
};
