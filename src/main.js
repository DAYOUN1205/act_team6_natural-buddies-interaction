import './style.css';

import { ThreeApp } from './core/ThreeApp.js';
import { SceneManager } from './core/SceneManager.js';

import { FreshScene } from './scenes/FreshScene.js';
import { FloralScene } from './scenes/FloralScene.js';

import { connectKeyboardInput } from './input/keyboardInput.js';

const canvas =
  document.querySelector('#scene');

const statusElement =
  document.querySelector('#status');

function setStatus(message) {
  if (!statusElement) return;

  statusElement.style.display = 'block';
  statusElement.textContent = message;
}

async function main() {
  const app =
    new ThreeApp(canvas);

  const sceneManager =
    new SceneManager(app);

  /**
   * FRESH
   */
  const freshScene =
    new FreshScene(
      app.scene,
      {
        modelUrl:
          '/models/fresh/fresh_0729.gltf',

        onStatus:
          setStatus,
      },
    );

  /**
   * FLORAL
   */
  const floralScene =
    new FloralScene(
      app.scene,
      {
        modelUrl:
          '/models/floral/floral.gltf',

        backgroundUrl:
          '/models/floral/background.exr',

        onStatus:
          setStatus,
      },
    );

  /**
   * SceneManager 등록
   */
  await sceneManager.add(
    'fresh',
    freshScene,
  );

  await sceneManager.add(
    'floral',
    floralScene,
  );

  /**
   * 시작 화면
   * 테스트 편의상 Fresh 표시
   */
  sceneManager.activate(
    'fresh',
  );

  /**
   * 공통 키보드 입력
   *
   * 1 = Fresh
   * 2 = Floral
   */
  connectKeyboardInput(
    sceneManager,
  );

  /**
   * 렌더 루프
   */
  app.start(
    (deltaTime) => {
      sceneManager.update(
        deltaTime,
      );
    },
  );

  setStatus(
    '1 = Fresh / 2 = Floral',
  );
}

main().catch((error) => {
  console.error(
    '앱 실행 중 오류 발생:',
    error,
  );

  setStatus(
    '실행 실패 — F12 콘솔 확인',
  );
});