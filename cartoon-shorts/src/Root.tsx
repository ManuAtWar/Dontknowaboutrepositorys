import React from 'react';
import {Composition} from 'remotion';
import {Woodpecker} from './woodpecker/Woodpecker';
import {DURATION, FPS} from './woodpecker/lib';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Woodpecker"
    component={Woodpecker}
    durationInFrames={Math.round(DURATION * FPS)}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
