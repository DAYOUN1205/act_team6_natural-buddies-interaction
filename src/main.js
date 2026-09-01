import './style.css';

import { ThreeApp } from './core/ThreeApp.js';
import { SceneManager } from './core/SceneManager.js';
import { AudioManager } from './audio/AudioManager.js';

import { FreshScene } from './scenes/FreshScene.js';
import { FloralScene } from './scenes/FloralScene.js';
import { WoodyScene } from './scenes/WoodyScene.js';
import { AmberScene } from './scenes/AmberScene.js';

import { connectKeyboardInput } from './input/keyboardInput.js';
import {  connectSerialInput, } from './input/serialInput.js';

const canvas = document.querySelector('#scene');
const statusElement = document.querySelector('#status');

function setStatus(message) {
  if (!statusElement) return;

  statusElement.style.display = 'block';
  statusElement.textContent = message;
}

async function main() {
  const app =
    new ThreeApp(canvas);

  const audioManager =
    new AudioManager();

  const sceneManager =
    new SceneManager(
      app,
      {
        onTrigger: (sceneName) => {
          audioManager.playScent(
            sceneName,
          );
        },
      },
    );

  /**
   * FLORAL
   */
  const floralScene = new FloralScene(app.scene, {
    modelUrl: '/models/floral/0830_flower.glb',
    backgroundUrl: '/models/floral/floral_background_final.png',
    onStatus: setStatus,
  });

  /**
   * WOODY
   */
  const woodyScene = new WoodyScene(app.scene, {
    modelUrl: '/models/woody/0831_woody_2.glb',
    backgroundUrl: '/models/woody/woody_background_2.png',
    onStatus: setStatus,
  });

  const freshScene =
  new FreshScene(
    app.scene,
    {
      videoUrl:
        '/videos/fresh_animation.mp4',

      onStatus: setStatus,
    },
  );

  const amberScene =
  new AmberScene(
    app.scene,
    {
      videoUrl:
        '/videos/amber_animation.mp4',

      onStatus: setStatus,
    },
  );

  
  /**
   * 모든 향 Scene 등록
   */
  
  await sceneManager.add(
    'floral',
    floralScene,
  );

  await sceneManager.add(
    'woody',
    woodyScene,
  );

  await sceneManager.add(
    'fresh',
    freshScene,
  );

  await sceneManager.add(
    'amber',
    amberScene,
  );

  /**
   * 초기 화면
   */
  sceneManager.activate('fresh');

  /**
   * 공통 키보드 입력
   *
   * 1 = Fresh
   * 2 = Floral
   * 3 = Woody
   * 4 = Amber
   */
  connectKeyboardInput(sceneManager);

  const connectSensorButton =
  document.querySelector(
    '#connect-sensor',
  );

  connectSensorButton
  ?.addEventListener(
    'click',
    async () => {
      try {
        await connectSerialInput(
          sceneManager,
          {
            onStatus: setStatus,
          },
        );

        connectSensorButton.style.display =
          'none';
      } catch (error) {
        console.error(
          '센서 연결 실패:',
          error,
        );

        setStatus(
          '센서 연결 실패',
        );
      }
    },
  );
  
  /**
   * 렌더 루프
   */
  app.start((deltaTime) => {
    sceneManager.update(deltaTime);
  });

  setStatus(
    '1 = Fresh / 2 = Floral / 3 = Woody / 4 = Amber',
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