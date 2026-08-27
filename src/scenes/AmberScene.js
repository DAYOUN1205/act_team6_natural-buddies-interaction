import * as THREE from 'three';

import { GLTFLoader } from
  'three/addons/loaders/GLTFLoader.js';

export class AmberScene {
  constructor(parentScene, options = {}) {
    this.parentScene = parentScene;

    this.modelUrl =
      options.modelUrl ??
      '/models/amber/amber.gltf';

    this.onStatus =
      options.onStatus ??
      (() => {});

    this.root = null;
    this.rollGroup = null;

    this.apple = null;
    this.calyx = null;

    this.state = 'idle';
    this.elapsedTime = 0;

    // 전체 구르기 시간
    this.rollDuration = 3.2;

    // 모델 로드 후 실제 크기에 맞춰 계산
    this.radius = 0.1;
    this.travelDistance = 0.9;

    this.startX = 0;
    this.endX = 0;

    // 다른 향의 EXR 등이 Amber에 남지 않도록
    // 최초 scene 상태 저장
    this.defaultBackground =
      parentScene.background;

    this.defaultEnvironment =
      parentScene.environment;

    this.defaultBackgroundIntensity =
      parentScene.backgroundIntensity;

    this.defaultEnvironmentIntensity =
      parentScene.environmentIntensity;
  }

  async load() {
    const loader =
      new GLTFLoader();

    this.onStatus(
      'Amber 모델 불러오는 중...',
    );

    const gltf =
      await loader.loadAsync(
        this.modelUrl,
      );

    this.root = gltf.scene;

    this.apple =
      this.root.getObjectByName(
        'Apple',
      );

    this.calyx =
      this.root.getObjectByName(
        'Calyx',
      );

    console.log(
      'Amber Apple:',
      this.apple,
    );

    console.log(
      'Amber Calyx:',
      this.calyx,
    );

    this.root.traverse((object) => {
      if (!object.isMesh) {
        return;
      }

      object.castShadow = true;
      object.receiveShadow = true;
    });

    /**
     * Apple + Calyx를 한 덩어리로
     * 회전시키기 위한 pivot.
     */
    const box =
      new THREE.Box3()
        .setFromObject(
          this.root,
        );

    const center =
      box.getCenter(
        new THREE.Vector3(),
      );

    const size =
      box.getSize(
        new THREE.Vector3(),
      );

    /**
     * root의 중심을
     * rollGroup의 원점으로 이동.
     *
     * 이 작업을 안 하면
     * 사과가 자기 중심에서 도는 게 아니라
     * 큰 원을 그리며 공전하게 됨.
     */
    this.rollGroup =
      new THREE.Group();

    this.parentScene.add(
      this.rollGroup,
    );

    this.rollGroup.add(
      this.root,
    );

    this.root.position.sub(
      center,
    );

    /**
     * 사과의 실질적인 반지름.
     *
     * 모델이 거의 구형이므로
     * width / height 평균 사용.
     */
    this.radius =
      (size.x + size.y) / 4;

    /**
     * 사과 지름의 약 4배 정도 이동.
     */
    this.travelDistance =
      size.x * 4.2;

    this.startX =
      -this.travelDistance / 2;

    this.endX =
      this.travelDistance / 2;

    this.reset();

    this.onStatus(
      'Amber 모델 로딩 완료',
    );

    console.log(
      'Amber radius:',
      this.radius,
    );

    console.log(
      'Amber travel:',
      this.travelDistance,
    );
  }

  setVisible(visible) {
    if (this.rollGroup) {
      this.rollGroup.visible =
        visible;
    }
  }

  onActivate() {
    /**
     * Floral/Woody에서 사용하던
     * EXR 배경과 environment 제거.
     */
    this.parentScene.background =
      this.defaultBackground;

    this.parentScene.environment =
      this.defaultEnvironment;

    this.parentScene.backgroundIntensity =
      this.defaultBackgroundIntensity;

    this.parentScene.environmentIntensity =
      this.defaultEnvironmentIntensity;
  }

  onDeactivate() {
    this.reset();
  }

  /**
   * Amber 전용 카메라.
   *
   * 사과가 이동하는 전체 범위를
   * 화면 안에 넣도록 자동 계산.
   */
  applyCamera(
    targetCamera,
    controls,
  ) {
    if (!this.rollGroup) {
      return false;
    }

    const aspect =
      window.innerWidth /
      window.innerHeight;

    const fov = 35;

    const verticalFov =
      THREE.MathUtils.degToRad(
        fov,
      );

    const horizontalFov =
      2 *
      Math.atan(
        Math.tan(
          verticalFov / 2,
        ) *
          aspect,
      );

    const halfWidth =
      this.travelDistance / 2 +
      this.radius * 1.4;

    const distance =
      (
        halfWidth /
        Math.tan(
          horizontalFov / 2,
        )
      ) * 1.2;

    targetCamera.position.set(
      0,
      this.radius * 0.15,
      distance,
    );

    targetCamera.lookAt(
      0,
      0,
      0,
    );

    targetCamera.fov = fov;
    targetCamera.near = 0.01;
    targetCamera.far = 1000;
    targetCamera.zoom = 1;
    targetCamera.aspect = aspect;

    targetCamera.updateProjectionMatrix();
    targetCamera.updateMatrix();
    targetCamera.updateMatrixWorld(true);

    if (controls) {
      controls.target.set(
        0,
        0,
        0,
      );

      controls.enabled = false;
    }

    return true;
  }

  trigger() {
    if (!this.rollGroup) {
      console.warn(
        'Amber 모델이 준비되지 않았습니다.',
      );

      return;
    }

    this.reset();

    this.state = 'rolling';
    this.elapsedTime = 0;

    this.onStatus(
      'AMBER 사과 구르기 시작',
    );
  }

  reset() {
    if (!this.rollGroup) {
      return;
    }

    this.state = 'idle';
    this.elapsedTime = 0;

    this.rollGroup.position.set(
      this.startX,
      0,
      0,
    );

    this.rollGroup.rotation.set(
      0,
      0,
      0,
    );
  }

  update(deltaTime) {
    if (
      this.state !== 'rolling'
    ) {
      return;
    }

    this.elapsedTime +=
      deltaTime;

    const progress =
      THREE.MathUtils.clamp(
        this.elapsedTime /
          this.rollDuration,
        0,
        1,
      );

    /**
     * 처음에는 잘 굴러가다가
     * 마지막에 자연스럽게 감속.
     */
    const movementProgress =
      this.easeOutCubic(
        progress,
      );

    const currentX =
      THREE.MathUtils.lerp(
        this.startX,
        this.endX,
        movementProgress,
      );

    /**
     * 실제 이동한 거리.
     */
    const movedDistance =
      currentX -
      this.startX;

    this.rollGroup.position.x =
      currentX;

    /**
     * 굴림:
     *
     * 이동거리 = 반지름 × 회전각
     *
     * 따라서
     * 회전각 = 이동거리 / 반지름
     */
    this.rollGroup.rotation.z =
      -movedDistance /
      this.radius;

    /**
     * 사과가 완전한 구가 아니므로
     * 아주 약하게 덜컹거리는 느낌.
     */
    this.rollGroup.position.y =
      Math.sin(
        movedDistance /
          this.radius *
          2,
      ) *
      this.radius *
      0.025;

    if (progress >= 1) {
      this.state = 'finished';

      this.onStatus(
        'AMBER 사과 구르기 완료',
      );
    }
  }

  easeOutCubic(t) {
    return (
      1 -
      Math.pow(
        1 - t,
        3,
      )
    );
  }
}