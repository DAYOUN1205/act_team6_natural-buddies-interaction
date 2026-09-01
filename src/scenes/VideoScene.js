export class VideoScene {
  constructor(parentScene, options = {}) {
    this.parentScene = parentScene;

    this.videoUrl = options.videoUrl;

    this.onStatus =
      options.onStatus ?? (() => {});

    this.video = null;
  }


  async load() {
    this.video =
      document.createElement('video');

    this.video.src =
      this.videoUrl;

    this.video.preload = 'auto';

    // 센서 입력에서도 autoplay 막히지 않도록
    this.video.muted = true;

    this.video.playsInline = true;

    // 영상 반복 재생
    this.video.loop = true;

    /**
     * Three.js canvas 위에
     * 전체 화면으로 표시
     */
    Object.assign(
      this.video.style,
      {
        position: 'fixed',

        left: '0',
        top: '0',

        width: '100vw',
        height: '100vh',

        objectFit: 'cover',

        background: '#000',

        zIndex: '100',

        pointerEvents: 'none',

        display: 'none',
      },
    );

    document.body.appendChild(
      this.video,
    );

    await new Promise(
      (resolve, reject) => {
        this.video.addEventListener(
          'loadedmetadata',
          resolve,
          {
            once: true,
          },
        );

        this.video.addEventListener(
          'error',
          reject,
          {
            once: true,
          },
        );
      },
    );

    console.log(
      'VideoScene 로딩 완료:',
      this.videoUrl,
      this.video.duration,
    );

    this.onStatus(
      '영상 로딩 완료',
    );
  }


  setVisible(visible) {
    this.isActive = visible;

    /**
     * 다른 향으로 넘어갈 때만 숨김
     */
    if (!visible && this.video) {
      this.video.pause();

      this.video.currentTime = 0;

      this.video.style.display =
        'none';
    }
  }

  onDeactivate() {
    this.isActive = false;

    if (!this.video) {
      return;
    }

    this.video.pause();

    this.video.currentTime = 0;

    this.video.style.display =
      'none';
  }


  async trigger() {
    if (!this.video) {
      console.warn(
        '영상이 아직 준비되지 않았습니다.',
      );

      return;
    }

    /**
     * 센서가 다시 들어오면
     * 무조건 처음부터 재생
     */
    this.video.pause();

    this.video.currentTime = 0;

    this.video.style.display =
      'block';

    try {
      await this.video.play();

      this.onStatus(
        '영상 재생 중',
      );
    } catch (error) {
      console.error(
        '영상 재생 실패:',
        error,
      );
    }
  }


  /**
   * 영상 장면이라
   * Three.js 카메라는 건드릴 필요 없음
   */
  applyCamera() {
    return true;
  }
}