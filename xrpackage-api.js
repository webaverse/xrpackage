import * as THREE from './xrpackage/three.module.js';
import wbn from './xrpackage/wbn.js';
import { GLTFLoader } from './xrpackage/loaders/GLTFLoader.js';
import { VOXLoader } from './xrpackage/loaders/VOXLoader.js';
import Avatar from './xrpackage/avatars/avatars.js';
import utils from './xrpackage/utils.js';
import { xrTypeLoaders } from './xrTypes.js';
import { XRPackageEngine } from './xrpackage-engine.js';

const { requestSw } = utils;
const apiHost = `https://ipfs.exokit.org/ipfs`;
const primaryUrl = `https://xrpackage.org`;

const localMatrix = new THREE.Matrix4();
const localArray = Array(16);

const _removeUrlTail = u => u.replace(/(?:\?|\#).*$/, '');

const _cloneBundle = (bundle, options = {}) => {
  const except = options.except || [];
  const urlSpec = new URL(bundle.primaryURL);
  const primaryUrl = urlSpec.origin;
  const startUrl = urlSpec.pathname.replace(/^\//, '');
  const builder = new wbn.BundleBuilder(primaryUrl + '/' + startUrl);
  for (const u of bundle.urls) {
    const {pathname} = new URL(u);
    if (!except.includes(pathname)) {
      const res = bundle.getResponse(u);
      const type = res.headers['content-type'];
      const data = res.body;
      builder.addExchange(primaryUrl + pathname, 200, {
        'Content-Type': type,
      }, data);
    }
  }
  return builder;
};

let packageIds = 0;

export class XRPackage extends EventTarget {
  constructor(a) {
    super();

    this.id = ++packageIds;
    this.name = '';
    this.type = '';
    this.main = '';
    this.schema = {};
    this.details = {};

    this.matrix = a instanceof XRPackage ? a.matrix.clone() : new THREE.Matrix4();
    this.matrixWorldNeedsUpdate = true;
    this._visible = true;
    this.parent = null;
    this.context = {};
    this.loaded = false;

    if (a instanceof XRPackage) {
      this.data = a.data;
      this.files = a.files.slice();
    } else {
      this.data = a;

      const bundle = new wbn.Bundle(a);
      const files = [];
      for (const url of bundle.urls) {
        const response = bundle.getResponse(url);
        files.push({
          url,
          response,
        });
      }
      this.files = files;
    }

    this.load();
  }
  load() {
    const j = this.getManifestJson();
    if (j) {
      if (j && typeof j.xr_type === 'string' && typeof j.start_url === 'string') {
        let {
          name,
          xr_type: xrType,
          start_url: startUrl,
          xr_details: xrDetails,
        } = j;
        if (xrDetails === undefined || (typeof xrDetails === 'object' && !Array.isArray(xrDetails))) {
          xrDetails = xrDetails || {};
        } else {
          throw new Error('invalid xr_details in manifest.json');
        }
        let schema;
        if (xrDetails.schema !== undefined && typeof xrDetails.schema === 'object' && !Array.isArray(xrDetails.schema) && Object.keys(xrDetails.schema).every(k => {
          const spec = xrDetails.schema[k];
          return spec && spec.type === 'string' && (spec.default === undefined || typeof spec.default === 'string');
        })) {
          schema = {};
          for (const k in xrDetails.schema) {
            schema[k] = xrDetails.schema[k].default || '';
          }
        } else {
          schema = {};
        }
        let events;
        if (xrDetails.events !== undefined && typeof xrDetails.events === 'object' && !Array.isArray(xrDetails.events) && Object.keys(xrDetails.events).every(k => {
          const spec = xrDetails.events[k];
          return spec && spec.type === 'string';
        })) {
          events = Object.keys(xrDetails.events).map(name => {
            const spec = xrDetails.events[name];
            const {type} = spec;
            return {
              name,
              type,
            };
          });
        } else {
          events = [];
        }

        const loader = xrTypeLoaders[xrType];
        if (loader) {
          this.name = name;
          this.type = xrType;
          this.main = startUrl;
          this.schema = schema;
          this.events = events;
          this.details = xrDetails;

          XRPackageEngine.waitForLoad()
            .then(() => requestSw({
              method: 'hijack',
              id: this.id,
              startUrl: _removeUrlTail(startUrl),
              script: xrDetails ? xrDetails.script : null,
              files: this.files.map(f => ({
                pathname: new URL(f.url).pathname,
                headers: f.response.headers,
                body: f.response.body,
              })),
            }))
            .then(() => loader(this))
            .then(o => {
              this.loaded = true;
              this.dispatchEvent(new MessageEvent('load', {
                data: {
                  type: this.type,
                  object: o,
                },
              }));
            });
        } else {
          throw new Error(`unknown xr_type: ${xrType}`);
        }
      } else {
        throw new Error('could not find xr_type and start_url in manifest.json');
      }
    } else {
      throw new Error('no manifest.json in pack');
    }
  }
  clone() {
    return new XRPackage(this);
  }
  async waitForLoad() {
    if (!this.loaded) {
      await new Promise((accept, reject) => {
        this.addEventListener('load', e => {
          accept();
        }, {once: true});
      });
    }
  }
  get visible() {
    return this._visible;
  }
  set visible(visible) {
    this._visible = visible;

    const o = this.context.object;
    if (o) {
      o.visible = visible;
    }
  }
  setSchema(key, value) {
    this.schema[key] = value;
    this.context.iframe && this.context.iframe.contentWindow.xrpackage.setSchema(key, value);
  }
  sendEvent(name, value) {
    if (this.events.some(e => e.name === name)) {
      this.context.iframe && this.context.iframe.contentWindow.xrpackage.sendEvent(name, value);
    }
  }
  async reload() {
    const {parent} = this;
    if (parent) {
      parent.remove(this);
      await parent.add(this);
    }
  }
  getManifestJson() {
    const manifestJsonFile = this.files.find(file => new URL(file.url).pathname === '/manifest.json');
    if (manifestJsonFile) {
      const s = manifestJsonFile.response.body.toString('utf8');
      const j = JSON.parse(s);
      return j;
    } else {
      return null;
    }
  }
  getMainData() {
    const mainPath = '/' + this.main;
    const mainFile = this.files.find(file => new URL(file.url).pathname === mainPath);
    return mainFile.response.body;
  }
  addFile(pathname, data = '', type = 'application/octet-stream') {
    let bundle = new wbn.Bundle(this.data);
    const builder = _cloneBundle(bundle, {
      except: ['/' + pathname],
    });
    builder.addExchange(primaryUrl + '/' + pathname, 200, {
      'Content-Type': type,
    }, data);
    this.data = builder.createBundle();
    bundle = new wbn.Bundle(this.data);

    const files = [];
    for (const url of bundle.urls) {
      const response = bundle.getResponse(url);
      files.push({
        url,
        response,
      });
    }
    this.files = files;
  }
  removeFile(pathname) {
    let bundle = new wbn.Bundle(this.data);
    const builder = _cloneBundle(bundle, {
      except: ['/' + pathname],
    });
    this.data = builder.createBundle();
    bundle = new wbn.Bundle(this.data);

    const files = [];
    for (const url of bundle.urls) {
      const response = bundle.getResponse(url);
      files.push({
        url,
        response,
      });
    }
    this.files = files;
  }
  static async compileFromFile(file) {
    const _createFile = async (file, xrType, mimeType) => {
      const fileData = await new Promise((accept, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          accept(new Uint8Array(reader.result));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
      return this.compileRaw(
        [
          {
            url: '/' + file.name,
            type: mimeType,
            data: fileData,
          },
          {
            url: '/manifest.json',
            type: 'application/json',
            data: JSON.stringify({
              xr_type: xrType,
              start_url: file.name,
            }, null, 2),
          }
        ]
      );
    };

    if (/\.gltf$/.test(file.name)) {
      return await _createFile(file, 'gltf@0.0.1', 'model/gltf+json');
    } else if (/\.glb$/.test(file.name)) {
      return await _createFile(file, 'gltf@0.0.1', 'application/octet-stream')
    } else if (/\.vrm$/.test(file.name)) {
      return await _createFile(file, 'vrm@0.0.1', 'application/octet-stream');
    } else if (/\.html$/.test(file.name)) {
      return await _createFile(file, 'webxr-site@0.0.1', 'text/html');
    } else if (/\.wbn$/.test(file.name)) {
      const arrayBuffer = await new Promise((accept, reject) => {
        const fr = new FileReader();
        fr.readAsArrayBuffer(file);
        fr.onload = () => {
          accept(fr.result);
        };
        fr.onerror = reject;
      });
      const uint8Array = new Uint8Array(arrayBuffer);
      return uint8Array;
    } else {
      throw new Error(`unknown file type: ${file.type}`);
    }
  }
  static compileRaw(files) {
    const manifestFile = files.find(file => file.url === '/manifest.json');
    const j = JSON.parse(manifestFile.data);
    const {start_url: startUrl} = j;

    // const manifestUrl = primaryUrl + '/manifest.json';
    const builder = new wbn.BundleBuilder(primaryUrl + '/' + startUrl);
    // .setManifestURL(manifestUrl);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const {url, type, data} = file;
      builder.addExchange(primaryUrl + url, 200, {
        'Content-Type': type,
      }, data);
    }
    return builder.createBundle();
  }
  async getScreenshotImage() {
    const j = this.getManifestJson();
    if (j) {
      const {icons = []} = j;
      const previewIcon = icons.find(icon => icon.type === 'image/png' || icon.type === 'image/jpeg' || icon.type === 'image/gif');
      if (previewIcon) {
        const previewIconFile = this.files.find(file => new URL(file.url).pathname === '/' + previewIcon.src);
        if (previewIconFile) {
          const d = previewIconFile.response.body;
          const b = new Blob([d], {
            type: previewIcon.type,
          });
          const u = URL.createObjectURL(b);
          const img = await new Promise((accept, reject) => {
            const img = new Image();
            img.src = u;
            img.onload = () => {
              accept(img);
            };
            img.onerror = reject;
          });
          URL.revokeObjectURL(u);
          return img;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  async getVolumeMesh() {
    const j = this.getManifestJson();
    if (j) {
      const {icons = []} = j;
      const previewIcon = icons.find(icon => icon.type === 'model/gltf-binary+preview');
      if (previewIcon) {
        const previewIconFile = this.files.find(file => new URL(file.url).pathname === '/' + previewIcon.src);
        if (previewIconFile) {
          const d = previewIconFile.response.body;
          const b = new Blob([d], {
            type: previewIcon.type,
          });
          const u = URL.createObjectURL(b);
          const {scene} = await new Promise((accept, reject) => {
            new GLTFLoader().load(u, accept, function onProgress() {}, reject);
          });
          URL.revokeObjectURL(u);
          return scene;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  async getModel() {
    const j = this.getManifestJson();
    if (j) {
      const {start_url: startUrl, icons = []} = j;

      const _loadGltfFileScene = async file => {
        const d = file.response.body;
        const b = new Blob([d], {
          type: 'application/octet-stream',
        });
        const u = URL.createObjectURL(b);
        const {scene} = await new Promise((accept, reject) => {
          new GLTFLoader().load(u, accept, function onProgress() {}, reject);
        });
        URL.revokeObjectURL(u);
        return scene;
      };
      const _loadVoxFileScene = async file => {
        const d = file.response.body;
        const b = new Blob([d], {
          type: 'application/octet-stream',
        });
        const u = URL.createObjectURL(b);
        const o = await new Promise((accept, reject) => {
          new VOXLoader().load(u, accept, function onProgress() {}, reject);
        });
        URL.revokeObjectURL(u);
        return o;
      };

      const previewIcon = icons.find(icon => icon.type === 'model/gltf-binary');
      if (previewIcon) {
        const previewIconFile = this.files.find(file => new URL(file.url).pathname === '/' + previewIcon.src);
        if (previewIconFile) {
          return await _loadGltfFileScene(previewIconFile);
        } else {
          return null;
        }
      } else {
        const mainModelFile = this.files.find(file => new URL(file.url).pathname === '/' + startUrl);
        if (mainModelFile) {
          if (this.type === 'gltf@0.0.1' || this.type === 'vrm@0.0.1') {
            return await _loadGltfFileScene(mainModelFile);
          } else if (this.type === 'vox@0.0.1') {
            return await _loadVoxFileScene(mainModelFile);
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
    } else {
      return null;
    }
  }
  getAabb() {
    const j = this.getManifestJson();
    if (j && typeof j.xr_details == 'object' && Array.isArray(j.xr_details.aabb)) {
      const box = new THREE.Box3();
      box.min.fromArray(j.xr_details.aabb[0]);
      box.max.fromArray(j.xr_details.aabb[1]);
      return box;
    } else {
      return null;
    }
  }
  setMatrix(m) {
    this.matrix.copy(m);
    this.matrixWorldNeedsUpdate = true;
    this.dispatchEvent(new MessageEvent('matrixupdate', {
      data: this.matrix,
    }));
  }
  updateMatrixWorld() {
    if (this.matrixWorldNeedsUpdate) {
      this.matrixWorldNeedsUpdate = false;

      localMatrix
        .copy(this.parent.matrix)
        .premultiply(this.matrix);

      this.context.object &&
      this.context.object.matrix
        .copy(this.matrix)
        .decompose(this.context.object.position, this.context.object.quaternion, this.context.object.scale);
      this.context.iframe && this.context.iframe.contentWindow.xrpackage.setMatrix(localMatrix.toArray(localArray));
    }
  }
  grabrelease() {
    if (this.parent) {
      for (const k in this.parent.grabs) {
        if (this.parent.grabs[k] === this) {
          this.parent.grabs[k] = null;
        }
      }
      for (const k in this.parent.equips) {
        if (this.parent.equips[k] === this) {
          this.parent.equips[k] = null;
        }
      }
    }
  }
  setPose(pose) {
    const [head, leftGamepad, rightGamepad] = pose;
    if (!this.context.rig) {
      const {model} = this.context;
      if (model) {
        model.scene.traverse(o => {
          o.frustumCulled = false;
        });
        this.context.rig = new Avatar(model, {
          fingers: true,
          hair: true,
          visemes: true,
          decapitate: true,
          microphoneMediaStream: null,
          // debug: !newModel,
        });
      } else {
        this.context.rig = new Avatar(null, {
          fingers: true,
          hair: true,
          visemes: true,
          decapitate: true,
          microphoneMediaStream: null,
          // debug: !newModel,
        });
      }
    }
    rig.inputs.hmd.position.fromArray(head[0]);
    rig.inputs.hmd.quaternion.fromArray(head[1]);
    rig.inputs.leftGamepad.position.fromArray(leftGamepad[0]);
    rig.inputs.leftGamepad.quaternion.fromArray(leftGamepad[1]);
    rig.inputs.rightGamepad.position.fromArray(rightGamepad[0]);
    rig.inputs.rightGamepad.quaternion.fromArray(rightGamepad[1]);
  }
  setXrFramebuffer(xrfb) {
    this.context.iframe && this.context.iframe.contentWindow.xrpackage.setXrFramebuffer(xrfb);
  }
  async export() {
    return this.data.slice();
  }
  async upload() {
    const res = await fetch(`${apiHost}/`, {
      method: 'PUT',
      body: this.data,
    });
    if (res.ok) {
      const j = await res.json();
      const {hash} = j;
      return hash;
    } else {
      throw new Error('upload failed: ' + res.status);
    }
  }
  static async download(hash) {
    const res = await fetch(`${apiHost}/${hash}.wbn`);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      return new XRPackage(uint8Array);
    } else {
      if (res.status === 404) {
        return null;
      } else {
        throw new Error('download failed: ' + res.status);
      }
    }
  }
}
