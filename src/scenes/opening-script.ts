import type { Step } from '../cutscene/runner';
import { say } from '../dialogue/dialogue';
import { HOME_DECOR } from '../level/home';
import { STREET_DOOR_TILE } from '../level/street';

const T = 16;

/** spec §4.1 的 10 个镜头。台词是玩家口述的意思，不是小说原文。 */
export const OPENING: readonly Step[] = [
  // 1 黑屏，雨声
  { kind: 'rain', on: true },
  { kind: 'wait', duration: 1.5 },
  // 2 远景：空无一人的雨夜街道
  { kind: 'cut', scene: 'street', cameraX: 0 },
  { kind: 'fade', to: 0, duration: 2 },
  { kind: 'wait', duration: 1.5 },
  // 3 红衣少年踉跄走过泥水，镜头跟着
  { kind: 'place', actor: 'chenling', x: -16, facing: 1, visible: true },
  { kind: 'follow', actor: 'chenling' },
  { kind: 'walk', actor: 'chenling', toX: STREET_DOOR_TILE * T + 8, speed: 70, stagger: true },
  // 4 家门前，推门
  { kind: 'follow', actor: null },
  { kind: 'wait', duration: 0.6 },
  { kind: 'sfx', sound: 'door' },
  { kind: 'prop', prop: 'streetDoor', state: 'open' },
  { kind: 'wait', duration: 0.4 },
  { kind: 'place', actor: 'chenling', x: STREET_DOOR_TILE * T + 8, facing: 1, visible: false },
  { kind: 'wait', duration: 0.6 },
  { kind: 'fade', to: 1, duration: 0.6 },
  // 5 屋内：爸妈在客厅
  { kind: 'cut', scene: 'home', cameraX: 30 * T },
  { kind: 'place', actor: 'lixiuchun', x: 47 * T, facing: -1, visible: true },
  { kind: 'place', actor: 'chentan', x: 50 * T, facing: -1, visible: true },
  { kind: 'place', actor: 'chenling', x: (HOME_DECOR.frontDoor + 1) * T, facing: 1, visible: true },
  { kind: 'prop', prop: 'frontDoor', state: 'open' },
  { kind: 'prop', prop: 'bucket', state: 'full' },
  { kind: 'fade', to: 0, duration: 0.8 },
  { kind: 'sfx', sound: 'door' },
  { kind: 'prop', prop: 'frontDoor', state: 'closed' },
  { kind: 'wait', duration: 0.6 },
  { kind: 'pose', actor: 'lixiuchun', pose: 'scared' },
  { kind: 'pose', actor: 'chentan', pose: 'scared' },
  { kind: 'wait', duration: 0.8 },
  { kind: 'say', line: say('lixiuchun', '阿伶……你、你是怎么回来的？') },
  // 6 他像没听见
  { kind: 'wait', duration: 0.6 },
  { kind: 'say', line: say('chenling', '好渴……家里有水吗？') },
  // 7 抱起水桶喝，咬碎桶口
  { kind: 'walk', actor: 'chenling', toX: HOME_DECOR.dispenser * T + 8, speed: 30, stagger: true },
  { kind: 'prop', prop: 'bucket', state: 'lifted' },
  { kind: 'pose', actor: 'chenling', pose: 'drink' },
  { kind: 'sfx', sound: 'gulp' },
  { kind: 'wait', duration: 1.0 },
  { kind: 'sfx', sound: 'crack' },
  { kind: 'prop', prop: 'bucket', state: 'broken' },
  { kind: 'shake', duration: 0.3, strength: 2 },
  { kind: 'sfx', sound: 'splash' },
  { kind: 'wait', duration: 0.4 },
  { kind: 'sfx', sound: 'gulp' },
  { kind: 'wait', duration: 0.5 },
  { kind: 'sfx', sound: 'gulp' },
  { kind: 'wait', duration: 1.0 },
  // 8 喝干，一抹嘴，回房
  { kind: 'prop', prop: 'bucket', state: 'empty' },
  { kind: 'pose', actor: 'chenling', pose: 'stand' },
  { kind: 'wait', duration: 0.6 },
  { kind: 'say', line: say('chenling', '我先去睡了，爸妈你们也早点睡。') },
  { kind: 'walk', actor: 'chenling', toX: HOME_DECOR.bedroomDoor * T + 8, speed: 40 },
  { kind: 'sfx', sound: 'door' },
  { kind: 'place', actor: 'chenling', x: HOME_DECOR.bedroomDoor * T + 8, facing: -1, visible: false },
  // 9 镜头慢慢转回两人，长静默
  { kind: 'wait', duration: 1.5 },
  { kind: 'pan', toX: 36 * T, duration: 2 },
  { kind: 'wait', duration: 1.0 },
  { kind: 'say', line: say('chentan', '他是阿伶……那我们昨晚杀的，又是谁？') },
  { kind: 'wait', duration: 1.0 },
  // 10 黑屏
  { kind: 'fade', to: 1, duration: 1.5 },
  { kind: 'rain', on: false },
  { kind: 'wait', duration: 1.0 },
];
