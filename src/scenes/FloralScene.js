import * as THREE from 'three';

import { GLTFLoader } from
  'three/addons/loaders/GLTFLoader.js';

import { EXRLoader } from
  'three/addons/loaders/EXRLoader.js';

export class FloralScene {
  constructor(parentScene, options = {}) {
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

    this.sourceCamera = null;
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
    this.bloomDuration = 1.0;

    /**
     * flower1 시작 후
     * flower2가 시작되는 시점
     *
     * 디자이너 요청:
     * 약 1초 텀
     */
    this.flower2Delay = 1.0;

    /**
     * 한 꽃 안에서도
     * 꽃잎이 완벽하게 동시에 움직이지 않고
     * 살짝 시간차를 줌
     */
    this.petalDelay = 0.025;

    /**
     * 닫혀 있을 때 꽃잎 크기
     */
    this.closedScale = 0.65;

    /**
     * 꽃잎이 접혀 있는 정도
     */
    this.closedAngle =
      THREE.MathUtils.degToRad(68);
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
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    this.parentScene.add(this.root);

    /**
     * 디자이너가 넣어둔 카메라
     */
    this.sourceCamera =
      this.root.getObjectByName('RS Camera') ??
      this.root.getObjectByName('RS_Camera');

    if (!this.sourceCamera) {
      console.warn(
        'RS Camera를 찾지 못했습니다.',
      );
    }

    this.findFlowers();

    this.applyClayMaterials();

    this.prepareFlowers();  

    /**
     * EXR 배경
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
    'Floral EXR 배경 로딩 완료',
  );

} catch (error) {
  console.error(
    'Floral EXR 배경 로딩 실패:',
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
  smoothMainFlowerGeometry() {
  const meshes = [
    ...this.flower1.petals,
    ...this.flower1.center,
    ...this.flower2.petals,
    ...this.flower2.center,
  ];

  meshes.forEach((mesh) => {
    if (!mesh.isMesh || !mesh.geometry) {
      return;
    }

    let geometry = mesh.geometry.clone();

    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');

    geometry = mergeVertices(
      geometry,
      1e-4,
    );

    geometry.computeVertexNormals();
    geometry.normalizeNormals();

    mesh.geometry = geometry;
  });
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

  applyFlowerColors() {
  /**
   * 흑백으로 export된 yarn 텍스처 위에
   * Three.js에서 색을 곱해준다.
   *
   * texture 자체의 실/섬유 질감은 그대로 유지됨.
   */

  const petalColor = new THREE.Color('#e1b83f');
  const centerColor = new THREE.Color('#c94d4d');

  const tintMeshes = (meshes, color) => {
    meshes.forEach((mesh) => {
      /**
       * 같은 material을 다른 오브젝트와 공유할 수 있으므로
       * 반드시 clone해서 이 꽃만 수정한다.
       */
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => {
          const cloned = material.clone();

          cloned.color.copy(color);

          cloned.needsUpdate = true;

          return cloned;
        });
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();

        mesh.material.color.copy(color);

        mesh.material.needsUpdate = true;
      }
    });
  };

  /**
   * 꽃잎 = 금색/노란색
   */
  tintMeshes(
    this.flower1.petals,
    petalColor,
  );

  tintMeshes(
    this.flower2.petals,
    petalColor,
  );

  /**
   * 중앙부 = 붉은색
   */
  tintMeshes(
    this.flower1.center,
    centerColor,
  );

  tintMeshes(
    this.flower2.center,
    centerColor,
  );
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
   * 이 장면이 선택될 때
   */
  onActivate() {
  if (this.backgroundTexture) {
    this.parentScene.background =
      this.backgroundTexture;

    this.parentScene.environment =
      this.backgroundTexture;

    this.parentScene.backgroundIntensity =
      1.0; // 뒤에 보이는 EXR(배경?) 밝기

    this.parentScene.environmentIntensity =
      0.6; // EXR이 모델을 비추는 세기
  }
}

  /**
   * glTF에 들어 있는
   * RS Camera를 실제 렌더 카메라에 복사
   */
  applyCamera(targetCamera, controls) {
  if (!this.root) {
    return false;
  }

  targetCamera.position.set(
    0.6021225779128823,
    1.918462110789069,
    2.5484613407312144,
  );

  targetCamera.quaternion.set(
    -0.05697375343231073,
    0.10785548454364136,
    0.006191283430572616,
    0.9925134023695463,
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
      0.10149076075744884,
      1.649999999999999,
      0.2721927360005072,
    );

    controls.enabled = false;
    controls.update();
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

    this.onStatus(
      'FLORAL 꽃 개화 시작',
    );
  }

  update(deltaTime) {
    if (
      this.state !==
      'blooming'
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
      this.flower1,
      this.elapsedTime,
    );

    /**
     * flower2
     *
     * 1초 뒤 시작
     */
    this.updateFlower(
      this.flower2,
      this.elapsedTime -
        this.flower2Delay,
    );

    const flower2TotalDuration =
      this.flower2Delay +
      this.bloomDuration +
      this.petalDelay *
        Math.max(
          this.flower2.petals.length -
            1,
          0,
        );

    if (
      this.elapsedTime >=
      flower2TotalDuration
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
  applyClayMaterials() {
  const targetMaterials = new Set([
    'Material.013', // 꽃잎
    'Material.019', // 꽃잎
    'Material.010', // 중앙
    'Material.023', // 중앙
  ]);

  this.root.traverse((object) => {
    if (!object.isMesh || !object.material) {
      return;
    }

    const materials =
      Array.isArray(object.material)
        ? object.material
        : [object.material];

    const converted =
      materials.map((material) => {
        if (!targetMaterials.has(material.name)) {
          return material;
        }

        const clay =
          new THREE.MeshPhysicalMaterial({
            name: `${material.name}_Clay`,

            // GLB의 원래 색 그대로
            color: material.color.clone(),

            // 꽃/클레이는 비금속
            metalness: 0,

            /**
             * 너무 높이면 분필처럼 되고
             * 너무 낮으면 플라스틱처럼 됨.
             *
             * 레퍼런스는 satin clay 쪽.
             */
            roughness: 0.55,

            /**
             * 부드러운 흰색 highlight
             */
            specularIntensity: 0.45,
            specularColor: new THREE.Color(
              0xffffff,
            ),

            ior: 1.45,

            /**
             * 클레이에는 코팅층이 필요 없음.
             * 오히려 clearcoat가 들어가면
             * 플라스틱/도자기 느낌이 강해짐.
             */
            clearcoat: 0,

            /**
             * sheen은 원래 천/섬유 표현용 성격이
             * 강하므로 일단 사용하지 않음.
             */
            sheen: 0,

            envMapIntensity: 0.5,

            side: material.side,

            transparent:
              material.transparent,

            opacity:
              material.opacity,

            depthWrite:
              material.depthWrite,

            depthTest:
              material.depthTest,
          });

        clay.flatShading = false;

        clay.needsUpdate = true;

        return clay;
      });

    object.material =
      Array.isArray(object.material)
        ? converted
        : converted[0];
  });
}
}