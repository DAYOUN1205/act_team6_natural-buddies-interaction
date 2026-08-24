import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

export class WoodyScene {
  constructor(parentScene, options = {}) {
    this.parentScene = parentScene;

    this.modelUrl =
      options.modelUrl ?? '/models/woody/woody.glb';

    this.backgroundUrl =
      options.backgroundUrl ?? '/models/woody/woody_background.exr';

    this.onStatus =
      options.onStatus ?? (() => {});

    /**
     * 기본 장면 상태 저장
     * Woody에서 나갈 때 복원하기 위함
     */
    this.defaultBackground = parentScene.background;
    this.defaultEnvironment = parentScene.environment;

    /**
     * glTF
     */
    this.root = null;

    /**
     * 디자이너가 만들어둔 그룹
     */
    this.stationary = null;
    this.animationGroup = null;

    /**
     * 반딧불
     */
    this.bugOne = null;
    this.bugTwo = null;

    /**
     * 카메라
     */
    this.sourceCamera = null;

    /**
     * glTF 내장 애니메이션
     */
    this.mixer = null;
    this.animationAction = null;

    /**
     * 배경
     */
    this.backgroundTexture = null;

    /**
     * 코드 애니메이션
     */
    this.elapsedTime = 0;
    this.isRunning = false;

    /**
     * 모델 크기에 따라 반딧불 이동폭 결정
     */
    this.motionScale = 0.1;

    this.bugOneInitial = null;
    this.bugTwoInitial = null;
  }

