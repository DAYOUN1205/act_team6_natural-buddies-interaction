import * as THREE from 'three';

import { GLTFLoader } from
  'three/addons/loaders/GLTFLoader.js';

import { RectAreaLightUniformsLib } from
  'three/addons/lights/RectAreaLightUniformsLib.js';

export class FloralScene {
  constructor(parentScene, options = {}) {
    this.characterUrl =
      options.characterUrl ??
      '/models/floral/floral_character_final.glb';

    this.characterWrapper = null;
    this.characterRoot = null;

    this.characterMixer = null;
    this.characterAction = null;

    this.parentScene = parentScene;

    this.modelUrl =
      options.modelUrl ??
      '/models/floral/0825FLOWER.glb';

    this.backgroundUrl =
      options.backgroundUrl ??
      '/models/floral/background.exr';

    this.onStatus =
      options.onStatus ??
      (() => {});

    this.root = null;

    this.backgroundTexture = null;

    this.flower1 = {
      petals: [],
      center: [],
    };

    this.flower2 = {
      petals: [],
      center: [],
    };

    this.state = 'idle';
    this.elapsedTime = 0;

    /**
     * 꽃 하나가 피는 기본 시간
     */
    this.bloomDuration = 1.4;

    /**
     * flower1 시작 후
     * flower2가 시작되는 시점
     *
     * 디자이너 요청:
     * 약 1초 텀
     */
    this.flower2Delay = 1.1;

    /**
     * 한 꽃 안에서도
     * 꽃잎이 완벽하게 동시에 움직이지 않고
     * 살짝 시간차를 줌
     */
    this.petalDelay = 0.1;

    /**
     * 닫혀 있을 때 꽃잎 크기
     */
    this.closedScale = 0.1;

    /**
     * 꽃잎이 접혀 있는 정도
     */
    this.closedAngle =
      THREE.MathUtils.degToRad(68);

    // Floral 전용 조명
    this.floralLightGroup = new THREE.Group();

    this.overallLight = null;
    this.keyAreaLight = null;
    this.backLight = null;
    this.frontLeftLight = null;
  }

