import {
  VideoScene,
} from './VideoScene.js';


export class AmberScene
  extends VideoScene {

  constructor(
    parentScene,
    options = {},
  ) {
    super(
      parentScene,
      {
        ...options,

        videoUrl:
          options.videoUrl ??
          '/videos/amber_animation.mp4',
      },
    );
  }
}