  async load() {
    const loader = new GLTFLoader();

    this.onStatus('Woody 모델 불러오는 중...');

    /**
     * 1. GLB 로딩
     */
    const gltf =
      await loader.loadAsync(this.modelUrl);

    this.root = gltf.scene;

    this.root.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    this.parentScene.add(this.root);

    /**
     * 2. 주요 오브젝트 찾기
     */
    this.stationary =
      this.root.getObjectByName('stationary');

    this.animationGroup =
      this.root.getObjectByName('animation');

    this.bugOne =
      this.root.getObjectByName('bug_one');

    this.bugTwo =
      this.root.getObjectByName('bug_two');

    this.sourceCamera =
      this.root.getObjectByName('RS_Camera') ??
      this.root.getObjectByName('RS Camera');

    console.log(
      'stationary:',
      this.stationary,
    );

    console.log(
      'animation:',
      this.animationGroup,
    );

    console.log(
      'bug_one:',
      this.bugOne,
    );

    console.log(
      'bug_two:',
      this.bugTwo,
    );

    console.log(
      'RS Camera:',
      this.sourceCamera,
    );

    console.log(
  '===== WOODY MATERIALS =====',
);

this.root.traverse((object) => {
  if (!object.isMesh) return;

  const materials =
    Array.isArray(object.material)
      ? object.material
      : [object.material];

  materials.forEach((material) => {
    console.log({
      mesh: object.name,
      material: material?.name,
      color:
        material?.color?.getHexString?.(),
    });
  });
});

const pinkMesh = this.root.getObjectByName('mesh_49');

if (pinkMesh) {
  console.log('===== PINK MESH =====');
  console.log('mesh:', pinkMesh);
  console.log('parent:', pinkMesh.parent?.name);
  console.log('material:', pinkMesh.material);
  console.log('color:', pinkMesh.material?.color?.getHexString());
  console.log('map:', pinkMesh.material?.map);
  console.log('metalness:', pinkMesh.material?.metalness);
  console.log('roughness:', pinkMesh.material?.roughness);
}

const pinkPetals =
  this.root.getObjectByName('mesh_49');

if (pinkPetals?.isMesh) {
  pinkPetals.material =
    pinkPetals.material.clone();

  const material =
    pinkPetals.material;

  // 텍스처 계열 제거
  material.map = null;
  material.emissiveMap = null;
  material.aoMap = null;
  material.metalnessMap = null;
  material.roughnessMap = null;

  // ★ 중요: glTF vertex color 비활성화
  material.vertexColors = false;

  // 핑크
  material.color.set('#e89dce');

  material.metalness = 0;
  material.roughness = 0.45;

  // 테스트용으로 아주 약하게 자체 발광
  // 조명 때문에 검게 보이는 경우까지 배제
  material.emissive.set('#e89dce');
  material.emissiveIntensity = 0.15;

  material.needsUpdate = true;

  console.log(
    'mesh_49 vertex colors:',
    pinkPetals.geometry.getAttribute('color'),
  );
}

const greenStem =
  this.root.getObjectByName('mesh_51');

if (greenStem?.isMesh) {
  greenStem.material =
    greenStem.material.clone();

  const material =
    greenStem.material;

  // glTF/Redshift 변환 과정에서
  // 검게 만드는 요소 제거
  material.map = null;
  material.emissiveMap = null;
  material.aoMap = null;
  material.metalnessMap = null;
  material.roughnessMap = null;

  // vertex color 영향 제거
  material.vertexColors = false;

  // 원래 GLB에 기록된 녹색
  material.color.set('#8a9e28');

  material.metalness = 0;
  material.roughness = 0.55;

  // 너무 검게 죽지 않도록 약한 자체 발광
  material.emissive.set('#8a9e28');
  material.emissiveIntensity = 0.08;

  material.needsUpdate = true;
}

    /**
     * 3. 디자이너 내장 애니메이션
     */
    if (gltf.animations.length > 0) {
      this.mixer =
        new THREE.AnimationMixer(this.root);

      const clip =
        gltf.animations.find(
          (animation) =>
            animation.name === 'animation_0',
        ) ?? gltf.animations[0];

      this.animationAction =
        this.mixer.clipAction(clip);

      this.animationAction.setLoop(
        THREE.LoopRepeat,
        Infinity,
      );

      /**
       * trigger 전에는 재생하지 않음
       */
      this.animationAction.stop();

      console.log(
        'Woody animation:',
        clip.name,
        `${clip.duration}초`,
      );
    } else {
      console.warn(
        'Woody 내장 애니메이션이 없습니다.',
      );
    }

    /**
     * 4. 반딧불 초기 위치 저장
     */
    if (this.bugOne) {
      this.bugOneInitial = {
        position:
          this.bugOne.position.clone(),

        quaternion:
          this.bugOne.quaternion.clone(),
      };
    }

    if (this.bugTwo) {
      this.bugTwoInitial = {
        position:
          this.bugTwo.position.clone(),

        quaternion:
          this.bugTwo.quaternion.clone(),
      };
    }

    /**
     * 모델 전체 크기 기준으로
     * 반딧불 이동 거리 자동 계산
     */
    const box =
      new THREE.Box3().setFromObject(
        this.root,
      );

    const size =
      box.getSize(new THREE.Vector3());

    const maxSize =
      Math.max(
        size.x,
        size.y,
        size.z,
      );

    if (Number.isFinite(maxSize) && maxSize > 0) {
      this.motionScale =
        maxSize * 0.035;
    }

    console.log(
      'Woody bug motion scale:',
      this.motionScale,
    );

    /**
     * 5. EXR 배경
     */
    try {
      const exrLoader =
        new EXRLoader();

      exrLoader.setDataType(
        THREE.FloatType,
      );

      this.backgroundTexture =
        await exrLoader.loadAsync(
          this.backgroundUrl,
        );

      this.backgroundTexture.mapping =
        THREE.EquirectangularReflectionMapping;

      console.log(
        'Woody EXR 배경 로딩 완료',
      );
    } catch (error) {
      console.error(
        'Woody EXR 배경 로딩 실패:',
        error,
      );
    }

    this.reset();

    this.onStatus(
      'Woody 모델 로딩 완료',
    );
  }

  /**
   * 브랜치/장면 표시 여부
   */
  setVisible(visible) {
    if (!this.root) return;

    this.root.visible = visible;
  }

  /**
   * Woody 장면 활성화
   */
  onActivate() {
  if (!this.backgroundTexture) return;

  this.parentScene.background =
    this.backgroundTexture;

  this.parentScene.environment =
    this.backgroundTexture;

  // 배경 자체 밝기
  this.parentScene.backgroundIntensity = 0.35;

  // 모델에 EXR이 비추는 세기
  this.parentScene.environmentIntensity = 0.25;
}

  /**
   * 다른 향으로 전환될 때
   */
  onDeactivate() {
    this.isRunning = false;

    if (this.animationAction) {
      this.animationAction.stop();
    }

    this.parentScene.background =
      this.defaultBackground;

    this.parentScene.environment =
      this.defaultEnvironment;
  }

