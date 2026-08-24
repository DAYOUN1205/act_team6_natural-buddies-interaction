export function connectKeyboardInput(sceneManager) {
  function handleKeyDown(event) {
    if (event.key === '2') {
      console.log('2 → FLORAL');
      sceneManager.trigger('floral');
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}