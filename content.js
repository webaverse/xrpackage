import {XRPackageEngine} from './xrpackage.js';
import * as VR from './VR.js';
import * as XR from './XR.js';

let pe = null;
let vrDisplay = null;
let xr = null;
Object.defineProperty(navigator, 'getVRDisplays', {
  get() {
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
    return function getVRDisplays() {
      return [vrDisplay];
    };
  },
});

Object.defineProperty(navigator, 'xr', {
  get() {
    if (!xr) {
      xr = new XR.XR();
    }
    return xr;
  },
});