  applyCamera(targetCamera, controls) {
  if (!this.sourceCamera) {
    console.warn(
      'Woody RS Camera를 찾지 못했습니다.',
    );

    return false;
  }

  /**
   * 중요:
   * Fresh에서 사용하던 OrbitControls가
   * Woody 카메라에 개입하지 못하도록
   * 먼저 비활성화한다.
   */
  if (controls) {
    controls.enabled = false;
  }

  /**
   * GLB 내부 RS Camera의
   * 정확한 world transform 계산
   */
  this.root.updateMatrixWorld(true);
  this.sourceCamera.updateMatrixWorld(true);

  const worldPosition =
    new THREE.Vector3();

  const worldQuaternion =
    new THREE.Quaternion();

  const worldScale =
    new THREE.Vector3();

  this.sourceCamera.matrixWorld.decompose(
    worldPosition,
    worldQuaternion,
    worldScale,
  );

  /**
   * 이전 Fresh 카메라 상태와 관계없이
   * RS Camera 값으로 완전히 덮어쓴다.
   */
  targetCamera.position.copy(
    worldPosition,
  );

  targetCamera.quaternion.copy(
    worldQuaternion,
  );

  if (
    this.sourceCamera.isPerspectiveCamera
  ) {
    targetCamera.fov =
      this.sourceCamera.fov;

    targetCamera.near =
      Math.max(
        this.sourceCamera.near,
        0.01,
      );

    targetCamera.far =
      Math.min(
        this.sourceCamera.far,
        1000,
      );

    targetCamera.zoom = 1;

    targetCamera.aspect =
      window.innerWidth /
      window.innerHeight;

    targetCamera.updateProjectionMatrix();
  }

  /**
   * camera의 matrix도 즉시 갱신.
   */
  targetCamera.updateMatrix();
  targetCamera.updateMatrixWorld(true);

  return true;
}

  /**
   * 센서 신호 / 키보드 입력 시 호출
   */
  trigger() {
    if (!this.root) {
      console.warn(
        'Woody 모델이 준비되지 않았습니다.',
      );

      return;
    }

    this.reset();

    this.elapsedTime = 0;
    this.isRunning = true;

    /**
     * 디자이너의 4초짜리 애니메이션 시작
     */
    if (this.animationAction) {
      this.animationAction
        .reset()
        .setLoop(
          THREE.LoopRepeat,
          Infinity,
        )
        .play();
    }

    this.onStatus(
      'WOODY 애니메이션 시작',
    );
  }

  reset() {
    this.elapsedTime = 0;
    this.isRunning = false;

    if (
      this.bugOne &&
      this.bugOneInitial
    ) {
      this.bugOne.position.copy(
        this.bugOneInitial.position,
      );

      this.bugOne.quaternion.copy(
        this.bugOneInitial.quaternion,
      );
    }

    if (
      this.bugTwo &&
      this.bugTwoInitial
    ) {
      this.bugTwo.position.copy(
        this.bugTwoInitial.position,
      );

      this.bugTwo.quaternion.copy(
        this.bugTwoInitial.quaternion,
      );
    }
  }

  update(deltaTime) {
    if (!this.isRunning) return;

    this.elapsedTime += deltaTime;

    /**
     * 디자이너가 만들어둔
     * 나뭇잎 / 나무 흔들림 애니메이션
     */
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    /**
     * 우리가 코드로 만드는 반딧불 모션
     */
    this.updateBugOne(
      this.elapsedTime,
    );

    this.updateBugTwo(
      this.elapsedTime,
    );
  }

  updateBugOne(time) {
    if (
      !this.bugOne ||
      !this.bugOneInitial
    ) {
      return;
    }

    const base =
      this.bugOneInitial.position;

    const radius =
      this.motionScale;

    /**
     * 부드러운 불규칙 비행
     */
    const x =
      Math.sin(time * 1.15) *
      radius;

    const y =
      Math.sin(
        time * 1.9 + 0.8,
      ) *
      radius *
      0.55;

    const z =
      Math.cos(
        time * 0.85,
      ) *
      radius *
      0.75;

    this.bugOne.position.set(
      base.x + x,
      base.y + y,
      base.z + z,
    );

    /**
     * 살짝 흔들리는 느낌
     */
    this.bugOne.rotation.z =
      Math.sin(time * 2.5) *
      0.12;
  }

  updateBugTwo(time) {
    if (
      !this.bugTwo ||
      !this.bugTwoInitial
    ) {
      return;
    }

    const base =
      this.bugTwoInitial.position;

    const radius =
      this.motionScale *
      0.9;

    /**
     * bug_one과 다른 궤적
     */
    const x =
      Math.cos(
        time * 0.95 + 1.7,
      ) *
      radius;

    const y =
      Math.sin(
        time * 2.2 + 2.2,
      ) *
      radius *
      0.65;

    const z =
      Math.sin(
        time * 1.25 + 1.1,
      ) *
      radius *
      0.8;

    this.bugTwo.position.set(
      base.x + x,
      base.y + y,
      base.z + z,
    );

    this.bugTwo.rotation.z =
      Math.cos(time * 2.2) *
      0.1;
  }
}