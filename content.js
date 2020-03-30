import * as THREE from './three.module.js';
import {XRPackageEngine} from './xrpackage.js';
import * as VR from './VR.js';
import * as XR from './XR.js';

const options = XRPACKAGE_OPTIONS;
console.log('content.js', options);
const {enabled, browser, webxr, webvr} = options;

if (enabled) {
  window.pe = null;
  window.vrDisplay = null;
  window.xr = null;

  if (browser !== 'default') {
    Object.defineProperty(navigator, 'userAgent', {
      get() {
        if (browser === 'chrome') {
          return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36';
        } else if (browser === 'firefox') {
          return 'Mozilla/5.0 (X11; Linux i686; rv:10.0) Gecko/20100101 Firefox/10.0';
        } else {
          console.warn('invalid browser setting', browser);
          return '';
        }
      },
    });
  }

  Object.defineProperty(navigator, 'getVRDisplays', {
    get() {
      console.log('get 3', new Error().stack);
      if (webvr) {
        if (!pe) {
          pe = new XRPackageEngine();
          const camera = new THREE.PerspectiveCamera(); 
          pe.addEventListener('tick', e => {
            camera.position.y = Math.sin((Date.now()%1000/1000)*Math.PI*2);
            // console.log('set camera', camera.position.y);
            camera.updateMatrixWorld();
            pe.setCamera(camera);
          });
        }
        if (!vrDisplay) {
          vrDisplay = {
            displayName: 'OpenVR',
            capabilities: {
              canPresent: true,
            },
          };
        }
        if (vrDisplay.__proto__ !== VR.VRDisplay.prototype) {
          // console.log('set prototype', vrDisplay);
          Object.setPrototypeOf(vrDisplay, VR.VRDisplay.prototype);
          vrDisplay.init();
          // vrDisplay = new VR.VRDisplay('OpenVR', window);
          vrDisplay.onrequestanimationframe = pe.requestAnimationFrame.bind(pe);
          vrDisplay.oncancelanimationframe = pe.cancelAnimationFrame.bind(pe);
          vrDisplay.onrequestpresent = async (canvas = null) => {
            if (canvas) {
              pe.setCanvas(canvas);
            }
            return {
              canvas: pe.domElement,
              context: pe.context,
            };
          };

          window.Gamepad = VR.Gamepad;
          window.VRStageParameters = VR.VRStageParameters;
          window.VRDisplay = VR.VRDisplay;
          window.VRFrameData = VR.VRFrameData;
        }
        return async function getVRDisplays() {
          return [vrDisplay];
        };
      }
    },
  });

  Object.defineProperty(navigator, 'xr', {
    get() {
      console.log('get 4');
      if (webxr) {
        if (!xr) {
          xr = {};
        }
        if (xr.__proto__ !== XR.XR.prototype) {
          Object.setPrototypeOf(xr, XR.XR.prototype);
          xr.init();
        }
        return xr;
      }
    },
  });
}