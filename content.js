import * as THREE from './three.module.js';
import {OrbitControls} from './OrbitControls.js';
import {XRPackageEngine} from './xrpackage.js';
import * as VR from './VR.js';
import * as XR from './XR.js';

const extensionId = XRPACKAGE_EXTENSION_ID;
const options = XRPACKAGE_OPTIONS;
console.log('content.js', extensionId, options);
const {enabled, browser, webxr, webvr} = options;

if (enabled) {
  window.pe = null;
  window.vrDisplay = null;
  window.xr = null;

  const _ensurePe = () => {
    if (!pe) {
      pe = new XRPackageEngine();
      /* const camera = new THREE.PerspectiveCamera();
      pe.addEventListener('tick', e => {
        camera.position.y = Math.sin((Date.now()%1000/1000)*Math.PI*2);
        camera.updateMatrixWorld();
        pe.setCamera(camera);
      }); */
    }
  };

  if (browser) {
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
        _ensurePe();
        if (!vrDisplay) {
          vrDisplay = new VR.VRDisplay();
          // vrDisplay = new VR.VRDisplay('OpenVR', window);
          vrDisplay.onrequestanimationframe = pe.requestAnimationFrame.bind(pe);
          vrDisplay.oncancelanimationframe = pe.cancelAnimationFrame.bind(pe);
          vrDisplay.onmakeswapchain = (canvas, context) => {
            // if (canvas) {
              pe.setCanvas(canvas, context);
            // }
          };
          vrDisplay.onrequestpresent = () => {
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
        _ensurePe();
        if (!xr) {
          xr = new XR.XR();
          xr.onrequestpresent = () => {
            const iframe = document.createElement('iframe');
            iframe.src = `chrome-extension://${extensionId}/popup.html#overlay`;
            iframe.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 100; border: 0;';
            /* iframe.onload = () => {
              iframe.contentWindow.addEventListener('message', e => {
                console.log('got message', e);
              });
            }; */
            window.addEventListener('message', e => {
              // console.log('got message', e.data);
              const {event} = e.data;
              switch (event) {
                case 'mousedown':
                case 'mouseup':
                case 'mousemove':
                case 'wheel': {
                  const {clientX, clientY, movementX, movementY, deltaX, deltaY} = e.data;
                  // console.log('got event', e.data);
                  const mouseEvent = new (event === 'wheel' ? WheelEvent : MouseEvent)(event, {
                    clientX,
                    clientY,
                    movementX,
                    movementY,
                    deltaX,
                    deltaY,
                  });
                  (['mousemove', 'mouseup'].includes(event) ? document : pe.domElement).dispatchEvent(mouseEvent);
                  break;
                }
              }
            });
            document.body.appendChild(iframe);

            pe.fakeSession.onmakeswapchain = (canvas, context) => {
              console.log('onmakeswapchain', canvas, context);
              // if (canvas) {
                pe.setCanvas(canvas, context);
              // }

              const camera = new THREE.PerspectiveCamera();
              camera.position.set(0, 0.5, 1);
              const orbitControls = new OrbitControls(camera, pe.domElement);
              orbitControls.screenSpacePanning = true;
              orbitControls.enableMiddleZoom = false;
              // orbitControls.update();
              pe.addEventListener('tick', () => {
                if (!pe.session) {
                  orbitControls.update();
                  pe.setCamera(camera);
                }
              });
            };
            
            return {
              session: pe.fakeSession,
            };
          };
        };
        return xr;
      }
    },
  });
}