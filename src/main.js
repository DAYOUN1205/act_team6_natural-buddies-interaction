import './style.css';

import { ThreeApp } from './core/ThreeApp.js';
import { SceneManager } from './core/SceneManager.js';
import { FreshScene } from './scenes/FreshScene.js';
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

  const freshScene = new FreshScene(app.scene, {
    modelUrl: '/models/fresh/fresh_0729.gltf',
    onStatus: setStatus,
  });

  await sceneManager.add('fresh', freshScene);

  sceneManager.activate('fresh');

  connectKeyboardInput(sceneManager);

  app.start((deltaTime) => {
    sceneManager.update(deltaTime);
  });

  setStatus('1 = Fresh');
}

main().catch((error) => {
  console.error('앱 실행 중 오류 발생:', error);
  setStatus('실행 실패 — F12 콘솔 확인');
});