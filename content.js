import * as THREE from './three.module.js';
import {XRPackageEngine} from './xrpackage.js';
import * as VR from './VR.js';
import * as XR from './XR.js';

Object.defineProperty(navigator, 'getVRDisplays', {
  get() {
    console.log('get 3');
    // if (window.location.origin !== "https://hubs.mozilla.com") {
      if (!pe) {
        pe = new XRPackageEngine();
        const camera = new THREE.PerspectiveCamera(); 
        pe.addEventListener('tick', e => {
          camera.position.y = Math.sin((Date.now()%1000/1000)*Math.PI*2);
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
    // }
  },
});

Object.defineProperty(navigator, 'xr', {
  get() {
    console.log('get 4');
    /* if (!xr) {
      xr = {};
    }
    if (xr.__proto__ !== XR.XR.prototype) {
      Object.setPrototypeOf(xr, XR.XR.prototype);
      xr.init();
    }
    return xr; */
  },
});

console.log('dispatch xr load');
window.dispatchEvent(new CustomEvent('xrload'));