import THREE from '../../three.module.js';

class ArmTransforms {
	constructor() {
        this.transform = new THREE.Object3D();
		this.upperArm = new THREE.Object3D();
		this.lowerArm = new THREE.Object3D();
		this.hand = new THREE.Object3D();
		this.thumb0 = new THREE.Object3D();
		this.thumb1 = new THREE.Object3D();
		this.thumb2 = new THREE.Object3D();
		this.indexFinger1 = new THREE.Object3D();
		this.indexFinger2 = new THREE.Object3D();
		this.indexFinger3 = new THREE.Object3D();

        this.transform.add(this.upperArm);
		this.upperArm.add(this.lowerArm);
		this.lowerArm.add(this.hand);

		this.hand.add(this.thumb0);
		this.thumb0.add(this.thumb1);
		this.thumb1.add(this.thumb2);

		this.hand.add(this.indexFinger1);
		this.indexFinger1.add(this.indexFinger2);
		this.indexFinger2.add(this.indexFinger3);
	}
}

export default ArmTransforms;
