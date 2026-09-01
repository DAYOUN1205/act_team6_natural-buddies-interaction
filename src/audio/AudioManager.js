export class AudioManager {
  constructor() {
    this.sounds = {
      amber: {
        audio:
          new Audio('/audio/amber_sound.mp3'),
        maxDuration: 3,
        volume: 1,
      },

      fresh: {
        audio:
          new Audio('/audio/fresh_sound.mp3'),
        maxDuration: 3,
        volume: 1,
      },

      woody: {
        audio:
          new Audio('/audio/woody_sound.mp3'),
        maxDuration: 3,
        volume: 1,
      },

      floral: {
        audio:
          new Audio('/audio/floral_sound.mp3'),
        maxDuration: 3,
        volume: 1,
      },
    };

    this.currentScent = null;
    this.stopTimer = null;

    Object.entries(
      this.sounds,
    ).forEach(
      ([name, config]) => {
        const { audio, volume } =
          config;

        audio.preload = 'auto';
        audio.loop = false;
        audio.volume = volume;

        audio.addEventListener(
          'ended',
          () => {
            if (
              this.currentScent === name
            ) {
              this.finishScent(name);
            }
          },
        );
      },
    );
  }


  async playScent(name) {
    const config =
      this.sounds[name];

    if (!config) {
      console.warn(
        `등록되지 않은 향 사운드: ${name}`,
      );

      return;
    }

    // 다른 향이 재생 중이면 종료
    this.stopCurrentScent();

    const {
      audio,
      maxDuration,
    } = config;

    this.currentScent = name;

    audio.currentTime = 0;

    try {
      await audio.play();
    } catch (error) {
      console.error(
        `${name} 사운드 재생 실패:`,
        error,
      );

      this.currentScent = null;
      return;
    }

    // Amber / Fresh는 3초만
    if (maxDuration !== null) {
      this.stopTimer =
        window.setTimeout(
          () => {
            if (
              this.currentScent === name
            ) {
              this.finishScent(name);
            }
          },
          maxDuration * 1000,
        );
    }
  }


  stopCurrentScent() {
    if (this.stopTimer !== null) {
      clearTimeout(
        this.stopTimer,
      );

      this.stopTimer = null;
    }

    if (!this.currentScent) {
      return;
    }

    const config =
      this.sounds[
        this.currentScent
      ];

    if (config) {
      config.audio.pause();
      config.audio.currentTime = 0;
    }

    this.currentScent = null;
  }


  finishScent(name) {
    if (
      this.currentScent !== name
    ) {
      return;
    }

    if (this.stopTimer !== null) {
      clearTimeout(
        this.stopTimer,
      );

      this.stopTimer = null;
    }

    const config =
      this.sounds[name];

    if (config) {
      config.audio.pause();
      config.audio.currentTime = 0;
    }

    this.currentScent = null;
  }
}