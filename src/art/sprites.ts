import type { Anim } from '../actor/controller';
import { gridCanvas, mirrorGrid, withOutline, type Palette } from './pixels';

/**
 * 游戏内人物 24×40，朝右绘制，朝左时镜像。网格只画填色，描边由 withOutline 自动加。
 * 陈伶造型参考先前定稿的像素立绘（黑乱发、红眼、黑立领、青边红袍、白水袖）。
 */
export const CHENLING_PALETTE: Palette = {
  O: '#101014',
  K: '#1b1b22',
  k: '#3a3a4a',
  S: '#f7e3d7',
  s: '#e3bdae',
  E: '#d0202c',
  M: '#a04848',
  R: '#c41e2a',
  r: '#8c1019',
  B: '#26262e',
  T: '#3fb5b0',
  W: '#f4f1ec',
  w: '#d3ccc0',
  L: '#16161b',
};

const CHENLING_TOP: readonly string[] = [
  '........................',
  '..........KKK..K........',
  '........KKKKKKKKK.......',
  '.......KKKKKKKKKKK......',
  '......KKKKKkKKKKKKK.....',
  '......KKKKKKKKKKKKK.....',
  '.....KKKKKKKSKKSKKKK....',
  '.....KKKKKSSSSKSSSKK....',
  '....KKKKKSKKSSSKKSSK....',
  '....KKKKKSEESSSEESSK....',
  '....KKKKSSSSSSSSSSSK....',
  '....KKKKsSSSSSSSMSSK....',
  '.....KKK.sSSSSSSSSs.....',
  '.....KK....sSSSSs.......',
  '.............ss.........',
  '...........BBBBBB.......',
  '.........RRBBBBBBRR.....',
  '........RRRTBBBBTRRR....',
  '........RRRTBBBBTRRRR...',
  '.......RRRRTBBEBTRRRRR..',
  '.......RRRRTBBBBTRRRRRR.',
  '.......RRRRTBBBBTRrRRRR.',
  '.......RRRRTBBBBTRrRRRT.',
  '.......RRRRTBBBBTRrRRWW.',
  '......RRRRRTBBBBTRrRWWW.',
  '......RRRRRTBBBBTRRWWWw.',
  '......RRRRRTBBBBTRWWWSw.',
  '......RRRRRTBBBBTR.WWS..',
  '......rRRRRTBBBBTR..W...',
  '......rRRRRTBBBBTRR.....',
  '.....rrRRRRTBBBBTRRR....',
  '.....rRRRRRTBBBBTRRRR...',
  '.....rRRRRRTBBBBTRRRRR..',
  '....rrRRRRRTBBBBTRRRRRR.',
];

/** 第 28 行的另一版：水袖尖往外飘一格，站立时两帧交替。 */
const IDLE1_ROW28 = '......rRRRRTBBBBTR...W..';

const EMPTY = '........................';

const LEGS = {
  stand: [
    '...........LL..LL.......',
    '...........LL..LL.......',
    '...........LL..LL.......',
    '...........LL..LL.......',
    '...........LLL..LLL.....',
    EMPTY,
  ],
  walkA: [
    '..........LL....LL......',
    '.........LL......LL.....',
    '........LL........LL....',
    '........LL........LL....',
    '.......LLL........LLL...',
    EMPTY,
  ],
  walkB: [
    '...........LL..LL.......',
    '...........LL..LL.......',
    '...........LL...LL......',
    '...........LL....LLL....',
    '..........LLL...........',
    EMPTY,
  ],
  walkC: [
    '...........LL..LL.......',
    '...........LL..LL.......',
    '..........LL...LL.......',
    '.........LLL...LL.......',
    '...............LLL......',
    EMPTY,
  ],
  jump: [
    '...........LL..LL.......',
    '............LL..LL......',
    '............LLL.LLL.....',
    EMPTY,
    EMPTY,
    EMPTY,
  ],
  fall: [
    '..........LL....LL......',
    '..........LL....LL......',
    '..........LL.....LL.....',
    '..........LLL....LLL....',
    EMPTY,
    EMPTY,
  ],
} as const;

export const CHENLING_FRAMES = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'jump', 'fall'] as const;
export type ChenlingFrame = (typeof CHENLING_FRAMES)[number];

const LEGS_OF: Record<ChenlingFrame, readonly string[]> = {
  idle0: LEGS.stand,
  idle1: LEGS.stand,
  walk0: LEGS.walkA,
  walk1: LEGS.walkB,
  walk2: LEGS.walkA,
  walk3: LEGS.walkC,
  jump: LEGS.jump,
  fall: LEGS.fall,
};

export function chenlingGrid(frame: ChenlingFrame): string[] {
  const top = [...CHENLING_TOP];
  if (frame === 'idle1') top[28] = IDLE1_ROW28;
  return withOutline([...top, ...LEGS_OF[frame]], 'O');
}

const WALK_CYCLE: readonly ChenlingFrame[] = ['walk0', 'walk1', 'walk2', 'walk3'];

