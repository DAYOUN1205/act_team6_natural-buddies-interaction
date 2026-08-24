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

    console.log(
      `${event.key} → ${sceneName.toUpperCase()}`,
    );

    sceneManager.trigger(sceneName);
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