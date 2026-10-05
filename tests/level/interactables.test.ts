import { describe, it, expect } from 'vitest';
import { REACH, crossedTriggers, findNearby, markFound } from '../../src/level/interactables';
import { STAGE } from '../../src/level/stage';
import { HOME } from '../../src/level/home';
import { createBody } from '../../src/physics/platformer';

const bodyAtFoot = (footX: number, footY: number) => createBody(footX - 6, footY - 38, 12, 38);

describe('findNearby', () => {
  it('站在调查点旁边（中心距离 ≤ 16）能找到它', () => {
    const crackCenter = 2 * 16 + 8;
    expect(findNearby(STAGE, bodyAtFoot(crackCenter + REACH, 224))?.id).toBe('crack');
    expect(findNearby(STAGE, bodyAtFoot(crackCenter + REACH + 1, 224))).toBeNull();
  });

  it('站在地上够不着台子上的假门；跳上台子就能', () => {
    const doorCenter = 40 * 16 + 8;
    expect(findNearby(STAGE, bodyAtFoot(doorCenter, 224 + 200))).toBeNull();
    expect(findNearby(STAGE, bodyAtFoot(doorCenter, 192))?.id).toBe('fakeDoor');
  });
});

describe('markFound', () => {
  it('第一次调查 firstTime 为真，第二次为假', () => {
    const a = markFound(new Set(), 'crack');
    expect(a.firstTime).toBe(true);
    expect(a.found.has('crack')).toBe(true);
    const b = markFound(a.found, 'crack');
    expect(b.firstTime).toBe(false);
    expect(b.found).toBe(a.found);
  });
});

describe('crossedTriggers', () => {
  const eyesX = 44 * 16 + 8;
  it('从左往右越过触发区中线才触发', () => {
    expect(crossedTriggers(HOME.triggers, new Set(), eyesX - 5, eyesX - 1)).toEqual([]);
    expect(crossedTriggers(HOME.triggers, new Set(), eyesX - 1, eyesX).map((t) => t.id)).toEqual(['eyes']);
  });
  it('从右往左越过也触发', () => {
    expect(crossedTriggers(HOME.triggers, new Set(), eyesX + 2, eyesX - 2).map((t) => t.id)).toEqual(['eyes']);
  });
  it('已触发过的不再触发', () => {
    expect(crossedTriggers(HOME.triggers, new Set(['eyes']), eyesX - 1, eyesX)).toEqual([]);
  });
});
