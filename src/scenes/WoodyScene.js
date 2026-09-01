import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class WoodyScene {
  constructor(parentScene, options = {}) {
    this.enableCameraDebug =
      options.enableCameraDebug ?? true;
    
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
    this.bugOneCurve = null;
    this.bugOneFlightDuration = 12; // 한 바퀴 도는 데 걸리는 시간 (초단위)
    this.bugTwoCurve = null;
    this.bugTwoFlightDuration = 10;

    /**
     * Woody 캐릭터
     */
    this.characterUrl =
      options.characterUrl ??
      '/models/woody/woody_character.glb';

    this.characterWrapper = null;
    this.characterRoot = null;

    this.characterMixer = null;
    this.characterAction = null;

    // 캐릭터 앞 작은 반딧불
    this.characterFirefly = null;
    this.characterFireflyInitial = null;

    // 반딧불 움직임 설정
    this.characterFireflyRadiusX = 0.2;
    this.characterFireflyRadiusY = 0.08;
    this.characterFireflyRadiusZ = 0.04;

    this.characterFireflySpeed = 1.4;

    this.characterStartPosition =
      new THREE.Vector3();

    this.characterEndPosition =
      new THREE.Vector3();

    this.characterMoveElapsed = 0;

    // 앞으로 걸어오는 시간
    this.characterMoveDuration = 3;

    // Woody 기준 이동 거리
    // 카메라 쪽이 +Z 방향이므로 +Z로 이동
    this.characterMoveOffset =
      new THREE.Vector3(
        0,
        0,
        0.015,
      );

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
      if (!object.isMesh || !object.material) {
        return;
      }

      // 이 mesh에 vertex color가 들어있는지 확인
      const hasVertexColor =
        !!object.geometry?.getAttribute('color');

      if (!hasVertexColor) {
        return;
      }

      console.log(
        'Woody vertex color 제거:',
        object.name,
      );

      if (Array.isArray(object.material)) {
        object.material =
          object.material.map((material) => {
            const cloned = material.clone();

            cloned.vertexColors = false;
            cloned.needsUpdate = true;

            return cloned;
          });
      } else {
        object.material =
          object.material.clone();

        object.material.vertexColors = false;
        object.material.needsUpdate = true;
      }
    });

    this.root.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = false;
        object.receiveShadow = false;
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
     * 두 반딧불의 initial 값이 모두 만들어진 뒤
     * 각각의 이동 경로 생성
     */
    this.createBugOnePath();
    this.createBugTwoPath();

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

    await this.loadCharacter(loader);

    /**
     * 5. EXR 배경
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

      console.log(
        'Woody PNG 배경 로딩 완료',
      );
    } catch (error) {
      console.error(
        'Woody PNG 배경 로딩 실패:',
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

    // 화면에 보이는 배경
    this.parentScene.background =
      this.backgroundTexture;

    this.parentScene.backgroundIntensity = 1.0;
    this.parentScene.backgroundBlurriness = 0;

    // PNG는 환경광으로 사용하지 않음
    this.parentScene.environment = null;
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
    if (!this.root) {
      return false;
    }

    // 최종 고정 카메라 값
    targetCamera.position.set(
      0.008033533052571587,
      0.00876225597575316,
      0.06820836423768326,
    );

    targetCamera.quaternion.set(
      -0.00364156717482878,
      0.03247058611709302,
      0.00011830699051420253,
      0.9994660504635362,
    );

    targetCamera.fov = 35;
    targetCamera.near = 0.005;
    targetCamera.far = 1;
    targetCamera.zoom = 1;

    targetCamera.aspect =
      window.innerWidth / window.innerHeight;

    targetCamera.updateProjectionMatrix();
    targetCamera.updateMatrix();
    targetCamera.updateMatrixWorld(true);

    if (controls) {
      controls.target.set(
        0.004215122764930128,
        0.007185220975660181,
        -0.018231343477964394,
      );

      // 기본은 고정
      controls.enabled =
        this.enableCameraDebug;

      controls.update();
    }

    // ===== 디버그용 함수들 유지 =====

    window.getWoodyCamera = () => {
      console.log(
        '===== WOODY CAMERA =====',
      );

      console.log(
        'position:',
        targetCamera.position.x,
        targetCamera.position.y,
        targetCamera.position.z,
      );

      console.log(
        'quaternion:',
        targetCamera.quaternion.x,
        targetCamera.quaternion.y,
        targetCamera.quaternion.z,
        targetCamera.quaternion.w,
      );

      console.log(
        'fov:',
        targetCamera.fov,
      );

      console.log(
        'target:',
        controls?.target.x,
        controls?.target.y,
        controls?.target.z,
      );
    };

    window.panWoody = (
      x = 0,
      y = 0,
      z = 0,
    ) => {
      const offset =
        new THREE.Vector3(x, y, z);

      targetCamera.position.add(offset);

      if (controls) {
        controls.target.add(offset);
        controls.update();
      }

      targetCamera.updateMatrix();
      targetCamera.updateMatrixWorld(true);

      console.log(
        'Woody pan:',
        'position =',
        targetCamera.position.toArray(),
        'target =',
        controls?.target.toArray(),
      );
    };

    window.enableWoodyCameraDebug =
      () => {
        if (!controls) return;

        controls.enabled = true;
        console.log(
          'Woody camera debug ON',
        );
      };

    window.disableWoodyCameraDebug =
      () => {
        if (!controls) return;

        controls.enabled = false;
        console.log(
          'Woody camera debug OFF',
        );
      };

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
     * 캐릭터 초기화
     */
    this.characterMoveElapsed = 0;

    if (this.characterWrapper) {
      this.characterWrapper.position.copy(
        this.characterStartPosition,
      );
    }

    /**
     * 걷기 애니메이션 시작
     */
    if (this.characterAction) {
      this.characterAction
        .reset()
        .setLoop(
          THREE.LoopRepeat,
          Infinity,
        )
        .play();
    }

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
      const bugOneStart =
        this.bugOneCurve?.getPointAt(0);

      if (bugOneStart) {
        this.bugOne.position.copy(
          bugOneStart,
        );
      } else {
        this.bugOne.position.copy(
          this.bugOneInitial.position,
        );
      }

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
     * 캐릭터 걷기 animation은
     * 계속 반복
     */
    if (this.characterMixer) {
      this.characterMixer.update(
        deltaTime,
      );
    }


    /**
     * 캐릭터 위치 이동은
     * 처음 4.5초 동안만
     */
    if (
      this.characterWrapper &&
      this.characterMoveElapsed <
        this.characterMoveDuration
    ) {
      this.characterMoveElapsed +=
        deltaTime;

      const t =
        Math.min(
          this.characterMoveElapsed /
            this.characterMoveDuration,
          1,
        );

      /**
       * 처음/끝에서 너무 갑자기
       * 출발하거나 멈추지 않도록
       * 부드럽게 보간
       */
      const smoothT =
        t * t * (3 - 2 * t);

      this.characterWrapper.position.lerpVectors(
        this.characterStartPosition,
        this.characterEndPosition,
        smoothT,
      );
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

    this.updateCharacterFirefly(
    this.elapsedTime,
  );
  }

  async loadCharacter(loader) {
    try {
      const gltf =
        await loader.loadAsync(
          this.characterUrl,
        );

      this.characterRoot =
        gltf.scene;

        /**
       * 캐릭터 앞 작은 반딧불
       */
      this.characterFirefly =
        this.characterRoot.getObjectByName(
          'Sphere',
        );

      if (this.characterFirefly) {
        this.characterFireflyInitial =
          this.characterFirefly.position.clone();

        console.log(
          'Woody character firefly:',
          this.characterFirefly,
        );

        console.log(
          'Firefly initial position:',
          this.characterFireflyInitial.toArray(),
        );
      } else {
        console.warn(
          '캐릭터 반딧불 Sphere를 찾지 못했습니다.',
        );
      }

      /**
       * 캐릭터 전체를 움직이기 위한 Wrapper.
       *
       * Armature animation은 characterRoot에서,
       * 실제 앞으로 이동은 Wrapper에서 처리한다.
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
       * 캐릭터 크기
       */
      this.characterWrapper.scale.setScalar(
        0.0055,
      );


      /**
       * 모델의 가장 아래 지점을
       * Wrapper의 Y=0으로 맞춤.
       */
      const box =
        new THREE.Box3().setFromObject(
          this.characterRoot,
        );

      this.characterRoot.position.y -=
        box.min.y;

      /**
       * 최종 도착 위치
       * 우리가 화면에서 맞춰둔 위치는 고정
       */
      this.characterEndPosition.set(
        0.002,
        -0.0045,
        0.005,
      );

      /**
       * 시작 위치는
       * 최종 위치에서 이동거리만큼 뒤로 계산
       */
      this.characterStartPosition
        .copy(this.characterEndPosition)
        .sub(this.characterMoveOffset);

      /**
       * 처음에는 시작점에 배치
       */
      this.characterWrapper.position.copy(
        this.characterStartPosition,
      );

      /**
       * 캐릭터 걷기 Animation
       */
      if (gltf.animations.length > 0) {
        this.characterMixer =
          new THREE.AnimationMixer(
            this.characterRoot,
          );

        const clip =
          gltf.animations.find(
            (animation) =>
              animation.name ===
              'ArmatureAction',
          ) ??
          gltf.animations[0];

        this.characterAction =
          this.characterMixer.clipAction(
            clip,
          );

        // 걷기 애니메이션 속도
        this.characterAction.timeScale = 0.5;

        this.characterAction.setLoop(
          THREE.LoopRepeat,
          Infinity,
        );

        // trigger 전에는 멈춤
        this.characterAction.stop();

        console.log(
          'Woody character animation:',
          clip.name,
          `${clip.duration}초`,
        );
      }


      /**
       * 위치 조절용 콘솔 함수
       */
      window.setWoodyCharacter = (
        x,
        y,
        z,
        scale = 0.012,
      ) => {
        this.characterWrapper.position.set(
          x,
          y,
          z,
        );

        this.characterWrapper.scale.setScalar(
          scale,
        );

        // 지금 조절한 위치를 최종 도착점으로 저장
        this.characterEndPosition.copy(
          this.characterWrapper.position,
        );

        // 시작점은 그보다 뒤에서 자동 계산
        this.characterStartPosition
          .copy(this.characterEndPosition)
          .sub(this.characterMoveOffset);

        console.log(
          'Woody character:',
          {
            position:
              this.characterWrapper.position
                .toArray(),

            scale:
              this.characterWrapper.scale.x,
          },
        );
      };

      window.moveWoodyCharacter = (
        x = 0,
        y = 0,
        z = 0,
      ) => {
        this.characterWrapper.position.add(
          new THREE.Vector3(x, y, z),
        );

        this.characterEndPosition.copy(
          this.characterWrapper.position,
        );

        this.characterStartPosition
          .copy(this.characterEndPosition)
          .sub(this.characterMoveOffset);

        console.log(
          'Woody character position:',
          this.characterWrapper.position.toArray(),
        );
      };

      window.scaleWoodyCharacter = (
        scale,
      ) => {
        this.characterWrapper.scale.setScalar(
          scale,
        );

        console.log(
          'Woody character scale:',
          scale,
        );
      };


      console.log(
        'Woody 캐릭터 로딩 완료',
      );
    } catch (error) {
      console.error(
        'Woody 캐릭터 로딩 실패:',
        error,
      );
    }
  }

  updateCharacterFirefly(time) {
    if (
      !this.characterFirefly ||
      !this.characterFireflyInitial
    ) {
      return;
    }

    const base =
      this.characterFireflyInitial;

    const t =
      time *
      this.characterFireflySpeed;

    /**
     * 완전한 원이 아니라
     * 살짝 불규칙한 3D 타원 궤도.
     *
     * 캐릭터 앞에서 멀리 벗어나지 않고
     * 작은 반딧불처럼 둥글게 떠다님.
     */
    this.characterFirefly.position.x =
      base.x +
      Math.cos(t) *
        this.characterFireflyRadiusX;

    this.characterFirefly.position.y =
      base.y +
      Math.sin(t) *
        this.characterFireflyRadiusY;

    this.characterFirefly.position.z =
      base.z +
      Math.sin(t * 0.65) *
        this.characterFireflyRadiusZ;
    }

  createBugOnePath() {
    if (!this.bugOneInitial) {
      return;
    }

    const base =
      this.bugOneInitial.position;

    const start =
      new THREE.Vector3(
        base.x - 0.013,
        base.y + 0.00125,
        base.z - 0.0135,
      );

    this.bugOneCurve =
      new THREE.CatmullRomCurve3(
        [
          // 1. 새로운 시작점 — 동선 가운데
          start,

          // 2. 중앙에서 오른쪽으로 자연스럽게 이동
          new THREE.Vector3(
            base.x - 0.006,
            base.y + 0.0035,
            base.z - 0.010,
          ),

          // 3. 오른쪽 영역 진입
          new THREE.Vector3(
            base.x + 0.001,
            base.y + 0.004,
            base.z - 0.007,
          ),

          // 4. 오른쪽으로 넓게
          new THREE.Vector3(
            base.x + 0.005,
            base.y + 0.0045,
            base.z - 0.004,
          ),

          // 5. 오른쪽 끝 진입
          new THREE.Vector3(
            base.x + 0.008,
            base.y + 0.0045,
            base.z + 0.001,
          ),

          // 6. 오른쪽 바깥쪽
          new THREE.Vector3(
            base.x + 0.010,
            base.y + 0.0041,
            base.z + 0.005,
          ),

          // 7. 가장 오른쪽
          new THREE.Vector3(
            base.x + 0.011,
            base.y + 0.0037,
            base.z + 0.008,
          ),

          // 8. 둥글게 방향 전환
          new THREE.Vector3(
            base.x + 0.0105,
            base.y + 0.0033,
            base.z + 0.009,
          ),

          // 9. 왼쪽 방향으로 서서히 전환
          new THREE.Vector3(
            base.x + 0.0095,
            base.y + 0.0029,
            base.z + 0.008,
          ),

          // 10. 완만하게 하강하면서 왼쪽
          new THREE.Vector3(
            base.x + 0.008,
            base.y + 0.0025,
            base.z + 0.0065,
          ),

          // 11. 계속 왼쪽으로
          new THREE.Vector3(
            base.x + 0.006,
            base.y + 0.0021,
            base.z + 0.0045,
          ),

          // 12. 중앙 쪽으로 접근
          new THREE.Vector3(
            base.x + 0.0035,
            base.y + 0.0018,
            base.z + 0.0025,
          ),

          // 13. 오른쪽 영역을 완전히 빠져나옴
          // 기존 base.y = 0 으로 떨어지지 않게 함
          new THREE.Vector3(
            base.x + 0.001,
            base.y + 0.0016,
            base.z + 0.001,
          ),

          // 14. 왼쪽 방향 유지
          new THREE.Vector3(
            base.x - 0.003,
            base.y + 0.0016,
            base.z + 0.001,
          ),

          // 15. 기존 왼쪽 진입 구간
          new THREE.Vector3(
            base.x - 0.010,
            base.y + 0.002,
            base.z + 0.002,
          ),

          // 16. 나무 앞쪽으로 접근
          new THREE.Vector3(
            base.x - 0.025,
            base.y + 0.001,
            base.z + 0.012,
          ),

          // 17. 나무 앞쪽 통과
          new THREE.Vector3(
            base.x - 0.035,
            base.y + 0.0015,
            base.z + 0.020,
          ),

          // 18. 나뭇잎 아래로 왼쪽
          new THREE.Vector3(
            base.x - 0.047,
            base.y + 0.002,
            base.z + 0.015,
          ),

          // 19. 나무 거의 벗어남
          new THREE.Vector3(
            base.x - 0.052,
            base.y + 0.003,
            base.z + 0.007,
          ),

          // 20. 왼쪽 끝에서 상승
          new THREE.Vector3(
            base.x - 0.055,
            base.y + 0.006,
            base.z - 0.004,
          ),

          // 21. 나무 뒤쪽
          new THREE.Vector3(
            base.x - 0.052,
            base.y + 0.003,
            base.z - 0.016,
          ),

          // 22. 가장 뒤쪽 + 살짝 아래
          new THREE.Vector3(
            base.x - 0.045,
            base.y - 0.002,
            base.z - 0.030,
          ),

          // 23. 뒤쪽에서 오른쪽으로 복귀
          new THREE.Vector3(
            base.x - 0.034,
            base.y - 0.004,
            base.z - 0.026,
          ),

          // 24. 시작점 직전
          new THREE.Vector3(
            base.x - 0.020,
            base.y - 0.001,
            base.z - 0.017,
          ),
        ],

        true,
        'centripetal',
      );

    /**
     * getPointAt()의 거리 계산 정밀도 증가.
     * 의도하지 않은 미세한 속도 튐 방지.
     */
    this.bugOneCurve.arcLengthDivisions = 1000;
    this.bugOneCurve.updateArcLengths();
  }

