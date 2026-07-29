import './style.css';

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const statusElement = document.querySelector('#status');

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('canvas 요소를 찾을 수 없습니다.');
}

/**
 * 렌더러
 */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/**
 * 장면
 */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe8dd);

/**
 * 카메라
 */
const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.01,
  1000,
);

camera.position.set(0, 2, 6);

/**
 * 마우스로 모델을 돌려보기 위한 컨트롤
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * 조명
 */
const hemisphereLight = new THREE.HemisphereLight(
  0xffffff,
  0x526052,
  2.5,
);

scene.add(hemisphereLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 4);
mainLight.position.set(4, 6, 5);
mainLight.castShadow = true;

scene.add(mainLight);

/**
 * 애니메이션
 */
const clock = new THREE.Clock();
let mixer = null;

/**
 * 모델 크기에 맞춰 카메라 자동 배치
 */
function fitCameraToObject(object) {
  const boundingBox = new THREE.Box3().setFromObject(object);

  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  const maxSize = Math.max(size.x, size.y, size.z);

  if (maxSize === 0) {
    console.warn('모델 크기를 계산할 수 없습니다.');
    return;
  }

  const verticalFov = THREE.MathUtils.degToRad(camera.fov);

  const distance =
    (maxSize / (2 * Math.tan(verticalFov / 2))) * 1.5;

  camera.position.set(
    center.x,
    center.y + maxSize * 0.15,
    center.z + distance,
  );

  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

/**
 * glTF 모델 불러오기
 */
async function loadModel() {
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync(
      '/models/fresh/fresh_0727.gltf',
    );

    const model = gltf.scene;

    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    scene.add(model);
    fitCameraToObject(model);

    /**
     * 모델 내부 오브젝트 이름 확인
     */
    const nodeList = [];

    model.traverse((object) => {
      nodeList.push({
        name: object.name || '(이름 없음)',
        type: object.type,
      });
    });

    console.log('===== 모델 파츠 목록 =====');
    console.table(nodeList);

    /**
     * 모델 내부 애니메이션 확인
     */
    const animationList = gltf.animations.map(
      (animation, index) => ({
        index,
        name: animation.name || '(이름 없음)',
        duration: animation.duration,
      }),
    );

    console.log('===== 애니메이션 목록 =====');
    console.table(animationList);

    /**
     * idle 애니메이션 또는 첫 애니메이션 재생
     */
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);

      const idleAnimation =
        gltf.animations.find((animation) =>
          animation.name.toLowerCase().includes('idle'),
        ) ?? gltf.animations[0];

      mixer.clipAction(idleAnimation).play();
    }

    statusElement.textContent = '모델 로딩 완료';

    window.setTimeout(() => {
      statusElement.style.display = 'none';
    }, 2000);
  } catch (error) {
    console.error('glTF 로딩 실패:', error);

    statusElement.textContent =
      '모델 로딩 실패 — F12 콘솔을 확인하세요.';
  }
}

loadModel();

/**
 * 브라우저 크기 변경 대응
 */
function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height, false);
}

window.addEventListener('resize', resize);
resize();

/**
 * 반복 렌더링
 */
function animate() {
  const deltaTime = clock.getDelta();

  if (mixer) {
    mixer.update(deltaTime);
  }

  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);