  /**
   * 모델 + 배경 로드
   */
  async load() {
    const gltfLoader = new GLTFLoader();

    this.onStatus(
      'Floral 모델 불러오는 중...',
    );

    const gltf =
      await gltfLoader.loadAsync(
        this.modelUrl,
      );

    this.root = gltf.scene;

    this.root.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });

    this.parentScene.add(this.root);

    this.setupLights();

    this.findFlowers();

    // flower1 = 오른쪽 꽃 → 시계방향
    this.sortFlowerPetals(
      this.flower1,
      'clockwise',
    );

    // flower2 = 왼쪽 꽃 → 반시계방향
    this.sortFlowerPetals(
      this.flower2,
      'counterclockwise',
    );

    this.prepareFlowers(); 
    /**
     * 캐릭터 로드
     */
    try {
      const characterGltf =
        await gltfLoader.loadAsync(
          this.characterUrl,
        );

      this.characterRoot =
        characterGltf.scene;

      /**
       * 캐릭터 전체를 한 번에
       * 위치/크기 조절하기 위한 Wrapper
       */
      this.characterWrapper =
        new THREE.Group();

      this.characterWrapper.add(
        this.characterRoot,
      );

      this.root.add(
        this.characterWrapper,
      );

      /**
       * GLB 자체 원점이 이상한 위치에 있어서
       * 캐릭터를 가운데 + 바닥 기준으로 정렬
       */
      this.characterRoot.updateMatrixWorld(true);

      const characterBox =
        new THREE.Box3().setFromObject(
          this.characterRoot,
        );

      const characterCenter =
        characterBox.getCenter(
          new THREE.Vector3(),
        );

      this.characterRoot.position.x -=
        characterCenter.x;

      this.characterRoot.position.z -=
        characterCenter.z;

      this.characterRoot.position.y -=
        characterBox.min.y;

      /**
       * 첫 번째 배치값
       *
       * 지금 Floral 카메라 구도와
       * 네가 표시한 원 위치 기준으로 잡은 시작값
       */
      this.characterWrapper.position.set(
        -0.19,  // 좌우
        1.23,   // 높이
        0.60,  // 앞뒤
      );

      this.characterWrapper.scale.setScalar(
        0.12,
      );

      /**
       * 처음에는 숨김
       * Floral trigger 때 나타나게 함
       */
      this.characterWrapper.visible = false;

      /**
       * 메인 캐릭터 애니메이션
       */
      if (characterGltf.animations.length > 0) {
        this.characterMixer =
          new THREE.AnimationMixer(
            this.characterRoot,
          );

        const clip =
          characterGltf.animations.find(
            (animation) =>
              animation.name ===
              'ArmatureAction',
          ) ??
          characterGltf.animations[0];

        this.characterAction =
          this.characterMixer.clipAction(
            clip,
          );

        this.characterAction.setLoop(
          THREE.LoopRepeat,
          Infinity,
        );

        console.log(
          'Floral character animation:',
          clip.name,
          clip.duration,
        );
      }

      /**
       * 위치 조절용 콘솔 함수
       */
      window.getFloralCharacter =
        () => {
          console.log(
            'position:',
            this.characterWrapper.position.toArray(),
          );

          console.log(
            'scale:',
            this.characterWrapper.scale.x,
          );
        };

      window.moveFloralCharacter =
        (
          x = 0,
          y = 0,
          z = 0,
        ) => {
          this.characterWrapper.position.x += x;
          this.characterWrapper.position.y += y;
          this.characterWrapper.position.z += z;

          console.log(
            this.characterWrapper.position.toArray(),
          );
        };

      window.scaleFloralCharacter =
        (scale) => {
          this.characterWrapper.scale.setScalar(
            scale,
          );

          console.log(
            'character scale:',
            scale,
          );
        };

      console.log(
        'Floral 캐릭터 로딩 완료',
      );
    } catch (error) {
      console.error(
        'Floral 캐릭터 로딩 실패:',
        error,
      );
    }

    /**
     * 배경
     */
    try {
    const textureLoader =
      new THREE.TextureLoader();

    this.backgroundTexture =
      await textureLoader.loadAsync(
        this.backgroundUrl,
      );

    this.backgroundTexture.colorSpace =
      THREE.SRGBColorSpace;

    // 배경 중앙 기준 확대
    this.backgroundTexture.center.set(0.5, 0.5);

    // 1보다 작을수록 확대됨
    this.backgroundTexture.repeat.set(
      0.35,
      0.35,
    );

    // 배경 위치 조정
    this.backgroundTexture.offset.set(
      0.1, // 좌우
      -0.05,    // 상하
    );

    this.backgroundTexture.updateMatrix();

    this.backgroundTexture.needsUpdate = true;

    console.log(
      'Floral PNG 배경 로딩 완료:',
      this.backgroundUrl,
      this.backgroundTexture.image?.width,
      this.backgroundTexture.image?.height,
    );
  } catch (error) {
    console.error(
      'Floral PNG 배경 로딩 실패:',
      error,
    );
  }
        this.reset();

    console.log(
      'flower1 꽃잎:',
      this.flower1.petals.length,
    );

    console.log(
      'flower1 중앙:',
      this.flower1.center.length,
    );

    console.log(
      'flower2 꽃잎:',
      this.flower2.petals.length,
    );

    console.log(
      'flower2 중앙:',
      this.flower2.center.length,
    );

    this.onStatus(
      'Floral 모델 로딩 완료',
    );
  }

  setupLights() {
  RectAreaLightUniformsLib.init();

  // 조명들을 한 그룹으로 관리
  this.parentScene.add(
    this.floralLightGroup,
  );

  // 1. 전체 조명
  this.overallLight =
    new THREE.HemisphereLight(
      0xffffff,
      0x444444,
      0.5,
    );

  this.floralLightGroup.add(
    this.overallLight,
  );

  // 2. 왼쪽 위 메인 Area Light
  this.keyAreaLight =
    new THREE.RectAreaLight(
      0xffffff,
      8,
      3,
      3,
    );

  this.keyAreaLight.position.set(
    -2,
    3,
    2,
  );

  this.keyAreaLight.lookAt(
    0,
    1,
    0,
  );

  this.floralLightGroup.add(
    this.keyAreaLight,
  );

  // 3. 뒤쪽 보조 조명
  this.backLight =
    new THREE.DirectionalLight(
      0xffffff,
      0.6,
    );

  this.backLight.position.set(
    2,
    2,
    -2,
  );

  this.floralLightGroup.add(
    this.backLight,
  );

  // 4. 사용자 기준 왼쪽 앞 → 꽃 방향 대각선 조명
  this.frontLeftLight =
    new THREE.RectAreaLight(
      0xffffff,
      4,   // 밝기
      2.5, // 가로 크기
      2.5, // 세로 크기
    );

  this.frontLeftLight.position.set(
    -2.2, // 사용자 기준 왼쪽
    2.4,  // 약간 위
    3.0,  // 사용자/카메라 쪽
  );

  // 두 꽃 사이 정도를 향하게
  this.frontLeftLight.lookAt(
    -0.1,
    1.5,
    0.2,
  );

  this.floralLightGroup.add(
    this.frontLeftLight,
  );

  this.floralLightGroup.visible = false;
}

  /**
   * flower1 / flower2 찾기
   *
   * 중요한 점:
   * glTF 안에서 같은 이름의 오브젝트가
   * 여러 개 존재하기 때문에
   * getObjectByName() 하나만 쓰면 안 됨.
   */
  findFlowers() {
    this.flower1.petals = [];
    this.flower1.center = [];

    this.flower2.petals = [];
    this.flower2.center = [];

    this.root.traverse((object) => {
      if (!object.isMesh) {
        return;
      }

      /**
       * GLTFLoader가 중복 이름에
       * _1, _2 같은 suffix를 붙일 수 있으므로
       * startsWith 사용
       */
      if (
        object.name.startsWith(
          'flower1',
        )
      ) {
        this.classifyFlowerPart(
          object,
          this.flower1,
        );
      }

      if (
        object.name.startsWith(
          'flower2',
        )
      ) {
        this.classifyFlowerPart(
          object,
          this.flower2,
        );
      }
    });
  }

  sortFlowerPetals(
    flower,
    direction = 'clockwise',
  ) {
  if (
    flower.petals.length === 0 ||
    flower.center.length === 0
  ) {
    return;
  }

  // 꽃 중앙의 실제 화면상 위치 계산
  const centerBox = new THREE.Box3();

  flower.center.forEach((mesh) => {
    centerBox.expandByObject(mesh);
  });

  const center = new THREE.Vector3();
  centerBox.getCenter(center);

  flower.petals.sort((a, b) => {
    const boxA = new THREE.Box3()
      .setFromObject(a);

    const boxB = new THREE.Box3()
      .setFromObject(b);

    const posA = new THREE.Vector3();
    const posB = new THREE.Vector3();

    boxA.getCenter(posA);
    boxB.getCenter(posB);

    const dxA = posA.x - center.x;
    const dyA = posA.y - center.y;

    const dxB = posB.x - center.x;
    const dyB = posB.y - center.y;

    // 위쪽 꽃잎을 0번으로 해서 시계방향
    let angleA = Math.atan2(dxA, dyA);
    let angleB = Math.atan2(dxB, dyB);

    if (angleA < 0) {
      angleA += Math.PI * 2;
    }

    if (angleB < 0) {
      angleB += Math.PI * 2;
    }

    if (direction === 'counterclockwise') {
      return angleB - angleA;
    }

    return angleA - angleB;
  });
}
  /**
   * 꽃잎과 중앙부 구분
   */
  classifyFlowerPart(object, flower) {
    const materials =
      Array.isArray(object.material)
        ? object.material
        : [object.material];

    const materialNames = materials
      .map((material) =>
        (material?.name ?? '').toLowerCase()
      )
      .join(' ');

    /**
     * 0825FLOWER.glb
     *
     * flower1 petals  = Material.019
     * flower1 center  = Material.023
     *
     * flower2 petals  = Material.013
     * flower2 center  = Material.010
     */

    const isCenter =
      materialNames.includes('material.023') ||
      materialNames.includes('material.010');

    if (isCenter) {
      flower.center.push(object);
      return;
    }

    const isPetal =
      materialNames.includes('material.019') ||
      materialNames.includes('material.013');

    if (isPetal) {
      flower.petals.push(object);
      return;
    }

    /**
     * 혹시 재질명이 다시 변경될 경우 fallback
     *
     * 현재 모델 중앙부는
     * Z scale 약 0.58
     */
    if (object.scale.z < 0.8) {
      flower.center.push(object);
    } else {
      flower.petals.push(object);
    }
  }

  /**
   * 꽃잎 원래 Transform 저장
   */
  prepareFlowers() {
    this.preparePetals(
      this.flower1.petals,
    );

    this.preparePetals(
      this.flower2.petals,
    );
  }

  preparePetals(petals) {
    petals.forEach(
      (petal, index) => {
        /**
         * 열린 상태 = 디자이너가 준 원본
         */
        petal.userData.openScale =
          petal.scale.clone();

        petal.userData.openQuaternion =
          petal.quaternion.clone();

        /**
         * 닫힌 상태:
         * 원래 꽃잎을 local X축으로
         * 접어 둠.
         */
        const direction =
          index % 2 === 0
            ? 1
            : -1;

        const foldQuaternion =
          new THREE.Quaternion();

        foldQuaternion.setFromAxisAngle(
          new THREE.Vector3(
            1,
            0,
            0,
          ),
          this.closedAngle *
            direction,
        );

        petal.userData.closedQuaternion =
          petal.userData
            .openQuaternion
            .clone()
            .multiply(
              foldQuaternion,
            );
      },
    );
  }

  /**
   * 초기 꽃 상태
   */
  reset() {
    if (!this.root) {
      return;
    }

    this.state = 'idle';
    this.elapsedTime = 0;

    this.closeFlower(
      this.flower1,
    );

    this.closeFlower(
      this.flower2,
    );
  }

  closeFlower(flower) {
    /**
     * 꽃 중앙부는 계속 보임
     */
    flower.center.forEach(
      (center) => {
        center.visible = true;
      },
    );

    /**
     * 꽃잎은 접힌 상태
     */
    flower.petals.forEach(
      (petal) => {
        petal.visible = true;

        petal.scale
          .copy(
            petal.userData.openScale,
          )
          .multiplyScalar(
            this.closedScale,
          );

        petal.quaternion.copy(
          petal.userData
            .closedQuaternion,
        );
      },
    );
  }

  /**
   * SceneManager가 호출
   */
  setVisible(visible) {
    if (this.root) {
      this.root.visible = visible;
    }
  }

  /**
 * Floral 장면 활성화
 */
