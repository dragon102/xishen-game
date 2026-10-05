import { buildRows, type LevelDef } from './level';

const W = 60;
const H = 17;

/** spec §4.2 剧场：封闭舞台、一个要跳过去的箱子、一座要跳上去的台子。想法文案为原创。 */
export const STAGE: LevelDef = {
  id: 'stage',
  width: W,
  height: H,
  rows: buildRows(W, H, [
    { x0: 0, x1: W - 1, y0: 14, y1: 16, ch: '=' },
    { x0: 0, x1: 1, y0: 0, y1: 13, ch: '#' },
    { x0: W - 2, x1: W - 1, y0: 0, y1: 13, ch: '#' },
    { x0: 14, x1: 15, y0: 12, y1: 13, ch: 'x' },
    { x0: 38, x1: 43, y0: 12, y1: 13, ch: 'x' },
  ]),
  spawnTileX: 26,
  floorRow: 14,
  interactables: [
    { id: 'crack', tileX: 2, tileY: 14, lines: ['墙缝里只有冷风……', '这里也打不开。'], scoring: true, finale: false },
    { id: 'curtainL', tileX: 8, tileY: 14, lines: ['幕布后面是一堵墙。', '没有路。'], scoring: true, finale: false },
    { id: 'edge', tileX: 20, tileY: 14, lines: ['台口下面黑得看不见底……', '我不敢跳。'], scoring: true, finale: false },
    { id: 'trapdoor', tileX: 30, tileY: 14, lines: ['地板上有块活板。', '……被钉死了。'], scoring: true, finale: false },
    { id: 'fakeDoor', tileX: 40, tileY: 12, lines: ['门把手是画上去的。', '……这扇门是假的。'], scoring: true, finale: false },
    { id: 'curtainR', tileX: 52, tileY: 14, lines: ['这边也一样。', '它们一直在看着我。'], scoring: true, finale: false },
  ],
  triggers: [],
};