createBugTwoPath() {
  if (!this.bugTwoInitial) {
    return;
  }

  const base =
    this.bugTwoInitial.position;

  this.bugTwoCurve =
    new THREE.CatmullRomCurve3(
      [
        // 1. 왼쪽 끝으로 접근
        new THREE.Vector3(
          base.x - 0.014,
          base.y - 0.003,
          base.z - 0.002,
        ),

        // 2. 왼쪽 끝 진입
        new THREE.Vector3(
          base.x - 0.018,
          base.y - 0.0045,
          base.z + 0.001,
        ),

        // 3. 왼쪽 아래쪽
        new THREE.Vector3(
          base.x - 0.020,
          base.y - 0.005,
          base.z + 0.004,
        ),

        // 4. 가장 왼쪽
        // X 이동은 거의 멈추고 Z로 회전 시작
        new THREE.Vector3(
          base.x - 0.0205,
          base.y - 0.0048,
          base.z + 0.008,
        ),

        // 5. 가장 왼쪽 부근 유지
        // X는 거의 그대로, Z만 계속 변화
        new THREE.Vector3(
          base.x - 0.020,
          base.y - 0.004,
          base.z + 0.012,
        ),

        // 6. 오른쪽으로 아주 천천히 방향 전환
        new THREE.Vector3(
          base.x - 0.018,
          base.y - 0.003,
          base.z + 0.015,
        ),

        // 7. 오른쪽 복귀 시작
        new THREE.Vector3(
          base.x - 0.014,
          base.y - 0.0015,
          base.z + 0.014,
        ),

        // 8. 오른쪽으로 자연스럽게 빠져나옴
        new THREE.Vector3(
          base.x - 0.008,
          base.y,
          base.z + 0.010,
        ),

        // 9. 본격적으로 가운데 방향으로 이동
        new THREE.Vector3(
          base.x - 0.001,
          base.y + 0.001,
          base.z + 0.005,
        ),
      ],

      true,
      'centripetal',
    );

  this.bugTwoCurve.arcLengthDivisions = 500;
}

  updateBugOne(time) {
    if (
      !this.bugOne ||
      !this.bugOneCurve
    ) {
      return;
    }

    /**
     * 0 → 1 진행도
     *
     * 12초 동안 전체 경로 한 바퀴
     */
    const progress =
      (time /
        this.bugOneFlightDuration) %
      1;

    /**
     * getPointAt을 사용하면
     * 곡선 길이를 기준으로 움직여서
     * 속도가 비교적 일정함
     */
    const position =
      this.bugOneCurve.getPointAt(
        progress,
      );

    this.bugOne.position.copy(
      position,
    );

    /**
     * 아주 약간 떠다니는 느낌만 추가
     *
     * 기본 경로에는 영향을 거의 안 줌
     */
    this.bugOne.position.y +=
      Math.sin(time * 2.0) *
      this.motionScale *
      0.08;

    this.bugOne.rotation.z =
      Math.sin(time * 1.8) *
      0.08;
  }

  updateBugTwo(time) {
  if (
    !this.bugTwo ||
    !this.bugTwoCurve
  ) {
    return;
  }

  const progress =
    (time /
      this.bugTwoFlightDuration) %
    1;

  const position =
    this.bugTwoCurve.getPointAt(
      progress,
    );

  this.bugTwo.position.copy(
    position,
  );

  /**
   * 큰 움직임은 Curve가 담당하고,
   * 아주 미세한 떠다니는 느낌만 추가
   */
  this.bugTwo.position.y +=
    Math.sin(time * 1.6 + 1.2) *
    0.00025;

  this.bugTwo.rotation.z =
    Math.sin(time * 1.7 + 0.8) *
    0.07;
}
}