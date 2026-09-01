export function connectKeyboardInput(sceneManager) {
  const keyMap = {
    '1': 'fresh',
    '2': 'floral',
    '3': 'woody',
    '4': 'amber',
  };

  function handleKeyDown(event) {
    const sceneName = keyMap[event.key];

    if (!sceneName) return;

    console.time('scene-switch');

    sceneManager.trigger(sceneName);

    console.timeEnd('scene-switch');

    console.log(
      `${event.key} → ${sceneName.toUpperCase()}`,
    );
  }

  window.addEventListener(
    'keydown',
    handleKeyDown,
  );

  return () => {
    window.removeEventListener(
      'keydown',
      handleKeyDown,
    );
  };
}