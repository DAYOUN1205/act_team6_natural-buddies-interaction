// 공통 렌더러, 카메라, 조명, 렌더 루프를 담당함.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class ThreeApp {
  constructor(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('canvas 요소를 찾을 수 없습니다.');
    }

    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdfe8dd);

    this.camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.01,
      1000,
    );

    this.camera.position.set(0, 2, 6);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });

    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2),
    );

    this.renderer.setSize(
      window.innerWidth,
      window.innerHeight,
      false,
    );

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(
      this.camera,
      this.canvas,
    );

    this.controls.enableDamping = true;

    this.clock = new THREE.Clock();

    this.addLights();

    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  addLights() {
    const hemisphereLight = new THREE.HemisphereLight(
      0xffffff,
      0x526052,
      2.5,
    );

    this.scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      4,
    );

    directionalLight.position.set(4, 6, 5);
    directionalLight.castShadow = true;

    this.scene.add(directionalLight);
  }

  fitCameraToObject(object) {
    const box = new THREE.Box3().setFromObject(object);

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(
      size.x,
      size.y,
      size.z,
    );

    if (maxSize === 0) {
      return;
    }

    const verticalFov = THREE.MathUtils.degToRad(
      this.camera.fov,
    );

    const distance =
      (maxSize / (2 * Math.tan(verticalFov / 2))) * 1.8;

    this.camera.position.set(
      center.x,
      center.y + maxSize * 0.2,
      center.z + distance,
    );

    this.camera.near = Math.max(distance / 100, 0.01);
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(center);
    this.controls.update();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  }

  start(update) {
    this.renderer.setAnimationLoop(() => {
      const deltaTime = this.clock.getDelta();

      update(deltaTime);

      this.controls.update();

      this.renderer.render(
        this.scene,
        this.camera,
      );
    });
  }
}