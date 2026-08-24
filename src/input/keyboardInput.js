export function connectKeyboardInput(sceneManager) {
  function handleKeyDown(event) {
    if (event.key === '1') {
      console.log('1 → FRESH');
      sceneManager.trigger('fresh');
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}