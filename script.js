import {
    XRPackageEngine,
    XRPackage
} from 'https://xrpackage.org/xrpackage.js';
run();
  async function run() {
            const pe = new XRPackageEngine();
            document.body.appendChild(pe.domElement);
            const res = await fetch('./a.wbn'); // built package stored somewhere 
const arrayBuffer = await res.arrayBuffer();  const p = new XRPackage(new Uint8Array(arrayBuffer));
pe.add(p);
}