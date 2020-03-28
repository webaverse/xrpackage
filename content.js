import {XRPackageEngine} from './xrpackage.js';
import * as VR from './VR.js';
import * as XR from './XR.js';

let pe = null;
let vrDisplay = null;
let xr = null;
Object.defineProperty(navigator, 'getVRDisplays', {
  get() {
    console.log('get 1');
    if (window.location.origin !== "https://hubs.mozilla.com") {
      if (!pe) {
        pe = new XRPackageEngine();
      }
      if (!vrDisplay) {
        vrDisplay = new VR.VRDisplay('OpenVR', window);
        vrDisplay.onrequestanimationframe = pe.requestAnimationFrame.bind(pe);
        vrDisplay.oncancelanimationframe = pe.cancelAnimationFrame.bind(pe);
        vrDisplay.onrequestpresent = async () => {
          return {
            canvas: pe.domElement,
            context: pe.context,
          };
        };
      }
      return async function getVRDisplays() {
        return [vrDisplay];
      };
    }
  },
});

Object.defineProperty(navigator, 'xr', {
  get() {
    console.log('get 2');
    if (!xr) {
      xr = new XR.XR();
    }
    return xr;
  },
});

console.log('dispatch xr load');
window.dispatchEvent(new CustomEvent('xrload'));