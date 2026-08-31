import {
  VideoScene,
} from './VideoScene.js';


export class FreshScene
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
          '/videos/fresh_animation.mp4',
      },
    );
  }
}