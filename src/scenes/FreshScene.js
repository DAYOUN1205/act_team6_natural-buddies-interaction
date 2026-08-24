import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class FreshScene {
  constructor(parentScene, options = {}) {
    this.parentScene = parentScene;

    this.modelUrl =
      options.modelUrl ??
      '/models/fresh/fresh_0729.gltf';

    this.onStatus =
      options.onStatus ??
      (() => {});

    this.root = null;

    this.mouthBefore = null;
    this.mouthAfter = null;
    this.eyebrowLeft = null;
    this.eyebrowRight = null;

    this.originalPosition = null;
    this.originalRotation = null;

    this.state = 'idle';
this.elapsedTime = 0;

this.dropDuration = 1.2;      // 떨어지는 데 걸리는 시간
this.dropDistance = 2.0;      // 떨어지는 거리
this.expressionDelay = 0.3;   // 땅에 닿은 후 표정 바뀌기까지 시간
  }

  async load() {
    const loader = new GLTFLoader();

    this.onStatus('프레시 모델 불러오는 중...');

    const gltf = await loader.loadAsync(
      this.modelUrl,
    );

    /*
     * gltf.scene 자체가 모든 귤 파츠를 담는 상위 그룹 역할을 함.
     * 이 root를 움직이면 귤의 모든 파츠가 함께 움직임.
     */
    this.root = gltf.scene;

    this.root.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    this.parentScene.add(this.root);

    this.findParts();

    this.originalPosition =
      this.root.position.clone();

    this.originalRotation =
      this.root.rotation.clone();

    this.reset();

    this.onStatus(
      '프레시 모델 로딩 완료',
    );
  }

  findParts() {
    this.mouthBefore =
      this.root.getObjectByName('mouth_before');

    this.mouthAfter =
      this.root.getObjectByName('mouth_after');

    this.eyebrowLeft =
      this.root.getObjectByName('eyebrow_left');

    this.eyebrowRight =
      this.root.getObjectByName('eyebrow_right');

    const requiredParts = {
      mouth_before: this.mouthBefore,
      mouth_after: this.mouthAfter,
      eyebrow_left: this.eyebrowLeft,
      eyebrow_right: this.eyebrowRight,
    };

    for (const [name, object] of Object.entries(requiredParts)) {
      if (!object) {
        console.warn(`파츠를 찾지 못했습니다: ${name}`);
      }
    }

    console.log('프레시 파츠:', requiredParts);
  }

  setExpression(isFalling) {
    if (this.mouthBefore) {
      this.mouthBefore.visible = !isFalling;
    }

    if (this.mouthAfter) {
      this.mouthAfter.visible = isFalling;
    }

    if (this.eyebrowLeft) {
      this.eyebrowLeft.visible = isFalling;
    }

    if (this.eyebrowRight) {
      this.eyebrowRight.visible = isFalling;
    }
  }

  setVisible(visible) {
    if (this.root) {
      this.root.visible = visible;
    }
  }

  reset() {
  if (!this.root) {
    return;
  }

  this.root.position.copy(
    this.originalPosition,
  );

  this.root.rotation.copy(
    this.originalRotation,
  );

  // 기본 입 O / 바뀐 입, 눈썹 X
  this.setExpression(false);

  this.elapsedTime = 0;
  this.state = 'idle';
}

  trigger() {
  if (!this.root) {
    console.warn('프레시 모델이 준비되지 않았습니다.');
    return;
  }

  this.reset();

  this.state = 'dropping';
  this.elapsedTime = 0;

  this.onStatus('FRESH 동작 실행');
}
  update(deltaTime) {
  if (!this.root) {
    return;
  }

  /**
   * 1단계: 귤 낙하
   */
  if (this.state === 'dropping') {
    this.elapsedTime += deltaTime;

    const progress = Math.min(
      this.elapsedTime / this.dropDuration,
      1,
    );

    // 처음에는 천천히, 갈수록 빨라지는 낙하
    const easedProgress = progress * progress;

    // 수직 낙하만 함
    this.root.position.y =
      this.originalPosition.y -
      this.dropDistance * easedProgress;

    /**
     * 회전 없음
     * 기존의 root.rotation 관련 코드는 전부 제거
     */

    if (progress >= 1) {
      // 정확한 착지 위치에 고정
      this.root.position.y =
        this.originalPosition.y -
        this.dropDistance;

      this.state = 'landed';
      this.elapsedTime = 0;

      this.onStatus('FRESH 착지');
    }

    return;
  }

  /**
   * 2단계: 착지 후 잠깐 기다림
   */
  if (this.state === 'landed') {
    this.elapsedTime += deltaTime;

    if (this.elapsedTime >= this.expressionDelay) {
      // 여기서 입 + 눈썹을 한 번에 변경
      this.setExpression(true);

      this.state = 'finished';

      this.onStatus('FRESH 표정 변화 완료');
    }

    return;
  }
}
}