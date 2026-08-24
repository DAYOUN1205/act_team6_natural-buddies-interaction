// 어떤 향 장면을 보여줄지 관리함.

export class SceneManager {
  constructor(app) {
  this.app = app;

  this.scenes = new Map();
  this.activeSceneName = null;
}

  async add(name, scentScene) {
    await scentScene.load();

    scentScene.setVisible(false);

    this.scenes.set(name, scentScene);
  }

  activate(name) {
  const nextScene =
    this.scenes.get(name);

  if (!nextScene) {
    console.warn(
      `등록되지 않은 장면입니다: ${name}`,
    );

    return;
  }

  /**
   * 기존 장면 숨기기
   */
  if (this.activeSceneName) {
    const currentScene =
      this.scenes.get(
        this.activeSceneName,
      );

    currentScene?.setVisible(false);

    currentScene
      ?.onDeactivate
      ?.();
  }

  /**
   * 다음 장면 배경 등 적용
   */
  nextScene.onActivate?.();

  /**
   * 디자이너 카메라가 있으면 사용
   */
  const cameraApplied =
    nextScene.applyCamera?.(
      this.app.camera,
      this.app.controls,
    );

  /**
   * 별도 카메라가 없는 장면은
   * 기존 자동 카메라 사용
   */
  if (
    !cameraApplied &&
    nextScene.root
  ) {
    this.app.controls.enabled =
      true;

    this.app.fitCameraToObject(
      nextScene.root,
    );
  }

  nextScene.setVisible(true);

  this.activeSceneName = name;
}

  trigger(
  name =
    this.activeSceneName,
) {
  const targetScene =
    this.scenes.get(name);

  if (!targetScene) {
    console.warn(
      `실행할 장면이 없습니다: ${name}`,
    );

    return;
  }

  /**
   * 먼저 기존 장면 숨기기
   */
  if (this.activeSceneName) {
    const currentScene =
      this.scenes.get(
        this.activeSceneName,
      );

    currentScene?.setVisible(false);

    currentScene
      ?.onDeactivate
      ?.();
  }

  /**
   * Floral 같은 경우
   * 열린 꽃이 순간적으로 보이지 않도록
   * 숨겨놓고 reset 먼저.
   */
  targetScene.setVisible(false);

  targetScene.onActivate?.();

  const cameraApplied =
    targetScene.applyCamera?.(
      this.app.camera,
      this.app.controls,
    );

  if (
    !cameraApplied &&
    targetScene.root
  ) {
    this.app.controls.enabled =
      true;

    this.app.fitCameraToObject(
      targetScene.root,
    );
  }

  /**
   * 닫힌 상태로 초기화 +
   * 애니메이션 시작
   */
  targetScene.trigger();

  /**
   * 그 다음 보여줌
   */
  targetScene.setVisible(true);

  this.activeSceneName = name;
}

  update(deltaTime) {
    if (!this.activeSceneName) {
      return;
    }

    const activeScene =
      this.scenes.get(this.activeSceneName);

    activeScene?.update(deltaTime);
  }

  getScene(name) {
    return this.scenes.get(name);
  }
}