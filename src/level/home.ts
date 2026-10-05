import { buildRows, type LevelDef } from './level';

const W = 90;
const H = 17;

/**
 * spec §4.3 陈伶家：卧室（0~29 列）→ 客厅（30~59）→ 厨房（60~89）。
 * 装饰物（床、窗、饮水机……）不占碰撞，由 render/home-scene.ts 按这里的列号画。
 */
export const HOME_DECOR = {
  bed: 3,
  window: 12,
  wardrobe: 20,
  bedroomDoor: 29,
  frontDoor: 31,
  dispenser: 36,
  sofa: 38,
  parentsDoor: 46,
  photo: 53,
  kitchenArch: 59,
  counter: 62,
  fridge: 72,
  bucket: 77,
} as const;

export const HOME: LevelDef = {
  id: 'home',
  width: W,
  height: H,
  rows: buildRows(W, H, [
    { x0: 0, x1: W - 1, y0: 14, y1: 16, ch: '=' },
    { x0: 0, x1: 1, y0: 0, y1: 13, ch: '#' },
    { x0: W - 2, x1: W - 1, y0: 0, y1: 13, ch: '#' },
  ]),
  spawnTileX: 6,
  floorRow: 14,
  interactables: [
    { id: 'bedside', tileX: 8, tileY: 14, lines: ['我是怎么回到床上的？'], scoring: false, finale: false },
    { id: 'window', tileX: 13, tileY: 14, lines: ['窗外的天……颜色不太对。', '像是有什么东西浮在上面。'], scoring: false, finale: false },
    { id: 'wardrobe', tileX: 21, tileY: 14, lines: ['衣柜里都是我的衣服。', '……可我总觉得，少了一件。'], scoring: false, finale: false },
    { id: 'dispenser', tileX: 36, tileY: 14, lines: ['饮水机空了。', '……昨晚那一桶，真是我喝的？'], scoring: false, finale: false },
    { id: 'parentsDoor', tileX: 46, tileY: 14, lines: ['爸妈的房门关着。', '屋里没有声音，爸好像不在家。'], scoring: false, finale: false },
    { id: 'photo', tileX: 53, tileY: 14, lines: ['全家福。爸、妈、我，还有弟弟。', '照片上的我在笑。'], scoring: false, finale: false },
    { id: 'bucket', tileX: 77, tileY: 14, lines: ['水桶碎了一地……', '……这是什么？'], scoring: false, finale: true },
  ],
  triggers: [
    { id: 'eyes', tileX: 44, effect: 'eyesWall' },
    { id: 'flicker', tileX: 61, effect: 'screenFlicker' },
  ],
};
