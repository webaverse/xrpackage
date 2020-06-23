import * as XR from './xrpackage/XR.js';
import { XRPackage } from './xrpackage-package.js';
import { XRPackageEngine } from './xrpackage-engine.js';

window.OldXR = {
  XR: window.XR,
  XRSession: window.XRSession,
  XRRenderState: window.XRRenderState,
  XRWebGLLayer: window.XRWebGLLayer,
  XRFrame: window.XRFrame,
  XRView: window.XRView,
  XRViewport: window.XRViewport,
  XRPose: window.XRPose,
  XRViewerPose: window.XRViewerPose,
  XRInputSource: window.XRInputSource,
  // XRRay,
  // XRInputPose,
  XRInputSourceEvent: window.XRInputSourceEvent,
  XRSpace: window.XRSpace,
  XRReferenceSpace: window.XRReferenceSpace,
  XRBoundedReferenceSpace: window.XRBoundedReferenceSpace,
};

window.XR = XR.XR;
window.XRSession = XR.XRSession;
window.XRRenderState = XR.XRRenderState;
window.XRWebGLLayer = XR.XRWebGLLayer;
window.XRFrame = XR.XRFrame;
window.XRView = XR.XRView;
window.XRViewport = XR.XRViewport;
window.XRPose = XR.XRPose;
window.XRViewerPose = XR.XRViewerPose;
window.XRInputSource = XR.XRInputSource;
window.XRRay = XR.XRRay;
// window.XRInputPose = XR.XRInputPose;
window.XRInputSourceEvent = XR.XRInputSourceEvent;
window.XRSpace = XR.XRSpace;
window.XRReferenceSpace = XR.XRReferenceSpace;
window.XRBoundedReferenceSpace = XR.XRBoundedReferenceSpace;

export {
  XRPackage,
  XRPackageEngine
}