onActivate() {
  if (this.backgroundTexture) {
    this.parentScene.background =
      this.backgroundTexture;

    this.parentScene.backgroundIntensity =
      1.0;

    this.parentScene.backgroundBlurriness =
      0;
  }

  // PNG는 환경광으로 사용하지 않음
  this.parentScene.environment = null;

  // Floral 전용 조명 켜기
  if (this.floralLightGroup) {
    this.floralLightGroup.visible = true;
  }
}

onDeactivate() {
  if (this.floralLightGroup) {
    this.floralLightGroup.visible = false;
  }
}


  /**
   * 이 장면이 선택될 때
   */
  applyCamera(targetCamera, controls) {
  if (!this.root) {
    return false;
  }

  targetCamera.position.set(
    -0.19334259473510773,
    1.6398067400883434,
    2.416746742192816,
  );

  targetCamera.quaternion.set(
    0.002325062799254863,
    0.016575382515515116,
    -0.00003854420474156451,
    0.9998599148339672,
  );

  targetCamera.fov = 32;
  targetCamera.near = 0.01;
  targetCamera.far = 1000;
  targetCamera.zoom = 1;

  targetCamera.aspect =
    window.innerWidth / window.innerHeight;

  targetCamera.updateProjectionMatrix();
  targetCamera.updateMatrix();
  targetCamera.updateMatrixWorld(true);

  if (controls) {
    controls.target.set(
      -0.26599002975954306,
      1.6499999999999995,
      0.2262302960226761,
    );

    controls.enabled = false;
  }

  return true;
}

  /**
   * 2번 키 / Floral 센서
   */
  trigger() {
    if (!this.root) {
      console.warn(
        'Floral 모델이 준비되지 않았습니다.',
      );

      return;
    }

    this.reset();

    this.state = 'blooming';
    this.elapsedTime = 0;

    if (
      this.characterWrapper &&
      this.characterAction
    ) {
      this.characterWrapper.visible = true;

      this.characterAction
        .reset()
        .setLoop(
          THREE.LoopRepeat,
          Infinity,
        )
        .play();
    }

    this.onStatus(
      'FLORAL 꽃 개화 시작',
    );
  }

  update(deltaTime) {
    if (
      this.characterMixer &&
      this.characterWrapper?.visible
    ) {
      this.characterMixer.update(
        deltaTime,
      );
    }

    if (
      this.state !== 'blooming'
    ) {
      return;
    }

    this.elapsedTime +=
      deltaTime;


    /**
     * flower1
     *
     * 0초부터 시작
     */
    this.updateFlower(
      this.flower2,
      this.elapsedTime,
    );

    /**
     * flower2
     *
     * 1초 뒤 시작
     */
    this.updateFlower(
      this.flower1,
      this.elapsedTime -
        this.flower2Delay,
    );

    const totalDuration =
      this.flower2Delay +
      this.bloomDuration +
      this.petalDelay *
        Math.max(
          this.flower1.petals.length - 1,
          0,
        );

    if (
      this.elapsedTime >=
      totalDuration
    ) {
      this.state = 'open';

      this.forceFlowerOpen(
        this.flower1,
      );

      this.forceFlowerOpen(
        this.flower2,
      );

      this.onStatus(
        'FLORAL 개화 완료',
      );
    }
  }

  /**
   * 꽃 하나의 개화
   */
  updateFlower(
    flower,
    localTime,
  ) {
    if (localTime < 0) {
      return;
    }

    flower.petals.forEach(
      (petal, index) => {
        const delay =
          index *
          this.petalDelay;

        const petalTime =
          localTime -
          delay;

        if (petalTime < 0) {
          return;
        }

        const progress =
          THREE.MathUtils.clamp(
            petalTime /
              this.bloomDuration,
            0,
            1,
          );

        /**
         * 회전은 천천히 감속하며 펼쳐짐
         */
        const rotationProgress =
          this.easeOutCubic(
            progress,
          );

        /**
         * 크기는 살짝 탄력 있게
         */
        const scaleProgress =
          this.easeOutBackSoft(
            progress,
          );

        /**
         * 65% → 100%
         */
        const scaleMultiplier =
          THREE.MathUtils.lerp(
            this.closedScale,
            1,
            scaleProgress,
          );

        petal.scale
          .copy(
            petal.userData.openScale,
          )
          .multiplyScalar(
            scaleMultiplier,
          );

        /**
         * 접힌 각도 →
         * 디자이너 원본 각도
         */
        petal.quaternion
          .slerpQuaternions(
            petal.userData
              .closedQuaternion,
            petal.userData
              .openQuaternion,
            rotationProgress,
          );
      },
    );
  }

  /**
   * 마지막 오차 방지
   */
  forceFlowerOpen(flower) {
    flower.petals.forEach(
      (petal) => {
        petal.scale.copy(
          petal.userData.openScale,
        );

        petal.quaternion.copy(
          petal.userData
            .openQuaternion,
        );
      },
    );
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

  easeOutBackSoft(t) {
    const c1 = 0.65;
    const c3 = c1 + 1;

    return (
      1 +
      c3 *
        Math.pow(
          t - 1,
          3,
        ) +
      c1 *
        Math.pow(
          t - 1,
          2,
        )
    );
  }
}