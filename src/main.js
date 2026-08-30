import './style.css';

import { ThreeApp } from './core/ThreeApp.js';
import { SceneManager } from './core/SceneManager.js';
import { FloralScene } from './scenes/FloralScene.js';
import { connectKeyboardInput } from './input/keyboardInput.js';

const canvas = document.querySelector('#scene');
const statusElement = document.querySelector('#status');

function setStatus(message) {
  if (!statusElement) return;

  statusElement.style.display = 'block';
  statusElement.textContent = message;
}

async function main() {
  const app = new ThreeApp(canvas);
  const sceneManager = new SceneManager(app);

  const floralScene = new FloralScene(app.scene, {
    modelUrl: '/models/floral/0830_flower.glb',
    backgroundUrl: '/models/floral/background.exr',
    onStatus: setStatus,
  });

  await sceneManager.add('floral', floralScene);

  sceneManager.activate('floral');

  connectKeyboardInput(sceneManager);

  app.start((deltaTime) => {
    sceneManager.update(deltaTime);
  });

  setStatus('2 = Floral');
}

main().catch((error) => {
  console.error('앱 실행 중 오류 발생:', error);
  setStatus('실행 실패 — F12 콘솔 확인');
});