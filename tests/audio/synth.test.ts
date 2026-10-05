import { describe, it, expect } from 'vitest';
import { createSfx } from '../../src/audio/synth';
import { SOUND_IDS } from '../../src/audio/sound-ids';

describe('createSfx', () => {
  it('没有 AudioContext 的环境里所有调用都是安全的空操作', () => {
    const sfx = createSfx();
    expect(() => {
      sfx.unlock();
      for (const id of SOUND_IDS) sfx.play(id);
      sfx.setRain(true);
      sfx.setHeartbeat(true);
      sfx.setRain(false);
      sfx.setHeartbeat(false);
      sfx.suspend();
    }).not.toThrow();
  });
});
