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

        this.transform.add(this.upperArm);
		this.upperArm.add(this.lowerArm);
		this.lowerArm.add(this.hand);
		this.hand.add(this.thumb0);
		this.thumb0.add(this.thumb1);
		this.thumb1.add(this.thumb2);
	}
}

export default ArmTransforms;