export function frameFor(anim: Anim, animTime: number): { frame: ChenlingFrame; dy: number } {
  switch (anim) {
    case 'walk':
      return { frame: WALK_CYCLE[Math.floor(animTime / 0.12) % 4], dy: 0 };
    case 'jump':
      return { frame: 'jump', dy: 0 };
    case 'fall':
      return { frame: 'fall', dy: 0 };
    case 'land':
      return { frame: 'idle0', dy: 1 };
    case 'idle':
      return { frame: Math.floor(animTime / 0.6) % 2 === 0 ? 'idle0' : 'idle1', dy: 0 };
  }
}

export const MOTHER_PALETTE: Palette = {
  O: '#101014',
  H: '#3b2a22',
  S: '#f7e3d7',
  s: '#e3bdae',
  D: '#2a1a14',
  e: '#e08080',
  M: '#a04848',
  Y: '#c9b79c',
  P: '#4a4a58',
  L: '#16161b',
};

const MOTHER_RAW: readonly string[] = [
  EMPTY,
  EMPTY,
  '..........HHHH..........',
  '........HHHHHHHH........',
  '.......HHHHHHHHHH.......',
  '.......HHHHHHHHHHH......',
  '.......HHHHSSSSSHH......',
  '.......HHHSSSSSSSH......',
  '.......HHHSDDSSDDS......',
  '.......HHHSeeSSeeS......',
  '.......HHHSSSSSSSS......',
  '.......HHHsSSSMMSS......',
  '.......HHH.sSSSSs.......',
  '........HH..ssss........',
  '............ss..........',
  '..........YYYYYY........',
  '.........YYYYYYYY.......',
  '........YYYYYYYYYY......',
  ...Array<string>(8).fill('.......YYYYYYYYYYYY.....'),
  '.......SYYYYYYYYYYS.....',
  '........YYYYYYYYYY......',
  ...Array<string>(8).fill('........PPPPPPPPPP......'),
  '..........PP..PP........',
  '..........PP..PP........',
  '..........LLL.LLL.......',
  EMPTY,
];

export const FATHER_PALETTE: Palette = {
  O: '#101014',
  K: '#1b1b22',
  S: '#f7e3d7',
  s: '#e3bdae',
  D: '#2a1a14',
  g: '#8a7e74',
  M: '#a04848',
  G: '#5b5f66',
  P: '#34343e',
  L: '#16161b',
};

const FATHER_RAW: readonly string[] = [
  EMPTY,
  EMPTY,
  EMPTY,
  '.........KKKKKK.........',
  '........KKKKKKKK........',
  '.......KKKKKKKKKK.......',
  '.......KKSSSSSSSKK......',
  '.......KSSSSSSSSS.......',
  '.......KSDDSSSDDS.......',
  '.......SSSSSSSSSS.......',
  '.......SSSSSsSSSS.......',
  '.......sSSSSSSSSS.......',
  '.......gsSSMMMSSg.......',
  '........gssssssg........',
  '...........sss..........',
  '.........GGGGGG.........',
  '........GGGGGGGG........',
  '.......GGGGGGGGGG.......',
  ...Array<string>(8).fill('......GGGGGGGGGGGG......'),
  '......SGGGGGGGGGGS......',
  '.......GGGGGGGGGG.......',
  '.......PPPPPPPPPP.......',
  ...Array<string>(9).fill('.......PPPP..PPPP.......'),
  '......LLLLL..LLLLL......',
  EMPTY,
];

export const MOTHER_GRID: readonly string[] = withOutline(MOTHER_RAW, 'O');
export const FATHER_GRID: readonly string[] = withOutline(FATHER_RAW, 'O');

const canvasCache = new Map<string, HTMLCanvasElement>();

/** 只在缓存没命中时才生成网格（每帧都会调用，别白白重建）。 */
function cachedCanvas(key: string, build: () => string[], palette: Palette): HTMLCanvasElement {
  const hit = canvasCache.get(key);
  if (hit) return hit;
  const cv = gridCanvas(key, build(), palette);
  canvasCache.set(key, cv);
  return cv;
}

/** 浏览器里取精灵 canvas（带缓存）。facing = -1 时用镜像网格。 */
export function chenlingCanvas(frame: ChenlingFrame, facing: 1 | -1): HTMLCanvasElement {
  return cachedCanvas(
    `chenling:${frame}:${facing}`,
    () => (facing === 1 ? chenlingGrid(frame) : mirrorGrid(chenlingGrid(frame))),
    CHENLING_PALETTE,
  );
}

export function parentCanvas(who: 'lixiuchun' | 'chentan', facing: 1 | -1): HTMLCanvasElement {
  const [grid, pal] = who === 'lixiuchun' ? [MOTHER_GRID, MOTHER_PALETTE] : [FATHER_GRID, FATHER_PALETTE];
  return cachedCanvas(`${who}:${facing}`, () => (facing === 1 ? [...grid] : mirrorGrid(grid)), pal);
}
