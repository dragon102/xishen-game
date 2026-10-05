# 第一章前三关 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出《我不是戏神》像素横版同人游戏第一章的前三关（开场动画「雨夜归来」、剧场初演、醒来），手机横屏可玩，构建为单文件并发布到 GitHub Pages。

**Architecture:** 纯逻辑模块（输入、平台物理、角色控制器、期待值、对话、过场执行器、关卡数据、调查点、存档、流程状态机、两个关卡会话）全部 TDD、不碰 DOM/Canvas；像素图用「字符网格 / 路径小语言」在运行时画到离屏 canvas；渲染层把 480×270 的离屏画面整数倍放大；DOM 层负责按键、对话框、期待值屏、标题/暂停/结尾；`src/main.ts` 是唯一胶水，用固定 1/60 秒步长跑主循环。

**Tech Stack:** Vite 5、TypeScript 5（strict）、Canvas 2D、WebAudio、Vitest 2 + jsdom、vite-plugin-singlefile、GitHub Actions + Pages。

**Spec:** `docs/superpowers/specs/2026-10-05-chapter1-opening-design.md`（下称 spec）。

**通用约定（每个任务都适用）：**
- 工作目录：`项目根目录（xishen-game/）`。
- 提交信息末尾加一行 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`（下面的 commit 命令已写好）。
- 纯逻辑模块**禁止** import 任何 `render/`、`ui/`、`art/` 下的文件，也禁止使用 `document` / `window`。
- jsdom 没有 Canvas 2D 与 AudioContext：测试里**不要**调用任何会 `getContext('2d')` 的函数。
- 发现计划本身有错（类型对不上、数字算错）：按 spec 的意图改对，并在任务汇报里写明改了什么。

---

## 文件地图

| 文件 | 职责 |
|---|---|
| `package.json` / `tsconfig.json` / `vite.config.ts` / `vitest.config.ts` / `index.html` / `.gitignore` | 工程脚手架 |
| `src/vite-env.d.ts` | 让 TS 认识 `?raw` / `.css` 导入 |
| `src/input/actions.ts` | 动作状态（多来源按住、刚按下边沿）+ `moveDir` |
| `src/input/frame-input.ts` | 把动作状态读成一帧的 `FrameInput` |
| `src/input/keyboard.ts` | 键盘 → 动作 |
| `src/input/touch.ts` | 触屏按钮 / 点屏推进 → 动作 |
| `src/physics/platformer.ts` | 唯一碰撞权威：瓦片 AABB、重力、土狼时间、跳跃缓冲、截断上升 |
| `src/actor/controller.ts` | 会走会跳的角色（动画状态、朝向），与关卡无关 |
| `src/expectation/expectation.ts` | 期待值规则 |
| `src/dialogue/dialogue.ts` | 台词、逐字显示、对话队列 `Talk` |
| `src/audio/sound-ids.ts` | 音效 id |
| `src/audio/synth.ts` | WebAudio 合成音效（不可用时空操作） |
| `src/cutscene/runner.ts` | 过场剧本执行器 + 跳过 |
| `src/level/level.ts` | 关卡类型、瓦片构造、碰撞查询 |
| `src/level/stage.ts` / `home.ts` / `street.ts` | 三张地图 |
| `src/level/interactables.ts` | 靠近检测、首次调查、触发区穿越 |
| `src/save/progress.ts` | 存档 + 容错读档 |
| `src/flow/game-flow.ts` | 关卡流程状态机 |
| `src/scenes/stage-session.ts` | 剧场关逻辑 |
| `src/scenes/home-session.ts` | 醒来关逻辑 |
| `src/scenes/opening-script.ts` | 开场动画剧本 |
| `src/art/pixels.ts` | 字符网格工具（校验、描边、镜像、画到 canvas） |
| `src/art/sprites.ts` | 陈伶各帧、李秀春、陈坛的网格与 canvas 缓存 |
| `src/art/painter.ts` | 路径小语言 + 按形状落格（头像用） |
| `src/art/portraits.ts` | 三张 48×48 头像 |
| `src/art/tiles.ts` | 16×16 瓦片贴图 |
| `src/render/viewport.ts` | 视口整数倍缩放 |
| `src/render/camera.ts` | 相机跟随 |
| `src/render/present.ts` | 离屏画面放大到屏幕 |
| `src/render/common.ts` | 瓦片绘制、雨、哈希、「!」、角色绘制 |
| `src/render/street-scene.ts` / `stage-scene.ts` / `home-scene.ts` / `opening-scene.ts` | 各场景绘制 |
| `src/ui/style.css` | 全部 DOM 样式 |
| `src/ui/confirm.ts` | 两步确认 |
| `src/ui/ui.ts` | 按键、对话框、期待值屏、飘字、标题、暂停、结尾卡 |
| `src/main.ts` | 接线 + 主循环 |
| `tests/**` | 与 `src/` 同结构的单测；`tests/main-wiring.test.ts` 源码级接线断言 |
| `.github/workflows/pages.yml` | 构建 + 部署 |

---

### Task 1: 工程脚手架

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`, `src/vite-env.d.ts`, `src/main.ts`

- [ ] **Step 1: 写配置文件**

`package.json`
```json
{
  "name": "xishen-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vite-plugin-singlefile": "^2.3.3",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`
```ts
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './'：GitHub Pages 的项目页挂在 /xishen-game/ 子路径下；singlefile 把 JS/CSS 全部内联进 index.html
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
});
```

`vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom' },
});
```

`src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />
```

`.gitignore`
```
node_modules/
dist/
.DS_Store
```

`index.html`
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="戏神" />
    <meta name="theme-color" content="#000000" />
    <title>我不是戏神 · 第一章</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #000; }
      body { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
      #app { position: relative; width: 100%; height: 100%; }
      #screen { position: absolute; image-rendering: pixelated; }
    </style>
  </head>
  <body>
    <div id="app"><canvas id="screen"></canvas></div>
    <div id="rotate">请把手机横过来</div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`（临时，Task 22 整体替换）
```ts
const screen = document.getElementById('screen') as HTMLCanvasElement;
screen.width = 480;
screen.height = 270;
const ctx = screen.getContext('2d');
if (ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 480, 270);
}
```

- [ ] **Step 2: 安装依赖**

Run: `npm install`
Expected: 生成 `node_modules/` 与 `package-lock.json`，无 ERR。

- [ ] **Step 3: 验证构建与类型检查**

Run: `npm run typecheck && npm run build && ls dist`
Expected: typecheck 无输出；`dist/` 里只有 `index.html`。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: 工程脚手架（Vite + TS strict + Vitest + 单文件构建）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 动作状态 Actions 与 FrameInput

**Files:**
- Create: `src/input/actions.ts`, `src/input/frame-input.ts`
- Test: `tests/input/actions.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/input/actions.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { Actions, moveDir } from '../../src/input/actions';
import { readInput } from '../../src/input/frame-input';

describe('Actions', () => {
  it('按下后 isDown 为真，刚按下只在 endStep 之前为真', () => {
    const a = new Actions();
    a.press('jump', 'key:Space');
    expect(a.isDown('jump')).toBe(true);
    expect(a.justPressed('jump')).toBe(true);
    a.endStep();
    expect(a.isDown('jump')).toBe(true);
    expect(a.justPressed('jump')).toBe(false);
  });

  it('两个来源同时按住，松开一个仍算按住，且不重复触发刚按下', () => {
    const a = new Actions();
    a.press('left', 'key:ArrowLeft');
    a.endStep();
    a.press('left', 'ptr:3');
    expect(a.justPressed('left')).toBe(false);
    a.release('left', 'key:ArrowLeft');
    expect(a.isDown('left')).toBe(true);
    a.release('left', 'ptr:3');
    expect(a.isDown('left')).toBe(false);
  });

  it('松开后再按，会再次触发刚按下', () => {
    const a = new Actions();
    a.press('interact', 'k');
    a.endStep();
    a.release('interact', 'k');
    a.press('interact', 'k');
    expect(a.justPressed('interact')).toBe(true);
  });

  it('没跑 endStep 时刚按下一直保留（一帧没跑物理步也不丢键）', () => {
    const a = new Actions();
    a.press('jump', 'k');
    a.release('jump', 'k');
    expect(a.justPressed('jump')).toBe(true);
  });

  it('releaseAll 清空一切', () => {
    const a = new Actions();
    a.press('right', 'k');
    a.releaseAll();
    expect(a.isDown('right')).toBe(false);
    expect(a.justPressed('right')).toBe(false);
  });

  it('moveDir：左右同时按抵消', () => {
    const a = new Actions();
    expect(moveDir(a)).toBe(0);
    a.press('right', 'k1');
    expect(moveDir(a)).toBe(1);
    a.press('left', 'k2');
    expect(moveDir(a)).toBe(0);
    a.release('right', 'k1');
    expect(moveDir(a)).toBe(-1);
  });

  it('readInput 把各动作读成一帧输入', () => {
    const a = new Actions();
    a.press('right', 'k1');
    a.press('jump', 'k2');
    a.press('advance', 'k3');
    expect(readInput(a)).toEqual({
      dir: 1,
      jumpPressed: true,
      jumpHeld: true,
      interactPressed: false,
      advancePressed: true,
    });
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/input/actions.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/input/actions.ts`
```ts
export type ActionName = 'left' | 'right' | 'jump' | 'interact' | 'advance' | 'pause';

/**
 * 统一的动作状态。同一个动作可以被多个来源同时按住（某个键、某根手指），
 * 全部来源松开才算松开；「刚按下」只在从没人按变成有人按时记一次，
 * 一直保留到 endStep()——所以某一帧没跑物理步也不会丢掉一次点按。
 */
export class Actions {
  private readonly held = new Map<ActionName, Set<string>>();
  private readonly pressed = new Set<ActionName>();

  press(action: ActionName, source: string): void {
    const sources = this.sourcesOf(action);
    if (sources.size === 0) this.pressed.add(action);
    sources.add(source);
  }

  release(action: ActionName, source: string): void {
    this.sourcesOf(action).delete(source);
  }

  isDown(action: ActionName): boolean {
    return this.sourcesOf(action).size > 0;
  }

  justPressed(action: ActionName): boolean {
    return this.pressed.has(action);
  }

  endStep(): void {
    this.pressed.clear();
  }

  releaseAll(): void {
    this.held.clear();
    this.pressed.clear();
  }

  private sourcesOf(action: ActionName): Set<string> {
    let s = this.held.get(action);
    if (!s) {
      s = new Set();
      this.held.set(action, s);
    }
    return s;
  }
}

export function moveDir(a: Actions): -1 | 0 | 1 {
  const d = (a.isDown('right') ? 1 : 0) - (a.isDown('left') ? 1 : 0);
  return d as -1 | 0 | 1;
}
```

`src/input/frame-input.ts`
```ts
import { moveDir, type Actions } from './actions';

export interface FrameInput {
  dir: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
  interactPressed: boolean;
  advancePressed: boolean;
}

export function readInput(a: Actions): FrameInput {
  return {
    dir: moveDir(a),
    jumpPressed: a.justPressed('jump'),
    jumpHeld: a.isDown('jump'),
    interactPressed: a.justPressed('interact'),
    advancePressed: a.justPressed('advance'),
  };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/input/actions.test.ts`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/input tests/input
git commit -m "feat: 动作状态（多来源按住 + 刚按下边沿）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 键盘与触屏绑定

**Files:**
- Create: `src/input/keyboard.ts`, `src/input/touch.ts`
- Test: `tests/input/bindings.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/input/bindings.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { Actions } from '../../src/input/actions';
import { bindKeyboard } from '../../src/input/keyboard';
import { bindTapToAdvance, bindTouchButton } from '../../src/input/touch';

const key = (type: 'keydown' | 'keyup', code: string, repeat = false) =>
  window.dispatchEvent(new KeyboardEvent(type, { code, repeat, cancelable: true }));

const pointer = (el: HTMLElement, type: string, pointerId: number) => {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'pointerId', { value: pointerId });
  el.dispatchEvent(ev);
};

describe('bindKeyboard', () => {
  it('方向键与 A/D 映射到左右，空格映射到跳', () => {
    const a = new Actions();
    const off = bindKeyboard(window, a);
    key('keydown', 'ArrowLeft');
    key('keydown', 'Space');
    expect(a.isDown('left')).toBe(true);
    expect(a.isDown('jump')).toBe(true);
    key('keyup', 'ArrowLeft');
    expect(a.isDown('left')).toBe(false);
    key('keydown', 'KeyD');
    expect(a.isDown('right')).toBe(true);
    off();
  });

  it('E 同时按下互动与推进对话；Esc 是暂停', () => {
    const a = new Actions();
    const off = bindKeyboard(window, a);
    key('keydown', 'KeyE');
    expect(a.justPressed('interact')).toBe(true);
    expect(a.justPressed('advance')).toBe(true);
    key('keyup', 'KeyE');
    expect(a.isDown('advance')).toBe(false);
    key('keydown', 'Escape');
    expect(a.justPressed('pause')).toBe(true);
    off();
  });

  it('系统连发的 keydown 不重复触发', () => {
    const a = new Actions();
    const off = bindKeyboard(window, a);
    key('keydown', 'Space');
    a.endStep();
    key('keydown', 'Space', true);
    expect(a.justPressed('jump')).toBe(false);
    off();
  });

  it('窗口失焦时松开全部按键（防止卡键一直走）', () => {
    const a = new Actions();
    const off = bindKeyboard(window, a);
    key('keydown', 'ArrowRight');
    window.dispatchEvent(new Event('blur'));
    expect(a.isDown('right')).toBe(false);
    off();
  });

  it('解绑后不再响应', () => {
    const a = new Actions();
    bindKeyboard(window, a)();
    key('keydown', 'ArrowLeft');
    expect(a.isDown('left')).toBe(false);
  });
});

describe('bindTouchButton', () => {
  it('两根手指按同一个键，全部抬起才松开', () => {
    const a = new Actions();
    const el = document.createElement('div');
    bindTouchButton(el, 'jump', a);
    pointer(el, 'pointerdown', 1);
    pointer(el, 'pointerdown', 2);
    expect(a.isDown('jump')).toBe(true);
    expect(el.classList.contains('held')).toBe(true);
    pointer(el, 'pointerup', 1);
    expect(a.isDown('jump')).toBe(true);
    pointer(el, 'pointercancel', 2);
    expect(a.isDown('jump')).toBe(false);
    expect(el.classList.contains('held')).toBe(false);
  });

  it('不同按钮互不干扰（按住右的同时按跳）', () => {
    const a = new Actions();
    const right = document.createElement('div');
    const jump = document.createElement('div');
    bindTouchButton(right, 'right', a);
    bindTouchButton(jump, 'jump', a);
    pointer(right, 'pointerdown', 1);
    pointer(jump, 'pointerdown', 2);
    pointer(jump, 'pointerup', 2);
    expect(a.isDown('right')).toBe(true);
    expect(a.isDown('jump')).toBe(false);
  });
});

describe('bindTapToAdvance', () => {
  it('点画面按下推进，抬起松开', () => {
    const a = new Actions();
    const el = document.createElement('canvas');
    bindTapToAdvance(el, a);
    pointer(el, 'pointerdown', 7);
    expect(a.justPressed('advance')).toBe(true);
    pointer(el, 'pointerup', 7);
    expect(a.isDown('advance')).toBe(false);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/input/bindings.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/input/keyboard.ts`
```ts
import type { ActionName, Actions } from './actions';

export const KEY_MAP: Readonly<Record<string, ActionName>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  KeyE: 'interact',
  Enter: 'interact',
  Escape: 'pause',
  KeyP: 'pause',
};

export function bindKeyboard(target: Window, actions: Actions): () => void {
  const down = (e: KeyboardEvent): void => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (e.repeat) return;
    const source = `key:${e.code}`;
    actions.press(action, source);
    // 互动键同时负责推进对话
    if (action === 'interact') actions.press('advance', source);
  };
  const up = (e: KeyboardEvent): void => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    const source = `key:${e.code}`;
    actions.release(action, source);
    if (action === 'interact') actions.release('advance', source);
  };
  const blur = (): void => actions.releaseAll();
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    target.removeEventListener('blur', blur);
  };
}
```

`src/input/touch.ts`
```ts
import type { ActionName, Actions } from './actions';

const UP_EVENTS = ['pointerup', 'pointercancel', 'lostpointercapture'] as const;

function bindPointerHold(el: HTMLElement, action: ActionName, actions: Actions, prefix: string, markHeld: boolean): () => void {
  const active = new Set<number>();
  const down = (e: Event): void => {
    const id = (e as PointerEvent).pointerId;
    e.preventDefault();
    active.add(id);
    try {
      el.setPointerCapture?.(id);
    } catch {
      // jsdom 与部分旧浏览器没有指针捕获，忽略即可
    }
    actions.press(action, `${prefix}:${id}`);
    if (markHeld) el.classList.add('held');
  };
  const up = (e: Event): void => {
    const id = (e as PointerEvent).pointerId;
    if (!active.delete(id)) return;
    actions.release(action, `${prefix}:${id}`);
    if (markHeld && active.size === 0) el.classList.remove('held');
  };
  el.addEventListener('pointerdown', down);
  for (const t of UP_EVENTS) el.addEventListener(t, up);
  return () => {
    el.removeEventListener('pointerdown', down);
    for (const t of UP_EVENTS) el.removeEventListener(t, up);
  };
}

/** 屏幕上的按钮：每根手指是独立来源，所以能同时按住 ▶ 和「跳」。 */
export function bindTouchButton(el: HTMLElement, action: ActionName, actions: Actions): () => void {
  return bindPointerHold(el, action, actions, `ptr-${action}`, true);
}

/** 点画面任意处推进对话。只绑在画布上（按钮是画布的兄弟节点，点按钮不会冒泡到这里）。 */
export function bindTapToAdvance(el: HTMLElement, actions: Actions): () => void {
  return bindPointerHold(el, 'advance', actions, 'tap', false);
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/input`
Expected: 15 passed

- [ ] **Step 5: Commit**

```bash
git add src/input tests/input
git commit -m "feat: 键盘与触屏按钮绑定（多点触控、失焦清键）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 平台物理

**Files:**
- Create: `src/physics/platformer.ts`
- Test: `tests/physics/platformer.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/physics/platformer.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { PHYS, TILE, createBody, step, type Body, type IsSolid, type MoveInput } from '../../src/physics/platformer';

/** '#' 是实心；地图外一律空。 */
const mapOf = (rows: string[]): IsSolid => (tx, ty) =>
  ty >= 0 && ty < rows.length && tx >= 0 && tx < rows[ty].length && rows[ty][tx] === '#';

const DT = 1 / 60;
const idle: MoveInput = { dir: 0, jumpPressed: false, jumpHeld: false };
const run = (b: Body, input: MoveInput, steps: number, solid: IsSolid): Body => {
  let cur = b;
  for (let i = 0; i < steps; i++) cur = step(cur, input, DT, solid).body;
  return cur;
};

// 10 宽、6 高，第 5 行是地面（地面顶 y = 80）
const FLOOR = mapOf(['..........', '..........', '..........', '..........', '..........', '##########']);

describe('platformer.step', () => {
  it('从空中落下，站在地面上', () => {
    const b = run(createBody(40, 0, 12, 38), idle, 120, FLOOR);
    expect(b.y).toBe(80 - 38);
    expect(b.onGround).toBe(true);
    expect(b.vy).toBe(0);
  });

  it('landed 只在第一次接触地面的那一步为真', () => {
    let b = createBody(40, 80 - 38 - 1, 12, 38);
    const first = step(b, idle, DT, FLOOR);
    expect(first.landed).toBe(true);
    b = first.body;
    expect(step(b, idle, DT, FLOOR).landed).toBe(false);
  });

  it('往右走撞墙停在墙边', () => {
    const wall = mapOf(['......#...', '......#...', '......#...', '......#...', '......#...', '##########']);
    const start = run(createBody(40, 0, 12, 38), idle, 60, wall);
    const b = run(start, { dir: 1, jumpPressed: false, jumpHeld: false }, 120, wall);
    expect(b.x).toBe(6 * TILE - 12);
    expect(b.vx).toBe(0);
  });

  it('站在地上按跳会起跳，最高约 3 格（≈50 像素）', () => {
    const start = run(createBody(40, 0, 12, 38), idle, 60, FLOOR);
    const r = step(start, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR);
    expect(r.jumped).toBe(true);
    expect(r.body.vy).toBeLessThan(0);
    let b = r.body;
    let top = b.y;
    for (let i = 0; i < 60; i++) {
      b = step(b, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, FLOOR).body;
      top = Math.min(top, b.y);
    }
    const height = start.y - top;
    expect(height).toBeGreaterThan(45);
    expect(height).toBeLessThan(53);
  });

  it('松开跳键会截断上升（小跳）', () => {
    const start = run(createBody(40, 0, 12, 38), idle, 60, FLOOR);
    let b = step(start, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR).body;
    let top = b.y;
    for (let i = 0; i < 60; i++) {
      b = step(b, idle, DT, FLOOR).body;
      top = Math.min(top, b.y);
    }
    expect(start.y - top).toBeLessThan(20);
  });

  it('头顶撞到砖块会停住上升', () => {
    // 第 1 行（y 16~32）有砖；角色站在地上时头顶 y = 42，起跳本可升到 y ≈ -5
    const ceil = mapOf(['..........', '###.......', '..........', '..........', '..........', '##########']);
    const start = run(createBody(8, 42, 12, 38), idle, 30, ceil);
    expect(start.y).toBe(42);
    let b = step(start, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, ceil).body;
    for (let i = 0; i < 10; i++) b = step(b, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, ceil).body;
    expect(b.y).toBeGreaterThanOrEqual(2 * TILE);
    expect(b.y).toBeLessThan(42);
  });

  it('土狼时间：刚离开地面 0.05 秒内还能跳', () => {
    const air: Body = { ...createBody(40, 10, 12, 38), onGround: false, coyote: 0.05 };
    expect(step(air, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR).jumped).toBe(true);
    const late: Body = { ...air, coyote: 0 };
    expect(step(late, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR).jumped).toBe(false);
  });

  it('跳跃缓冲：落地前一小会儿按跳，落地后自动起跳', () => {
    let b: Body = { ...createBody(40, 80 - 38 - 2, 12, 38), vy: 60, onGround: false };
    const s1 = step(b, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR);
    expect(s1.jumped).toBe(false);
    b = s1.body;
    const s2 = step(b, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, FLOOR);
    expect(s2.landed).toBe(true);
    const s3 = step(s2.body, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, FLOOR);
    expect(s3.jumped).toBe(true);
  });

  it('跳跃缓冲会过期：提前 0.2 秒按跳，落地后不跳', () => {
    let b: Body = { ...createBody(40, 0, 12, 38), onGround: false };
    b = step(b, { dir: 0, jumpPressed: true, jumpHeld: false }, DT, FLOOR).body;
    let jumped = false;
    for (let i = 0; i < 120; i++) {
      const r = step(b, idle, DT, FLOOR);
      jumped = jumped || r.jumped;
      b = r.body;
    }
    expect(jumped).toBe(false);
  });

  it('下落速度有上限', () => {
    const b = run(createBody(0, 0, 12, 38), idle, 300, () => false);
    expect(b.vy).toBe(PHYS.maxFall);
  });

  it('一次给很大的 dt 也只按 1/30 秒推进', () => {
    const b = step(createBody(0, 0, 12, 38), { dir: 1, jumpPressed: false, jumpHeld: false }, 1, () => false).body;
    expect(b.x).toBeCloseTo(PHYS.walkSpeed * PHYS.maxDt, 5);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/physics/platformer.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/physics/platformer.ts`
```ts
export const TILE = 16;

/** 手感参数（spec §3.3）。起跳高度 ≈ jumpSpeed² / (2·gravity) = 50 像素 ≈ 3 格。 */
export const PHYS = {
  walkSpeed: 90,
  gravity: 900,
  jumpSpeed: 300,
  maxFall: 400,
  coyoteTime: 0.08,
  jumpBufferTime: 0.1,
  jumpCutSpeed: 150,
  maxDt: 1 / 30,
} as const;

export type IsSolid = (tx: number, ty: number) => boolean;

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  coyote: number;
  jumpBuffer: number;
}

export interface MoveInput {
  dir: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
}

export interface StepResult {
  body: Body;
  jumped: boolean;
  landed: boolean;
}

export function createBody(x: number, y: number, w: number, h: number): Body {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, coyote: 0, jumpBuffer: 0 };
}

export function overlapsSolid(x: number, y: number, w: number, h: number, isSolid: IsSolid): boolean {
  const x0 = Math.floor(x / TILE);
  const x1 = Math.floor((x + w - 0.001) / TILE);
  const y0 = Math.floor(y / TILE);
  const y1 = Math.floor((y + h - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(tx, ty)) return true;
    }
  }
  return false;
}

/** 唯一碰撞权威：先水平后竖直，逐轴推出实心瓦片。每步最大位移 400/30 ≈ 13 像素 < 1 格，不会穿墙。 */
export function step(prev: Body, input: MoveInput, rawDt: number, isSolid: IsSolid): StepResult {
  const dt = Math.min(rawDt, PHYS.maxDt);
  const b: Body = { ...prev };

  b.vx = input.dir * PHYS.walkSpeed;
  b.coyote = prev.onGround ? PHYS.coyoteTime : Math.max(0, prev.coyote - dt);
  b.jumpBuffer = input.jumpPressed ? PHYS.jumpBufferTime : Math.max(0, prev.jumpBuffer - dt);

  let jumped = false;
  if (b.jumpBuffer > 0 && b.coyote > 0) {
    b.vy = -PHYS.jumpSpeed;
    b.jumpBuffer = 0;
    b.coyote = 0;
    jumped = true;
  }
  if (!input.jumpHeld && b.vy < -PHYS.jumpCutSpeed) b.vy = -PHYS.jumpCutSpeed;

  b.vy = Math.min(b.vy + PHYS.gravity * dt, PHYS.maxFall);

  let nx = b.x + b.vx * dt;
  if (b.vx !== 0 && overlapsSolid(nx, b.y, b.w, b.h, isSolid)) {
    nx = b.vx > 0 ? Math.floor((nx + b.w) / TILE) * TILE - b.w : (Math.floor(nx / TILE) + 1) * TILE;
    b.vx = 0;
  }
  b.x = nx;

  let ny = b.y + b.vy * dt;
  let onGround = false;
  if (overlapsSolid(b.x, ny, b.w, b.h, isSolid)) {
    if (b.vy > 0) {
      ny = Math.floor((ny + b.h) / TILE) * TILE - b.h;
      onGround = true;
    } else {
      ny = (Math.floor(ny / TILE) + 1) * TILE;
    }
    b.vy = 0;
  }
  b.y = ny;
  b.onGround = onGround;

  return { body: b, jumped, landed: onGround && !prev.onGround };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/physics/platformer.test.ts`
Expected: 11 passed

- [ ] **Step 5: 变异自检**

把 `if (!input.jumpHeld && b.vy < -PHYS.jumpCutSpeed) ...` 这一行临时删掉，运行同一命令，确认「松开跳键会截断上升」变红；恢复后再跑一次全绿。

- [ ] **Step 6: Commit**

```bash
git add src/physics tests/physics
git commit -m "feat: 平台物理（瓦片碰撞、土狼时间、跳跃缓冲、截断上升）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 角色控制器

**Files:**
- Create: `src/actor/controller.ts`
- Test: `tests/actor/controller.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/actor/controller.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { ACTOR_H, ACTOR_W, LAND_TIME, createActor, footX, stepActor } from '../../src/actor/controller';
import type { IsSolid } from '../../src/physics/platformer';

const DT = 1 / 60;
// 地面顶 y = 224（第 14 行起实心），x=0 与 x=40 两列是墙
const solid: IsSolid = (tx, ty) => ty >= 14 || tx <= 0 || tx >= 40;

describe('controller', () => {
  it('createActor 以脚底中点定位，开局站在地上', () => {
    const a = createActor(100, 224);
    expect(a.body.x).toBe(100 - ACTOR_W / 2);
    expect(a.body.y).toBe(224 - ACTOR_H);
    expect(a.body.onGround).toBe(true);
    expect(footX(a)).toBe(100);
    expect(a.anim).toBe('idle');
  });

  it('走动：朝向跟着方向，动画为 walk，moving 为真', () => {
    let a = createActor(100, 224);
    const r = stepActor(a, { dir: -1, jumpPressed: false, jumpHeld: false }, DT, solid);
    a = r.actor;
    expect(a.facing).toBe(-1);
    expect(a.anim).toBe('walk');
    expect(r.moving).toBe(true);
    const r2 = stepActor(a, { dir: 0, jumpPressed: false, jumpHeld: false }, DT, solid);
    expect(r2.actor.facing).toBe(-1);
    expect(r2.actor.anim).toBe('idle');
  });

  it('贴着墙往墙里走：moving 为假', () => {
    let a = createActor(24, 224);
    for (let i = 0; i < 30; i++) a = stepActor(a, { dir: -1, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    const r = stepActor(a, { dir: -1, jumpPressed: false, jumpHeld: false }, DT, solid);
    expect(r.moving).toBe(false);
  });

  it('起跳 → jump，下落 → fall，落地 → land，之后回到 idle', () => {
    let a = createActor(100, 224);
    let r = stepActor(a, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, solid);
    expect(r.jumped).toBe(true);
    expect(r.actor.anim).toBe('jump');
    a = r.actor;
    let sawFall = false;
    let landedAt = -1;
    for (let i = 0; i < 120; i++) {
      r = stepActor(a, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, solid);
      a = r.actor;
      if (a.anim === 'fall') sawFall = true;
      if (r.landed) {
        landedAt = i;
        expect(a.anim).toBe('land');
        expect(a.landTimer).toBe(LAND_TIME);
        break;
      }
    }
    expect(sawFall).toBe(true);
    expect(landedAt).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) a = stepActor(a, { dir: 0, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    expect(a.anim).toBe('idle');
  });

  it('同一个动画持续时 animTime 累加，切换时归零', () => {
    let a = createActor(100, 224);
    a = stepActor(a, { dir: 1, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    a = stepActor(a, { dir: 1, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    expect(a.animTime).toBeCloseTo(DT, 6);
    a = stepActor(a, { dir: 0, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    expect(a.animTime).toBe(0);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/actor/controller.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/actor/controller.ts`
```ts
import { createBody, step, type Body, type IsSolid, type MoveInput } from '../physics/platformer';

/**
 * 会走会跳的角色。只认识「输入 + 物理」，不知道关卡、剧情、期待值的存在——
 * 以后联机对战直接复用这一层（spec §1 联机准备）。
 */
export const ACTOR_W = 12;
export const ACTOR_H = 38;
export const LAND_TIME = 0.1;

export type Anim = 'idle' | 'walk' | 'jump' | 'fall' | 'land';

export interface Actor {
  body: Body;
  facing: 1 | -1;
  anim: Anim;
  animTime: number;
  landTimer: number;
}

export interface ActorStep {
  actor: Actor;
  jumped: boolean;
  landed: boolean;
  moving: boolean;
}

export function createActor(footXPos: number, footY: number): Actor {
  const body = { ...createBody(footXPos - ACTOR_W / 2, footY - ACTOR_H, ACTOR_W, ACTOR_H), onGround: true };
  return { body, facing: 1, anim: 'idle', animTime: 0, landTimer: 0 };
}

export function footX(a: Actor): number {
  return a.body.x + a.body.w / 2;
}

export function stepActor(a: Actor, input: MoveInput, dt: number, isSolid: IsSolid): ActorStep {
  const r = step(a.body, input, dt, isSolid);
  const facing: 1 | -1 = input.dir === 0 ? a.facing : input.dir;
  const landTimer = r.landed ? LAND_TIME : Math.max(0, a.landTimer - dt);
  const moving = Math.abs(r.body.x - a.body.x) > 0.01;
  const anim: Anim = !r.body.onGround
    ? r.body.vy < 0
      ? 'jump'
      : 'fall'
    : moving
      ? 'walk'
      : landTimer > 0
        ? 'land'
        : 'idle';
  const animTime = anim === a.anim ? a.animTime + dt : 0;
  return { actor: { body: r.body, facing, anim, animTime, landTimer }, jumped: r.jumped, landed: r.landed, moving };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/actor/controller.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/actor tests/actor
git commit -m "feat: 角色控制器（动画状态、朝向，与关卡解耦）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 期待值规则

**Files:**
- Create: `src/expectation/expectation.ts`
- Test: `tests/expectation/expectation.test.ts`

- [ ] **Step 1: 写失败的测试**

（全部用 dt = 0.25：二进制可精确表示，阈值判断不受浮点误差影响。）

`tests/expectation/expectation.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import {
  EXPECT,
  createExpectation,
  formatGain,
  idleRate,
  jumpGain,
  tickExpectation,
  type ExpectEvents,
  type ExpectState,
} from '../../src/expectation/expectation';

const DT = 0.25;
const still: ExpectEvents = { moving: false, jumped: false, onGround: true, newHotspots: 0 };
const airborne: ExpectEvents = { moving: false, jumped: false, onGround: false, newHotspots: 0 };
const ticks = (s: ExpectState, ev: ExpectEvents, n: number): ExpectState => {
  let cur = s;
  for (let i = 0; i < n; i++) cur = tickExpectation(cur, ev, DT).state;
  return cur;
};

describe('expectation', () => {
  it('开局 29%，状态正常', () => {
    const s = createExpectation();
    expect(s.value).toBe(29);
    expect(s.status).toBe('ok');
  });

  it('走动每秒 +0.3%', () => {
    const s = ticks(createExpectation(), { ...still, moving: true }, 40);
    expect(s.value).toBeCloseTo(32, 6);
  });

  it('跳跃收益：3 秒内连跳逐次减半，最低 0.1%', () => {
    expect(jumpGain(0)).toBe(2);
    expect(jumpGain(1)).toBe(1);
    expect(jumpGain(2)).toBe(0.5);
    expect(jumpGain(10)).toBe(EXPECT.jumpMin);
    let s = createExpectation();
    const gains: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = tickExpectation(s, { ...airborne, jumped: true }, DT);
      gains.push(...t.gains);
      s = t.state;
    }
    expect(gains).toEqual([2, 1, 0.5]);
  });

  it('跳跃收益在 3 秒后恢复', () => {
    let s = tickExpectation(createExpectation(), { ...airborne, jumped: true }, DT).state;
    s = ticks(s, airborne, 12);
    const t = tickExpectation(s, { ...airborne, jumped: true }, DT);
    expect(t.gains).toEqual([2]);
  });

  it('首次调查 +6%，一步里两个就加两次', () => {
    const t = tickExpectation(createExpectation(), { ...airborne, newHotspots: 2 }, DT);
    expect(t.state.value).toBe(41);
    expect(t.gains).toEqual([6, 6]);
  });

  it('发呆 2 秒内不掉', () => {
    expect(ticks(createExpectation(), still, 8).value).toBe(29);
  });

  it('发呆超过 2 秒开始掉，每多 1 秒速率 +0.5%/s', () => {
    expect(idleRate(2)).toBe(0);
    expect(idleRate(2.25)).toBe(1);
    expect(idleRate(3)).toBe(1.5);
    expect(idleRate(4.5)).toBe(2);
    expect(idleRate(100)).toBe(EXPECT.idleMax);
    // 第 9~12 步 idleTime = 2.25/2.5/2.75/3 → 速率 1/1/1/1.5 → 共掉 1.125
    expect(ticks(createExpectation(), still, 12).value).toBeCloseTo(27.875, 6);
  });

  it('一动就把发呆计时清零', () => {
    let s = ticks(createExpectation(), still, 12);
    s = tickExpectation(s, { ...still, moving: true }, DT).state;
    expect(s.idleTime).toBe(0);
  });

  it('在空中不算发呆', () => {
    expect(ticks(createExpectation(), airborne, 40).value).toBe(29);
  });

  it('不会低于 0、不会高于 100', () => {
    const low: ExpectState = { ...createExpectation(), value: 0.5 };
    expect(ticks(low, still, 80).value).toBe(0);
    const high: ExpectState = { ...createExpectation(), value: 59 };
    const t = tickExpectation(high, { ...airborne, newHotspots: 10 }, DT);
    expect(t.state.value).toBe(100);
  });

  it('低于 20% 进入危险，连续 5 秒失败', () => {
    const start: ExpectState = { ...createExpectation(), value: 19 };
    let s = tickExpectation(start, airborne, DT).state;
    expect(s.status).toBe('danger');
    s = ticks(s, airborne, 18);
    expect(s.status).toBe('danger');
    s = tickExpectation(s, airborne, DT).state;
    expect(s.dangerTime).toBe(5);
    expect(s.status).toBe('failed');
  });

  it('回到 20% 以上危险计时清零', () => {
    const start: ExpectState = { ...createExpectation(), value: 19 };
    let s = ticks(start, airborne, 10);
    s = tickExpectation(s, { ...airborne, newHotspots: 1 }, DT).state;
    expect(s.status).toBe('ok');
    expect(s.dangerTime).toBe(0);
  });

  it('达到 60% 过关，之后不再变化', () => {
    const start: ExpectState = { ...createExpectation(), value: 55 };
    const s = tickExpectation(start, { ...airborne, newHotspots: 1 }, DT).state;
    expect(s.status).toBe('passed');
    const again = tickExpectation(s, { ...still, newHotspots: 3 }, DT);
    expect(again.state).toBe(s);
    expect(again.gains).toEqual([]);
  });

  it('失败之后不再变化', () => {
    const failed: ExpectState = { ...createExpectation(), value: 5, status: 'failed' };
    expect(tickExpectation(failed, { ...still, newHotspots: 1 }, DT).state).toBe(failed);
  });

  it('formatGain：≥1 取整，<1 保留一位小数', () => {
    expect(formatGain(6)).toBe('6');
    expect(formatGain(2)).toBe('2');
    expect(formatGain(0.5)).toBe('0.5');
    expect(formatGain(0.1)).toBe('0.1');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/expectation/expectation.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/expectation/expectation.ts`
```ts
/** spec §4.2 的期待值规则。所有数字都是初值，调手感只改这里。 */
export const EXPECT = {
  start: 29,
  walkPerSec: 0.3,
  jumpBase: 2,
  jumpWindow: 3,
  jumpMin: 0.1,
  hotspot: 6,
  idleGrace: 2,
  idleBase: 1,
  idleAccel: 0.5,
  idleMax: 4,
  danger: 20,
  failAfter: 5,
  pass: 60,
} as const;

export type ExpectStatus = 'ok' | 'danger' | 'failed' | 'passed';

export interface ExpectState {
  value: number;
  time: number;
  idleTime: number;
  recentJumps: readonly number[];
  dangerTime: number;
  status: ExpectStatus;
}

export interface ExpectEvents {
  moving: boolean;
  jumped: boolean;
  onGround: boolean;
  newHotspots: number;
}

export interface ExpectTick {
  state: ExpectState;
  /** 本步的每一笔加分（跳跃、调查点），用来飘「+N%」。走动的细水长流不飘字。 */
  gains: number[];
}

export function createExpectation(): ExpectState {
  return { value: EXPECT.start, time: 0, idleTime: 0, recentJumps: [], dangerTime: 0, status: 'ok' };
}

export function idleRate(idleTime: number): number {
  if (idleTime <= EXPECT.idleGrace) return 0;
  return Math.min(EXPECT.idleMax, EXPECT.idleBase + EXPECT.idleAccel * Math.floor(idleTime - EXPECT.idleGrace));
}

export function jumpGain(recentCount: number): number {
  return Math.max(EXPECT.jumpMin, EXPECT.jumpBase * 0.5 ** recentCount);
}

export function formatGain(g: number): string {
  return g >= 1 ? String(Math.round(g)) : g.toFixed(1);
}

export function tickExpectation(s: ExpectState, ev: ExpectEvents, dt: number): ExpectTick {
  if (s.status === 'failed' || s.status === 'passed') return { state: s, gains: [] };

  const time = s.time + dt;
  let value = s.value;
  const gains: number[] = [];

  if (ev.moving) value += EXPECT.walkPerSec * dt;

  let recentJumps = s.recentJumps.filter((t) => t > time - EXPECT.jumpWindow);
  if (ev.jumped) {
    const g = jumpGain(recentJumps.length);
    value += g;
    gains.push(g);
    recentJumps = [...recentJumps, time];
  }

  for (let i = 0; i < ev.newHotspots; i++) {
    value += EXPECT.hotspot;
    gains.push(EXPECT.hotspot);
  }

  const idle = !ev.moving && !ev.jumped && ev.onGround;
  const idleTime = idle ? s.idleTime + dt : 0;
  value -= idleRate(idleTime) * dt;

  value = Math.min(100, Math.max(0, value));

  let dangerTime = 0;
  let status: ExpectStatus = 'ok';
  if (value >= EXPECT.pass) {
    status = 'passed';
  } else if (value < EXPECT.danger) {
    dangerTime = s.dangerTime + dt;
    status = dangerTime >= EXPECT.failAfter ? 'failed' : 'danger';
  }

  return { state: { value, time, idleTime, recentJumps, dangerTime, status }, gains };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/expectation/expectation.test.ts`
Expected: 15 passed

- [ ] **Step 5: 变异自检**

把 `const idle = !ev.moving && !ev.jumped && ev.onGround;` 改成 `const idle = !ev.moving && !ev.jumped;`，确认「在空中不算发呆」变红；恢复。

- [ ] **Step 6: Commit**

```bash
git add src/expectation tests/expectation
git commit -m "feat: 期待值规则（走动、跳跃衰减、调查点、发呆、危险、过关）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 对话状态与对话队列

**Files:**
- Create: `src/dialogue/dialogue.ts`
- Test: `tests/dialogue/dialogue.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/dialogue/dialogue.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import {
  CHARS_PER_SEC,
  SPEAKER_NAMES,
  advanceDialogue,
  isComplete,
  openLine,
  say,
  startTalk,
  stepTalk,
  think,
  tickDialogue,
  visibleText,
} from '../../src/dialogue/dialogue';

describe('dialogue', () => {
  it('say / think 构造台词', () => {
    expect(say('chenling', '好渴')).toEqual({ speaker: 'chenling', text: '好渴', style: 'say' });
    expect(think('……是梦？')).toEqual({ speaker: null, text: '……是梦？', style: 'think' });
    expect(SPEAKER_NAMES.chentan).toBe('陈坛');
  });

  it('逐字显示：每秒 30 个字', () => {
    let d = openLine(say('lixiuchun', '阿伶……你、你是怎么回来的？'));
    expect(visibleText(d)).toBe('');
    d = tickDialogue(d, 2 / CHARS_PER_SEC);
    expect(visibleText(d)).toBe('阿伶');
    d = tickDialogue(d, 10);
    expect(visibleText(d)).toBe('阿伶……你、你是怎么回来的？');
    expect(isComplete(d)).toBe(true);
  });

  it('没显示完时点一下补全，显示完再点一下结束', () => {
    const d = openLine(say('chenling', '好渴……家里有水吗？'));
    const r1 = advanceDialogue(d);
    expect(r1.finished).toBe(false);
    expect(isComplete(r1.state)).toBe(true);
    const r2 = advanceDialogue(r1.state);
    expect(r2.finished).toBe(true);
  });

  it('对话队列：一句一句往下走，走完 current 为 null', () => {
    let t = startTalk([think('一'), think('二')]);
    expect(t.current?.line.text).toBe('一');
    t = stepTalk(t, 0, true);
    t = stepTalk(t, 0, true);
    expect(t.current?.line.text).toBe('二');
    t = stepTalk(t, 0, true);
    t = stepTalk(t, 0, true);
    expect(t.current).toBeNull();
  });

  it('不点就停在当前句', () => {
    let t = startTalk([think('一')]);
    t = stepTalk(t, 5, false);
    expect(t.current?.line.text).toBe('一');
    expect(isComplete(t.current!)).toBe(true);
  });

  it('空队列的 startTalk 没有 current', () => {
    expect(startTalk([]).current).toBeNull();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/dialogue/dialogue.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/dialogue/dialogue.ts`
```ts
export type Speaker = 'chenling' | 'lixiuchun' | 'chentan';

export const SPEAKER_NAMES: Readonly<Record<Speaker, string>> = {
  chenling: '陈伶',
  lixiuchun: '李秀春',
  chentan: '陈坛',
};

export interface Line {
  speaker: Speaker | null;
  text: string;
  style: 'say' | 'think';
}

export const CHARS_PER_SEC = 30;

export interface DialogueState {
  line: Line;
  shown: number;
}

export const say = (speaker: Speaker, text: string): Line => ({ speaker, text, style: 'say' });
export const think = (text: string): Line => ({ speaker: null, text, style: 'think' });

const totalChars = (line: Line): number => Array.from(line.text).length;

export function openLine(line: Line): DialogueState {
  return { line, shown: 0 };
}

export function isComplete(s: DialogueState): boolean {
  return s.shown >= totalChars(s.line);
}

export function tickDialogue(s: DialogueState, dt: number): DialogueState {
  return { ...s, shown: Math.min(totalChars(s.line), s.shown + CHARS_PER_SEC * dt) };
}

export function advanceDialogue(s: DialogueState): { state: DialogueState; finished: boolean } {
  if (!isComplete(s)) return { state: { ...s, shown: totalChars(s.line) }, finished: false };
  return { state: s, finished: true };
}

export function visibleText(s: DialogueState): string {
  return Array.from(s.line.text).slice(0, Math.floor(s.shown + 1e-9)).join('');
}

/** 一串要依次说完的台词（调查物件的想法、关卡开头的引导）。 */
export interface Talk {
  current: DialogueState | null;
  queue: readonly Line[];
}

export function startTalk(lines: readonly Line[]): Talk {
  if (lines.length === 0) return { current: null, queue: [] };
  return { current: openLine(lines[0]), queue: lines.slice(1) };
}

export function stepTalk(t: Talk, dt: number, advance: boolean): Talk {
  if (!t.current) return t;
  let d = tickDialogue(t.current, dt);
  if (advance) {
    const r = advanceDialogue(d);
    if (r.finished) return startTalk(t.queue);
    d = r.state;
  }
  return { current: d, queue: t.queue };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/dialogue/dialogue.test.ts`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/dialogue tests/dialogue
git commit -m "feat: 对话（逐字显示、补全、对话队列）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 音效 id 与 WebAudio 合成

**Files:**
- Create: `src/audio/sound-ids.ts`, `src/audio/synth.ts`
- Test: `tests/audio/synth.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/audio/synth.test.ts`
```ts
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
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/audio/synth.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/audio/sound-ids.ts`
```ts
export const SOUND_IDS = [
  'creak',
  'door',
  'crack',
  'gulp',
  'bell',
  'heartbeat',
  'rumble',
  'shatter',
  'splash',
  'pop',
  'blip',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];
```

`src/audio/synth.ts`
```ts
import type { SoundId } from './sound-ids';

export interface Sfx {
  /** 必须在一次用户点击里调用（iOS 规定声音只能由手势开启）。 */
  unlock(): void;
  play(id: SoundId): void;
  setRain(on: boolean): void;
  setHeartbeat(on: boolean): void;
}

const SILENT: Sfx = { unlock() {}, play() {}, setRain() {}, setHeartbeat() {} };

export function createSfx(): Sfx {
  const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return SILENT;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let rain: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const env = (g: GainNode, t: number, peak: number, attack: number, decay: number): void => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };

  const tone = (type: OscillatorType, f0: number, f1: number, peak: number, decay: number, delay = 0): void => {
    if (!ctx || !master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + decay);
    env(g, t, peak, 0.005, decay);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + decay + 0.05);
  };

  const burst = (filter: BiquadFilterType, f0: number, f1: number, q: number, peak: number, decay: number): void => {
    if (!ctx || !master || !noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + decay);
    const g = ctx.createGain();
    env(g, t, peak, 0.004, decay);
    src.connect(bq).connect(g).connect(master);
    src.start(t);
    src.stop(t + decay + 0.05);
  };

  const play = (id: SoundId): void => {
    if (!ctx) return;
    switch (id) {
      case 'creak':
        burst('bandpass', 900, 380, 9, 0.35, 0.18);
        break;
      case 'door':
        tone('sine', 90, 50, 0.5, 0.35);
        burst('lowpass', 400, 200, 1, 0.25, 0.25);
        break;
      case 'crack':
        burst('highpass', 1800, 1200, 1, 0.6, 0.12);
        break;
      case 'gulp':
        tone('sine', 420, 150, 0.35, 0.16);
        break;
      case 'bell':
        for (const [f, p] of [[523, 0.35], [1046, 0.18], [1568, 0.1]] as const) tone('sine', f, f * 0.995, p, 2.5);
        break;
      case 'heartbeat':
        tone('sine', 60, 45, 0.7, 0.12);
        tone('sine', 55, 40, 0.5, 0.12, 0.22);
        break;
      case 'rumble':
        tone('sine', 48, 30, 0.6, 1.2);
        break;
      case 'shatter':
        burst('highpass', 2500, 1500, 1, 0.7, 0.6);
        burst('highpass', 1800, 900, 1, 0.5, 0.2);
        break;
      case 'splash':
        burst('bandpass', 1300, 600, 2, 0.4, 0.3);
        break;
      case 'pop':
        tone('sine', 660, 990, 0.2, 0.07);
        break;
      case 'blip':
        tone('square', 880, 880, 0.08, 0.05);
        break;
    }
  };

  return {
    unlock() {
      if (!ctx) {
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') void ctx.resume();
    },
    play,
    setRain(on) {
      if (!ctx || !master || !noise) return;
      if (on && !rain) {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1200;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 1);
        src.connect(lp).connect(gain).connect(master);
        src.start();
        rain = { src, gain };
      } else if (!on && rain) {
        const r = rain;
        rain = null;
        r.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        r.src.stop(ctx.currentTime + 0.9);
      }
    },
    setHeartbeat(on) {
      if (on && !heartbeatTimer && ctx) {
        play('heartbeat');
        heartbeatTimer = setInterval(() => play('heartbeat'), 900);
      } else if (!on && heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  };
}
```

- [ ] **Step 4: 运行测试与类型检查**

Run: `npx vitest run tests/audio && npm run typecheck`
Expected: 1 passed；typecheck 无输出

- [ ] **Step 5: Commit**

```bash
git add src/audio tests/audio
git commit -m "feat: WebAudio 合成音效（雨、嘎吱、心跳、铃、碎裂等）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 过场执行器

**Files:**
- Create: `src/cutscene/runner.ts`
- Test: `tests/cutscene/runner.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/cutscene/runner.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { FOLLOW_OFFSET, createRunner, createWorld, skipRunner, tickRunner, type Runner, type Step } from '../../src/cutscene/runner';
import { say } from '../../src/dialogue/dialogue';

const playAll = (r0: Runner, dt = 0.1, maxTicks = 5000): Runner => {
  let r = r0;
  for (let i = 0; i < maxTicks && !r.finished; i++) r = tickRunner(r, dt, true).runner;
  return r;
};

describe('cutscene runner', () => {
  it('开局世界：黑屏、无人可见', () => {
    const w = createWorld();
    expect(w.fade).toBe(1);
    expect(w.scene).toBe('black');
    expect(w.actors.chenling.visible).toBe(false);
  });

  it('瞬时步骤在同一个 tick 里连着执行，音效只发一次', () => {
    const steps: Step[] = [
      { kind: 'rain', on: true },
      { kind: 'cut', scene: 'street', cameraX: 100 },
      { kind: 'sfx', sound: 'door' },
      { kind: 'place', actor: 'chenling', x: 50, facing: 1, visible: true },
      { kind: 'wait', duration: 1 },
    ];
    const t1 = tickRunner(createRunner(steps), 0.1, false);
    expect(t1.sounds).toEqual(['door']);
    expect(t1.runner.world.rain).toBe(true);
    expect(t1.runner.world.scene).toBe('street');
    expect(t1.runner.world.actors.chenling).toMatchObject({ x: 50, visible: true });
    expect(t1.runner.index).toBe(4);
    const t2 = tickRunner(t1.runner, 0.1, false);
    expect(t2.sounds).toEqual([]);
  });

  it('fade 按时长线性过渡', () => {
    let r = createRunner([{ kind: 'fade', to: 0, duration: 1 }]);
    r = tickRunner(r, 0.5, false).runner;
    expect(r.world.fade).toBeCloseTo(0.5, 6);
    r = tickRunner(r, 0.5, false).runner;
    expect(r.world.fade).toBe(0);
    expect(r.finished).toBe(true);
  });

  it('pan 移动镜头', () => {
    let r = createRunner([{ kind: 'pan', toX: 200, duration: 2 }]);
    r = tickRunner(r, 1, false).runner;
    expect(r.world.cameraX).toBeCloseTo(100, 6);
  });

  it('walk 以给定速度走到目标点，途中 walking 为真并朝向目标', () => {
    let r = createRunner([
      { kind: 'place', actor: 'chenling', x: 100, facing: 1, visible: true },
      { kind: 'walk', actor: 'chenling', toX: 40, speed: 30 },
    ]);
    r = tickRunner(r, 1, false).runner;
    expect(r.world.actors.chenling).toMatchObject({ x: 70, walking: true, facing: -1 });
    r = tickRunner(r, 1, false).runner;
    r = tickRunner(r, 1, false).runner;
    expect(r.world.actors.chenling).toMatchObject({ x: 40, walking: false });
    expect(r.finished).toBe(true);
  });

  it('say 停住等玩家：第一下补全文字，第二下结束', () => {
    let r = createRunner([{ kind: 'say', line: say('chenling', '好渴……家里有水吗？') }]);
    r = tickRunner(r, 0.01, false).runner;
    expect(r.world.dialogue).not.toBeNull();
    r = tickRunner(r, 10, false).runner;
    expect(r.finished).toBe(false);
    r = tickRunner(r, 0.01, true).runner;
    expect(r.world.dialogue).toBeNull();
    expect(r.finished).toBe(true);
  });

  it('shake 设定震动，之后随时间衰减', () => {
    let r = createRunner([
      { kind: 'shake', duration: 0.3, strength: 2 },
      { kind: 'wait', duration: 5 },
    ]);
    r = tickRunner(r, 0.1, false).runner;
    expect(r.world.shakeTime).toBeCloseTo(0.3, 6);
    r = tickRunner(r, 0.1, false).runner;
    expect(r.world.shakeTime).toBeCloseTo(0.2, 6);
  });

  it('follow 让镜头跟着角色（角色 x − FOLLOW_OFFSET）', () => {
    let r = createRunner([
      { kind: 'place', actor: 'chenling', x: 500, facing: 1, visible: true },
      { kind: 'follow', actor: 'chenling' },
      { kind: 'walk', actor: 'chenling', toX: 600, speed: 50 },
    ]);
    r = tickRunner(r, 1, false).runner;
    expect(r.world.cameraX).toBeCloseTo(550 - FOLLOW_OFFSET, 6);
  });

  it('跳过：终态与完整演完一致', () => {
    const steps: Step[] = [
      { kind: 'rain', on: true },
      { kind: 'cut', scene: 'home', cameraX: 480 },
      { kind: 'place', actor: 'lixiuchun', x: 750, facing: -1, visible: true },
      { kind: 'fade', to: 0, duration: 1 },
      { kind: 'say', line: say('lixiuchun', '阿伶……你、你是怎么回来的？') },
      { kind: 'pose', actor: 'lixiuchun', pose: 'scared' },
      { kind: 'walk', actor: 'lixiuchun', toX: 700, speed: 20 },
      { kind: 'prop', prop: 'bucket', state: 'empty' },
      { kind: 'pan', toX: 600, duration: 2 },
      { kind: 'fade', to: 1, duration: 1 },
    ];
    const played = playAll(createRunner(steps));
    const halfway = tickRunner(tickRunner(createRunner(steps), 0.5, false).runner, 0.5, false).runner;
    const skipped = skipRunner(halfway);
    expect(skipped.finished).toBe(true);
    expect(skipped.world).toEqual({ ...played.world, shakeTime: 0 });
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/cutscene/runner.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/cutscene/runner.ts`
```ts
import { advanceDialogue, openLine, tickDialogue, type DialogueState, type Line } from '../dialogue/dialogue';
import type { SoundId } from '../audio/sound-ids';

export type SceneId = 'black' | 'street' | 'home';
export type ActorId = 'chenling' | 'lixiuchun' | 'chentan';
export type Pose = 'stand' | 'drink' | 'scared';

/** follow 时镜头左缘 = 角色 x − 这个值（让角色在画面偏左的位置往右走）。 */
export const FOLLOW_OFFSET = 200;

export interface ActorView {
  x: number;
  facing: 1 | -1;
  visible: boolean;
  pose: Pose;
  walking: boolean;
  stagger: boolean;
}

export interface CutsceneWorld {
  scene: SceneId;
  cameraX: number;
  follow: ActorId | null;
  fade: number;
  shakeTime: number;
  shakeStrength: number;
  rain: boolean;
  actors: Record<ActorId, ActorView>;
  props: Record<string, string>;
  dialogue: DialogueState | null;
}

export type Step =
  | { kind: 'fade'; to: number; duration: number }
  | { kind: 'cut'; scene: SceneId; cameraX: number }
  | { kind: 'pan'; toX: number; duration: number }
  | { kind: 'follow'; actor: ActorId | null }
  | { kind: 'place'; actor: ActorId; x: number; facing: 1 | -1; visible: boolean }
  | { kind: 'walk'; actor: ActorId; toX: number; speed: number; stagger?: boolean }
  | { kind: 'pose'; actor: ActorId; pose: Pose }
  | { kind: 'prop'; prop: string; state: string }
  | { kind: 'say'; line: Line }
  | { kind: 'wait'; duration: number }
  | { kind: 'shake'; duration: number; strength: number }
  | { kind: 'sfx'; sound: SoundId }
  | { kind: 'rain'; on: boolean };

export interface Runner {
  steps: readonly Step[];
  index: number;
  t: number;
  from: number;
  world: CutsceneWorld;
  finished: boolean;
}

export interface RunnerTick {
  runner: Runner;
  sounds: SoundId[];
}

export function createWorld(): CutsceneWorld {
  const actor = (): ActorView => ({ x: 0, facing: 1, visible: false, pose: 'stand', walking: false, stagger: false });
  return {
    scene: 'black',
    cameraX: 0,
    follow: null,
    fade: 1,
    shakeTime: 0,
    shakeStrength: 0,
    rain: false,
    actors: { chenling: actor(), lixiuchun: actor(), chentan: actor() },
    props: {},
    dialogue: null,
  };
}

export function createRunner(steps: readonly Step[], world: CutsceneWorld = createWorld()): Runner {
  return { steps, index: 0, t: 0, from: NaN, world, finished: steps.length === 0 };
}

function withActor(w: CutsceneWorld, id: ActorId, patch: Partial<ActorView>): CutsceneWorld {
  return { ...w, actors: { ...w.actors, [id]: { ...w.actors[id], ...patch } } };
}

function applyFollow(w: CutsceneWorld): CutsceneWorld {
  return w.follow ? { ...w, cameraX: w.actors[w.follow].x - FOLLOW_OFFSET } : w;
}

/** 某一步演完之后世界的样子。正常演完与跳过共用这一个函数，保证两条路终态一致。 */
export function applyFinal(w: CutsceneWorld, s: Step): CutsceneWorld {
  switch (s.kind) {
    case 'fade':
      return { ...w, fade: s.to };
    case 'cut':
      return { ...w, scene: s.scene, cameraX: s.cameraX };
    case 'pan':
      return { ...w, cameraX: s.toX };
    case 'follow':
      return applyFollow({ ...w, follow: s.actor });
    case 'place':
      return applyFollow(withActor(w, s.actor, { x: s.x, facing: s.facing, visible: s.visible, walking: false, stagger: false }));
    case 'walk':
      return applyFollow(withActor(w, s.actor, { x: s.toX, walking: false, stagger: false }));
    case 'pose':
      return withActor(w, s.actor, { pose: s.pose });
    case 'prop':
      return { ...w, props: { ...w.props, [s.prop]: s.state } };
    case 'rain':
      return { ...w, rain: s.on };
    case 'say':
      return { ...w, dialogue: null };
    case 'wait':
    case 'shake':
    case 'sfx':
      return w;
  }
}

export function tickRunner(r: Runner, dt: number, advancePressed: boolean): RunnerTick {
  if (r.finished) return { runner: r, sounds: [] };
  const sounds: SoundId[] = [];
  let world: CutsceneWorld = { ...r.world, shakeTime: Math.max(0, r.world.shakeTime - dt) };
  let { index, t, from } = r;

  while (index < r.steps.length) {
    const s = r.steps[index];
    if (s.kind === 'sfx') {
      sounds.push(s.sound);
      index++;
      continue;
    }
    if (s.kind === 'shake') {
      world = { ...world, shakeTime: s.duration, shakeStrength: s.strength };
      index++;
      continue;
    }
    if (s.kind === 'cut' || s.kind === 'place' || s.kind === 'pose' || s.kind === 'prop' || s.kind === 'rain' || s.kind === 'follow') {
      world = applyFinal(world, s);
      index++;
      continue;
    }
    // 下面是有时长的步骤：一个 tick 只推进当前这一个
    if (s.kind === 'say') {
      let d = tickDialogue(world.dialogue ?? openLine(s.line), dt);
      if (advancePressed) {
        const res = advanceDialogue(d);
        if (res.finished) {
          world = applyFinal(world, s);
          index++;
          t = 0;
          from = NaN;
          break;
        }
        d = res.state;
      }
      world = { ...world, dialogue: d };
      break;
    }
    if (s.kind === 'walk') {
      const a = world.actors[s.actor];
      const dir = Math.sign(s.toX - a.x);
      const nx = a.x + dir * s.speed * dt;
      const arrived = dir === 0 || (dir > 0 ? nx >= s.toX : nx <= s.toX);
      if (arrived) {
        world = applyFinal(world, s);
        index++;
        t = 0;
        from = NaN;
      } else {
        world = applyFollow(withActor(world, s.actor, { x: nx, facing: dir > 0 ? 1 : -1, walking: true, stagger: !!s.stagger }));
      }
      break;
    }
    // fade / pan / wait
    if (Number.isNaN(from)) from = s.kind === 'fade' ? world.fade : s.kind === 'pan' ? world.cameraX : 0;
    t += dt;
    const p = s.duration <= 0 ? 1 : Math.min(1, t / s.duration);
    if (s.kind === 'fade') world = { ...world, fade: from + (s.to - from) * p };
    if (s.kind === 'pan') world = { ...world, cameraX: from + (s.toX - from) * p };
    if (p >= 1) {
      world = applyFinal(world, s);
      index++;
      t = 0;
      from = NaN;
    }
    break;
  }

  return { runner: { ...r, index, t, from, world, finished: index >= r.steps.length }, sounds };
}

export function skipRunner(r: Runner): Runner {
  let world = r.world;
  for (let i = r.index; i < r.steps.length; i++) world = applyFinal(world, r.steps[i]);
  return { ...r, index: r.steps.length, t: 0, from: NaN, world: { ...world, dialogue: null, shakeTime: 0 }, finished: true };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/cutscene/runner.test.ts`
Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/cutscene tests/cutscene
git commit -m "feat: 过场剧本执行器（淡入淡出、移镜头、走位、对白、跳过）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 关卡数据

**Files:**
- Create: `src/level/level.ts`, `src/level/stage.ts`, `src/level/home.ts`, `src/level/street.ts`
- Test: `tests/level/levels.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/level/levels.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { buildRows, interactableBox, isSolidIn, spawnFoot, type LevelDef } from '../../src/level/level';
import { STAGE } from '../../src/level/stage';
import { HOME } from '../../src/level/home';
import { STREET } from '../../src/level/street';
import { TILE } from '../../src/physics/platformer';

const standable = (level: LevelDef, tx: number, row: number): boolean => {
  const solid = isSolidIn(level);
  return solid(tx, row) && !solid(tx, row - 1) && !solid(tx, row - 2) && !solid(tx, row - 3);
};

describe('level 工具', () => {
  it('buildRows 按矩形填字符，越界忽略', () => {
    expect(buildRows(4, 2, [{ x0: 1, x1: 9, y0: 1, y1: 1, ch: '=' }])).toEqual(['....', '.===']);
  });

  it('isSolidIn：左右越界是墙，上方越界是空，下方越界是地', () => {
    const lv: LevelDef = { id: 'street', width: 2, height: 2, rows: ['..', '=.'], spawnTileX: 0, floorRow: 1, interactables: [], triggers: [] };
    const solid = isSolidIn(lv);
    expect(solid(-1, 0)).toBe(true);
    expect(solid(2, 0)).toBe(true);
    expect(solid(0, -5)).toBe(false);
    expect(solid(1, 9)).toBe(true);
    expect(solid(0, 1)).toBe(true);
    expect(solid(1, 1)).toBe(false);
  });

  it('interactableBox：站在 tileY 那一行的表面上，16×32', () => {
    expect(interactableBox({ id: 'a', tileX: 3, tileY: 14, lines: [], scoring: false, finale: false })).toEqual({ x: 48, y: 192, w: 16, h: 32 });
  });
});

describe('三张地图', () => {
  for (const level of [STAGE, HOME, STREET]) {
    it(`${level.id}：每行宽度一致、行数正确`, () => {
      expect(level.rows).toHaveLength(level.height);
      for (const row of level.rows) expect(row).toHaveLength(level.width);
    });
    it(`${level.id}：出生点站在地面上`, () => {
      expect(standable(level, level.spawnTileX, level.floorRow)).toBe(true);
      expect(spawnFoot(level)).toEqual({ x: level.spawnTileX * TILE + TILE / 2, y: level.floorRow * TILE });
    });
    it(`${level.id}：每个调查点下面是能站的地面`, () => {
      for (const it of level.interactables) expect(standable(level, it.tileX, it.tileY), it.id).toBe(true);
    });
  }

  it('剧场：60×17，6 个计分调查点（spec §4.2）', () => {
    expect(STAGE.width).toBe(60);
    expect(STAGE.height).toBe(17);
    expect(STAGE.interactables.map((i) => i.id)).toEqual(['crack', 'curtainL', 'edge', 'trapdoor', 'fakeDoor', 'curtainR']);
    expect(STAGE.interactables.every((i) => i.scoring && !i.finale)).toBe(true);
  });

  it('剧场：假门在台子上，要跳上去', () => {
    const door = STAGE.interactables.find((i) => i.id === 'fakeDoor')!;
    expect(door.tileY).toBeLessThan(STAGE.floorRow);
  });

  it('家：90×17，7 个调查点、唯一的结尾在厨房最右，2 个幻觉触发区', () => {
    expect(HOME.width).toBe(90);
    expect(HOME.interactables).toHaveLength(7);
    const finales = HOME.interactables.filter((i) => i.finale);
    expect(finales.map((i) => i.id)).toEqual(['bucket']);
    expect(Math.max(...HOME.interactables.map((i) => i.tileX))).toBe(finales[0].tileX);
    expect(HOME.interactables.every((i) => !i.scoring)).toBe(true);
    expect(HOME.triggers.map((t) => t.effect)).toEqual(['eyesWall', 'screenFlicker']);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/level/levels.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/level/level.ts`
```ts
import { TILE, type IsSolid } from '../physics/platformer';

export type MapId = 'stage' | 'home' | 'street';

/** 瓦片坐标的闭区间矩形。 */
export interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  ch: string;
}

export interface InteractableDef {
  id: string;
  /** 物件所在的瓦片列 */
  tileX: number;
  /** 物件「站」在哪一行的表面上（那一行的顶边就是地面） */
  tileY: number;
  lines: readonly string[];
  /** 首次调查是否加期待值（只有剧场的调查点是） */
  scoring: boolean;
  /** 调查完是否进入关卡结尾（只有厨房的水桶是） */
  finale: boolean;
}

export interface TriggerDef {
  id: string;
  tileX: number;
  effect: 'eyesWall' | 'screenFlicker';
}

export interface LevelDef {
  id: MapId;
  width: number;
  height: number;
  rows: readonly string[];
  spawnTileX: number;
  floorRow: number;
  interactables: readonly InteractableDef[];
  triggers: readonly TriggerDef[];
}

/** '=' 地板，'#' 墙，'x' 箱子/台子。'.' 是空。 */
export const SOLID_TILES: ReadonlySet<string> = new Set(['=', '#', 'x']);

export function buildRows(width: number, height: number, rects: readonly Rect[]): string[] {
  const g = Array.from({ length: height }, () => Array<string>(width).fill('.'));
  for (const r of rects) {
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        if (y >= 0 && y < height && x >= 0 && x < width) g[y][x] = r.ch;
      }
    }
  }
  return g.map((row) => row.join(''));
}

export function isSolidIn(level: LevelDef): IsSolid {
  return (tx, ty) => {
    if (tx < 0 || tx >= level.width) return true;
    if (ty < 0) return false;
    if (ty >= level.height) return true;
    return SOLID_TILES.has(level.rows[ty][tx]);
  };
}

export function interactableBox(item: InteractableDef): { x: number; y: number; w: number; h: number } {
  return { x: item.tileX * TILE, y: item.tileY * TILE - 32, w: TILE, h: 32 };
}

export function spawnFoot(level: LevelDef): { x: number; y: number } {
  return { x: level.spawnTileX * TILE + TILE / 2, y: level.floorRow * TILE };
}

export function levelWidthPx(level: LevelDef): number {
  return level.width * TILE;
}
```

`src/level/stage.ts`
```ts
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
```

`src/level/home.ts`
```ts
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
```

`src/level/street.ts`
```ts
import { buildRows, type LevelDef } from './level';

const W = 60;
const H = 17;

/** 开场动画的雨夜街道。只用来画，不跑物理。陈伶家的门在第 52 列。 */
export const STREET_DOOR_TILE = 52;

export const STREET: LevelDef = {
  id: 'street',
  width: W,
  height: H,
  rows: buildRows(W, H, [{ x0: 0, x1: W - 1, y0: 14, y1: 16, ch: '=' }]),
  spawnTileX: 2,
  floorRow: 14,
  interactables: [],
  triggers: [],
};
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/level/levels.test.ts`
Expected: 15 passed

- [ ] **Step 5: Commit**

```bash
git add src/level tests/level
git commit -m "feat: 剧场、家、街道三张地图

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 调查点与触发区

**Files:**
- Create: `src/level/interactables.ts`
- Test: `tests/level/interactables.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/level/interactables.test.ts`
```ts
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
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/level/interactables.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/level/interactables.ts`
```ts
import { TILE, type Body } from '../physics/platformer';
import { interactableBox, type InteractableDef, type LevelDef, type TriggerDef } from './level';

/** 角色中心与物件中心的最大水平距离。 */
export const REACH = 16;

export function findNearby(level: LevelDef, body: Body): InteractableDef | null {
  const cx = body.x + body.w / 2;
  let best: InteractableDef | null = null;
  let bestD = Infinity;
  for (const it of level.interactables) {
    const box = interactableBox(it);
    const vertical = body.y < box.y + box.h && body.y + body.h > box.y;
    if (!vertical) continue;
    const d = Math.abs(cx - (box.x + box.w / 2));
    if (d <= REACH && d < bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}

export function markFound(found: ReadonlySet<string>, id: string): { found: ReadonlySet<string>; firstTime: boolean } {
  if (found.has(id)) return { found, firstTime: false };
  const next = new Set(found);
  next.add(id);
  return { found: next, firstTime: true };
}

export function crossedTriggers(
  triggers: readonly TriggerDef[],
  fired: ReadonlySet<string>,
  prevX: number,
  x: number,
): TriggerDef[] {
  return triggers.filter((t) => {
    if (fired.has(t.id)) return false;
    const cx = t.tileX * TILE + TILE / 2;
    return (prevX < cx && x >= cx) || (prevX > cx && x <= cx);
  });
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/level`
Expected: 21 passed

- [ ] **Step 5: Commit**

```bash
git add src/level tests/level
git commit -m "feat: 调查点靠近检测、首次调查、触发区

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 存档

**Files:**
- Create: `src/save/progress.ts`
- Test: `tests/save/progress.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/save/progress.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { SAVE_KEY, clearProgress, loadProgress, saveProgress, type KeyValueStore } from '../../src/save/progress';

const memory = (init: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } => {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
};

describe('progress', () => {
  it('没存过 → null', () => {
    expect(loadProgress(memory())).toBeNull();
  });

  it('存了能读回来', () => {
    const s = memory();
    saveProgress(s, 'home');
    expect(JSON.parse(s.data[SAVE_KEY])).toEqual({ v: 1, level: 'home' });
    expect(loadProgress(s)).toBe('home');
  });

  it('坏档一律当没存过', () => {
    for (const bad of ['{', '[]', 'null', '{"v":2,"level":"home"}', '{"v":1,"level":"moon"}', '{"v":1}']) {
      expect(loadProgress(memory({ [SAVE_KEY]: bad })), bad).toBeNull();
    }
  });

  it('存储本身抛异常也不影响游戏', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadProgress(broken)).toBeNull();
    expect(() => saveProgress(broken, 'stage')).not.toThrow();
    expect(() => clearProgress(broken)).not.toThrow();
  });

  it('clearProgress 删掉存档', () => {
    const s = memory();
    saveProgress(s, 'done');
    clearProgress(s);
    expect(loadProgress(s)).toBeNull();
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/save/progress.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/save/progress.ts`
```ts
export type SavedLevel = 'opening' | 'stage' | 'home' | 'done';

export const SAVE_KEY = 'xishen:progress:v1';
const LEVELS: readonly SavedLevel[] = ['opening', 'stage', 'home', 'done'];

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 读档绝不让游戏打不开：读不到、格式不对、版本不对，一律当没存过。 */
export function loadProgress(store: KeyValueStore): SavedLevel | null {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
    const rec = data as Record<string, unknown>;
    if (rec.v !== 1) return null;
    return LEVELS.includes(rec.level as SavedLevel) ? (rec.level as SavedLevel) : null;
  } catch {
    return null;
  }
}

export function saveProgress(store: KeyValueStore, level: SavedLevel): void {
  try {
    store.setItem(SAVE_KEY, JSON.stringify({ v: 1, level }));
  } catch {
    // 隐私模式 / 空间满：静默放弃，不影响游玩
  }
}

export function clearProgress(store: KeyValueStore): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    // 同上
  }
}

/** 拿不到 localStorage（被禁用）时退回内存存储。 */
export function safeLocalStorage(): KeyValueStore {
  try {
    const ls = window.localStorage;
    ls.getItem(SAVE_KEY);
    return ls;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => {
        mem.set(k, v);
      },
      removeItem: (k) => {
        mem.delete(k);
      },
    };
  }
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/save/progress.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/save tests/save
git commit -m "feat: 存档与容错读档

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 关卡流程状态机

**Files:**
- Create: `src/flow/game-flow.ts`
- Test: `tests/flow/game-flow.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/flow/game-flow.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { createFlow, dispatch, titleMenu, type FlowState } from '../../src/flow/game-flow';

describe('titleMenu', () => {
  it('按存档决定标题菜单', () => {
    expect(titleMenu(null)).toBe('fresh');
    expect(titleMenu('opening')).toBe('resume');
    expect(titleMenu('stage')).toBe('resume');
    expect(titleMenu('home')).toBe('resume');
    expect(titleMenu('done')).toBe('cleared');
  });
});

describe('dispatch', () => {
  it('从标题开始 → 开场', () => {
    const r = dispatch(createFlow(null), { type: 'start' });
    expect(r.state.mode).toBe('opening');
    expect(r.enter).toBe(true);
    expect(r.save).toEqual({ kind: 'none' });
  });

  it('有存档时 start 无效（必须选继续或从头开始）', () => {
    const r = dispatch(createFlow('stage'), { type: 'start' });
    expect(r.state.mode).toBe('title');
    expect(r.enter).toBe(false);
  });

  it('继续 → 进到存档那一关', () => {
    expect(dispatch(createFlow('home'), { type: 'continue' }).state.mode).toBe('home');
    expect(dispatch(createFlow('done'), { type: 'continue' }).state.mode).toBe('title');
  });

  it('从头开始 → 清档并进开场', () => {
    const r = dispatch(createFlow('home'), { type: 'restart' });
    expect(r.state).toEqual({ mode: 'opening', saved: null });
    expect(r.save).toEqual({ kind: 'clear' });
  });

  it('开场 → 剧场 → 家 → 结尾，每过一关存档', () => {
    let s: FlowState = { mode: 'opening', saved: null };
    let r = dispatch(s, { type: 'levelComplete' });
    expect(r.state.mode).toBe('stage');
    expect(r.save).toEqual({ kind: 'write', level: 'stage' });
    s = r.state;
    r = dispatch(s, { type: 'levelComplete' });
    expect(r.state.mode).toBe('home');
    expect(r.save).toEqual({ kind: 'write', level: 'home' });
    s = r.state;
    r = dispatch(s, { type: 'levelComplete' });
    expect(r.state).toEqual({ mode: 'end', saved: 'done' });
    expect(r.save).toEqual({ kind: 'write', level: 'done' });
    r = dispatch(r.state, { type: 'endFinished' });
    expect(r.state).toEqual({ mode: 'title', saved: 'done' });
  });

  it('剧场失败 → 重开剧场（enter 为真，不改存档）', () => {
    const r = dispatch({ mode: 'stage', saved: 'stage' }, { type: 'levelFailed' });
    expect(r.state.mode).toBe('stage');
    expect(r.enter).toBe(true);
    expect(r.save).toEqual({ kind: 'none' });
  });

  it('游玩中回到标题，存档不变', () => {
    const r = dispatch({ mode: 'home', saved: 'home' }, { type: 'quitToTitle' });
    expect(r.state).toEqual({ mode: 'title', saved: 'home' });
  });

  it('不相干的事件不改变状态', () => {
    const s: FlowState = { mode: 'home', saved: 'home' };
    const r = dispatch(s, { type: 'levelFailed' });
    expect(r.state).toBe(s);
    expect(r.enter).toBe(false);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/flow/game-flow.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/flow/game-flow.ts`
```ts
import type { SavedLevel } from '../save/progress';

export type Mode = 'title' | 'opening' | 'stage' | 'home' | 'end';

export interface FlowState {
  mode: Mode;
  saved: SavedLevel | null;
}

export type FlowEvent =
  | { type: 'start' }
  | { type: 'continue' }
  | { type: 'restart' }
  | { type: 'levelComplete' }
  | { type: 'levelFailed' }
  | { type: 'endFinished' }
  | { type: 'quitToTitle' };

export type SaveOp = { kind: 'none' } | { kind: 'write'; level: SavedLevel } | { kind: 'clear' };

export interface FlowResult {
  state: FlowState;
  save: SaveOp;
  /** 为真时需要（重新）进入 state.mode：建新会话、换界面 */
  enter: boolean;
}

export type TitleMenu = 'fresh' | 'resume' | 'cleared';

export function createFlow(saved: SavedLevel | null): FlowState {
  return { mode: 'title', saved };
}

export function titleMenu(saved: SavedLevel | null): TitleMenu {
  if (saved === null) return 'fresh';
  if (saved === 'done') return 'cleared';
  return 'resume';
}

const NONE: SaveOp = { kind: 'none' };

export function dispatch(s: FlowState, e: FlowEvent): FlowResult {
  const go = (mode: Mode, save: SaveOp = NONE, saved: SavedLevel | null = s.saved): FlowResult => ({
    state: { mode, saved },
    save,
    enter: true,
  });
  const stay: FlowResult = { state: s, save: NONE, enter: false };

  switch (s.mode) {
    case 'title':
      if (e.type === 'start') return s.saved === null ? go('opening') : stay;
      if (e.type === 'continue' && (s.saved === 'opening' || s.saved === 'stage' || s.saved === 'home')) return go(s.saved);
      if (e.type === 'restart') return go('opening', { kind: 'clear' }, null);
      return stay;
    case 'opening':
      if (e.type === 'levelComplete') return go('stage', { kind: 'write', level: 'stage' }, 'stage');
      break;
    case 'stage':
      if (e.type === 'levelComplete') return go('home', { kind: 'write', level: 'home' }, 'home');
      if (e.type === 'levelFailed') return go('stage');
      break;
    case 'home':
      if (e.type === 'levelComplete') return go('end', { kind: 'write', level: 'done' }, 'done');
      break;
    case 'end':
      if (e.type === 'endFinished') return go('title');
      break;
  }
  if (e.type === 'quitToTitle') return go('title');
  return stay;
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/flow/game-flow.test.ts`
Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/flow tests/flow
git commit -m "feat: 关卡流程状态机（标题 → 开场 → 剧场 → 家 → 结尾）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 像素网格工具与人物精灵

**Files:**
- Create: `src/art/pixels.ts`, `src/art/sprites.ts`
- Test: `tests/art/sprites.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/art/sprites.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { gridProblems, mirrorGrid, withOutline } from '../../src/art/pixels';
import {
  CHENLING_FRAMES,
  CHENLING_PALETTE,
  FATHER_GRID,
  FATHER_PALETTE,
  MOTHER_GRID,
  MOTHER_PALETTE,
  chenlingGrid,
  frameFor,
} from '../../src/art/sprites';

describe('pixels', () => {
  it('gridProblems 找出宽度不一致与未定义颜色', () => {
    expect(gridProblems(['ab', 'a'], { a: '#000', b: '#fff' })).toHaveLength(1);
    expect(gridProblems(['az'], { a: '#000' })).toHaveLength(1);
    expect(gridProblems(['a.', '.a'], { a: '#000' })).toEqual([]);
  });

  it('withOutline 在实心像素四周的透明格画描边', () => {
    expect(withOutline(['...', '.a.', '...'], 'O')).toEqual(['.O.', 'OaO', '.O.']);
  });

  it('mirrorGrid 左右翻转', () => {
    expect(mirrorGrid(['ab.', 'c..'])).toEqual(['.ba', '..c']);
  });
});

describe('人物精灵', () => {
  for (const frame of CHENLING_FRAMES) {
    it(`陈伶 ${frame}：24×40、颜色都有定义`, () => {
      const g = chenlingGrid(frame);
      expect(g).toHaveLength(40);
      expect(gridProblems(g, CHENLING_PALETTE)).toEqual([]);
      expect(g[0]).toHaveLength(24);
    });
  }

  it('李秀春、陈坛：24×40、颜色都有定义', () => {
    for (const [grid, pal] of [[MOTHER_GRID, MOTHER_PALETTE], [FATHER_GRID, FATHER_PALETTE]] as const) {
      expect(grid).toHaveLength(40);
      expect(gridProblems(grid, pal)).toEqual([]);
      expect(grid[0]).toHaveLength(24);
    }
  });

  it('陈伶的鞋底在第 38 行（脚底对齐用）', () => {
    const g = chenlingGrid('idle0');
    expect(g[38]).toMatch(/L/);
    expect(g[39]).not.toMatch(/L/);
  });

  it('frameFor：走路 0.12 秒换一帧、站立 0.6 秒换一帧、落地下沉 1 像素', () => {
    expect(frameFor('walk', 0).frame).toBe('walk0');
    expect(frameFor('walk', 0.13).frame).toBe('walk1');
    expect(frameFor('walk', 0.49).frame).toBe('walk0');
    expect(frameFor('idle', 0.7).frame).toBe('idle1');
    expect(frameFor('land', 0)).toEqual({ frame: 'idle0', dy: 1 });
    expect(frameFor('jump', 0).frame).toBe('jump');
    expect(frameFor('fall', 0).frame).toBe('fall');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/art/sprites.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/art/pixels.ts`
```ts
/** 字符 → 颜色。'.' 永远是透明。 */
export type Palette = Readonly<Record<string, string>>;
export const TRANSPARENT = '.';

export function gridProblems(grid: readonly string[], palette: Palette): string[] {
  if (grid.length === 0) return ['空网格'];
  const problems: string[] = [];
  const w = grid[0].length;
  grid.forEach((row, y) => {
    if (row.length !== w) problems.push(`第 ${y} 行宽 ${row.length}，应为 ${w}`);
    for (const ch of row) {
      if (ch !== TRANSPARENT && !(ch in palette)) problems.push(`第 ${y} 行有未定义颜色 ${ch}`);
    }
  });
  return problems;
}

export function withOutline(grid: readonly string[], outlineChar: string): string[] {
  const h = grid.length;
  const w = grid[0].length;
  const filled = (x: number, y: number): boolean => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== TRANSPARENT;
  return grid.map((row, y) =>
    Array.from(row, (ch, x) => {
      if (ch !== TRANSPARENT) return ch;
      return filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? outlineChar : TRANSPARENT;
    }).join(''),
  );
}

export function mirrorGrid(grid: readonly string[]): string[] {
  return grid.map((row) => Array.from(row).reverse().join(''));
}

export function paintGrid(ctx: CanvasRenderingContext2D, grid: readonly string[], palette: Palette, ox: number, oy: number): void {
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === TRANSPARENT) continue;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

const cache = new Map<string, HTMLCanvasElement>();

/** 把网格画成一张小 canvas 并按 key 缓存。仅在浏览器里调用。 */
export function gridCanvas(key: string, grid: readonly string[], palette: Palette): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = grid[0].length;
  cv.height = grid.length;
  const ctx = cv.getContext('2d');
  if (ctx) paintGrid(ctx, grid, palette, 0, 0);
  cache.set(key, cv);
  return cv;
}
```

`src/art/sprites.ts`
```ts
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

/** 浏览器里取精灵 canvas（带缓存）。facing = -1 时用镜像网格。 */
export function chenlingCanvas(frame: ChenlingFrame, facing: 1 | -1): HTMLCanvasElement {
  const g = chenlingGrid(frame);
  return gridCanvas(`chenling:${frame}:${facing}`, facing === 1 ? g : mirrorGrid(g), CHENLING_PALETTE);
}

export function parentCanvas(who: 'lixiuchun' | 'chentan', facing: 1 | -1): HTMLCanvasElement {
  const [grid, pal] = who === 'lixiuchun' ? [MOTHER_GRID, MOTHER_PALETTE] : [FATHER_GRID, FATHER_PALETTE];
  return gridCanvas(`${who}:${facing}`, facing === 1 ? grid : mirrorGrid(grid), pal);
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/art/sprites.test.ts`
Expected: 14 passed。若某个网格报宽度问题，按报错的行号把那一行补齐到 24 个字符（只改那一行的 `.` 数量，不改造型），再跑。

- [ ] **Step 5: Commit**

```bash
git add src/art tests/art
git commit -m "feat: 像素网格工具 + 陈伶各帧与父母精灵

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: 头像与瓦片贴图

**Files:**
- Create: `src/art/painter.ts`, `src/art/portraits.ts`, `src/art/tiles.ts`
- Test: `tests/art/painter.test.ts`, `tests/art/tiles.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/art/painter.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { outlineColorGrid, tracePath, type PathSink } from '../../src/art/painter';

describe('tracePath', () => {
  it('把路径小语言翻译成 canvas 调用', () => {
    const calls: string[] = [];
    const sink: PathSink = {
      moveTo: (x, y) => calls.push(`M${x},${y}`),
      lineTo: (x, y) => calls.push(`L${x},${y}`),
      bezierCurveTo: (a, b, c, d, e, f) => calls.push(`B${a},${b},${c},${d},${e},${f}`),
      arc: (x, y, r) => calls.push(`A${x},${y},${r}`),
      rect: (x, y, w, h) => calls.push(`R${x},${y},${w},${h}`),
    };
    tracePath(sink, 'M1 2 L3 4 B5 6 7 8 9 10 A 76 55 4.5 R 51 38 10 6');
    expect(calls).toEqual(['M1,2', 'L3,4', 'B5,6,7,8,9,10', 'A76,55,4.5', 'R51,38,10,6']);
  });

  it('遇到不认识的命令直接报错（防止路径写错还静默画歪）', () => {
    const noop = () => undefined;
    const sink: PathSink = { moveTo: noop, lineTo: noop, bezierCurveTo: noop, arc: noop, rect: noop };
    expect(() => tracePath(sink, 'M1 2 Q3 4')).toThrow();
  });
});

describe('outlineColorGrid', () => {
  it('实心格四周的空格变成描边色', () => {
    const g = [
      [null, null, null],
      [null, '#f00', null],
      [null, null, null],
    ];
    expect(outlineColorGrid(g, '#000')).toEqual([
      [null, '#000', null],
      ['#000', '#f00', '#000'],
      [null, '#000', null],
    ]);
  });
});
```

`tests/art/tiles.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { TILE_KINDS, tileColors } from '../../src/art/tiles';

describe('tileColors', () => {
  for (const kind of TILE_KINDS) {
    it(`${kind}：16×16，每格都是 #rrggbb，生成结果固定`, () => {
      const a = tileColors(kind);
      expect(a).toHaveLength(16);
      for (const row of a) {
        expect(row).toHaveLength(16);
        for (const c of row) expect(c).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(tileColors(kind)).toEqual(a);
    });
  }
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/art/painter.test.ts tests/art/tiles.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/art/painter.ts`
```ts
/** tracePath 只需要 canvas 路径 API 的这几个方法，测试里可以换成记录器。 */
export type PathSink = Pick<CanvasRenderingContext2D, 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'rect'> & {
  arc(x: number, y: number, r: number, start: number, end: number): void;
};

/**
 * 路径小语言：M x y / L x y / B x1 y1 x2 y2 x y（三次贝塞尔）/ A cx cy r（整圆）/ R x y w h。
 * 用空格或逗号分隔。
 */
export function tracePath(c: PathSink, d: string): void {
  const tok = d.trim().split(/[\s,]+/);
  let i = 0;
  const n = (): number => {
    const v = Number(tok[i++]);
    if (Number.isNaN(v)) throw new Error(`路径里有非数字：${d}`);
    return v;
  };
  while (i < tok.length) {
    const cmd = tok[i++];
    switch (cmd) {
      case 'M':
        c.moveTo(n(), n());
        break;
      case 'L':
        c.lineTo(n(), n());
        break;
      case 'B':
        c.bezierCurveTo(n(), n(), n(), n(), n(), n());
        break;
      case 'A': {
        const x = n();
        const y = n();
        const r = n();
        c.arc(x, y, r, 0, Math.PI * 2);
        break;
      }
      case 'R':
        c.rect(n(), n(), n(), n());
        break;
      default:
        throw new Error(`不认识的路径命令 ${cmd}：${d}`);
    }
  }
}

export type ColorGrid = (string | null)[][];

export interface PixelPainter {
  fill(color: string, path: string): void;
  stroke(color: string, width: number, path: string): void;
  px(x: number, y: number, color: string): void;
}

/**
 * 按形状落格：每画一个形状就把 alpha ≥ 120 的格子涂成该色（不混色，像素干净）。
 * offset 用来从大画布上裁一块（头像从全身立绘的头部裁出）。仅在浏览器里调用。
 */
export function paintPixels(width: number, height: number, draw: (p: PixelPainter) => void, offset = { x: 0, y: 0 }): ColorGrid {
  const grid: ColorGrid = Array.from({ length: height }, () => Array<string | null>(width).fill(null));
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const c = cv.getContext('2d', { willReadFrequently: true });
  if (!c) return grid;
  const commit = (color: string): void => {
    const d = c.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (d[(y * width + x) * 4 + 3] >= 120) grid[y][x] = color;
      }
    }
    c.clearRect(0, 0, width, height);
  };
  const begin = (): void => {
    c.setTransform(1, 0, 0, 1, -offset.x, -offset.y);
    c.beginPath();
  };
  draw({
    fill(color, path) {
      begin();
      tracePath(c, path);
      c.closePath();
      c.fillStyle = '#000';
      c.fill();
      commit(color);
    },
    stroke(color, width, path) {
      begin();
      tracePath(c, path);
      c.strokeStyle = '#000';
      c.lineWidth = width;
      c.lineCap = 'round';
      c.stroke();
      commit(color);
    },
    px(x, y, color) {
      const gx = x - offset.x;
      const gy = y - offset.y;
      if (gy >= 0 && gy < height && gx >= 0 && gx < width) grid[gy][gx] = color;
    },
  });
  return grid;
}

export function outlineColorGrid(grid: ColorGrid, color: string): ColorGrid {
  const h = grid.length;
  const w = grid[0].length;
  const filled = (x: number, y: number): boolean => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== null;
  return grid.map((row, y) =>
    row.map((c, x) => (c !== null ? c : filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? color : null)),
  );
}

export function colorGridCanvas(grid: ColorGrid): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = grid[0].length;
  cv.height = grid.length;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  grid.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c === null) return;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return cv;
}
```

`src/art/portraits.ts`
```ts
import type { Speaker } from '../dialogue/dialogue';
import { colorGridCanvas, outlineColorGrid, paintPixels, type PixelPainter } from './painter';

const OUT = '#101014';

/** 陈伶：沿用定稿像素立绘（128×160）的形状，只裁头肩 48×48（x 32~79，y 0~47）。 */
function drawChenling(p: PixelPainter): void {
  const C = {
    hair: '#1b1b22',
    hairHi: '#3a3a4a',
    skin: '#f7e3d7',
    skinSh: '#e3bdae',
    red: '#c41e2a',
    blk: '#26262e',
    teal: '#3fb5b0',
    white: '#f4f1ec',
    pink: '#e88a9a',
    eye: '#d0202c',
  };
  p.fill(C.blk, 'M48 43 L64 43 L67 142 L46 142');
  p.fill(C.red, 'M52 42 B46 43 40 45 38 50 B36 80 34 110 32 142 L48 143 B48 110 48 80 49 46');
  p.fill(C.red, 'M60 42 B66 43 72 45 74 50 B78 80 86 110 100 142 L66 143 B65 110 64 80 63 46');
  p.stroke(C.teal, 2.4, 'M49 46 B48.5 80 48.5 110 48 142');
  p.stroke(C.teal, 2.4, 'M63 46 B64 80 65 110 66 142');
  p.fill(C.red, 'M70 46 B80 47 92 50 100 52 L104 72 B96 76 86 74 78 68 B74 62 72 56 70 52');
  p.fill(C.teal, 'A 76 55 4.5');
  p.fill(C.white, 'A 76 55 2.8');
  p.fill(C.pink, 'A 76 55 1.4');
  p.fill(C.red, 'A 61 51 2.6');
  p.fill(C.blk, 'R 51 38 10 6');
  p.stroke(C.white, 1, 'M51 44 L61 44');
  p.fill(C.skinSh, 'R 53 33 6 6');
  p.fill(C.skin, 'M45 20 B45 12 50 9 56 9 B62 9 67 12 67 20 B67 27 64 33 58 37 B56 38.5 54.5 38.5 53 36.5 B49 32 45 27 45 20');
  p.fill(
    C.hair,
    'M41 20 B41 9 49 3 57 3 B65 3 73 9 73 19 L77 30 L72 27 L73 36 L69 30 L68 38 L67 26 L66 19 L65 27 L62 18 L60 22 L58 16 L56 29 L54 17 L51 22 L49 16 L47 23 L46 31 L45 38 L43 30 L39 33 L41 26 L38 26',
  );
  p.fill(C.hair, 'M55 4 L59 -1 L58 4');
  p.fill(C.hair, 'M64 5 L69 1 L67 6');
  for (const d of ['M50 9 L52 14', 'M57 7 L58 12', 'M63 9 L64 13', 'M44 14 L45 19']) p.stroke(C.hairHi, 1, d);
  p.stroke(C.red, 1.6, 'M70 30 B72 34 73 38 72 44');
  const eye = (x0: number, dir: -1 | 1): void => {
    for (let x = x0 - 1; x <= x0 + 6; x++) p.px(x, 24, C.hair);
    p.px(dir < 0 ? x0 - 2 : x0 + 7, 25, C.hair);
    const ox = dir < 0 ? x0 : x0 + 5;
    const ix = dir < 0 ? x0 + 5 : x0;
    p.px(ox, 26, '#ffffff');
    p.px(ox, 27, '#ffffff');
    p.px(ix, 26, '#f3ece6');
    for (let x = x0 - 1; x <= x0 + 6; x++) {
      if (dir < 0 ? x < x0 + 2 : x > x0 + 3) p.px(x, 23, C.hair);
    }
    for (let x = x0 + 1; x <= x0 + 4; x++) {
      p.px(x, 25, '#5a0a12');
      p.px(x, 26, C.eye);
      p.px(x, 27, '#ec4a55');
      p.px(x, 28, C.skinSh);
    }
    p.px(x0 + 2, 26, '#ffffff');
    p.px(x0 + 3, 25, '#2a0508');
  };
  eye(48, -1);
  eye(59, 1);
  p.px(57, 30, C.skinSh);
  for (const [x, y] of [[55, 33], [56, 33], [57, 32], [58, 32]]) p.px(x, y, '#a04848');
  for (const [x, y] of [[47, 30], [48, 30], [64, 30], [65, 30]]) p.px(x, y, '#f2b4b4');
}

/** 李秀春：齐肩深棕发、眉头往上皱、眼眶泛红。 */
function drawMother(p: PixelPainter): void {
  p.fill('#3b2a22', 'M10 24 B9 8 18 3 24 3 B31 3 39 8 38 24 L40 42 L32 40 L32 26 L16 26 L16 40 L8 42');
  p.fill('#c9b79c', 'M4 48 B7 40 15 37 24 37 B33 37 41 40 44 48');
  p.fill('#e3bdae', 'R 20 30 8 9');
  p.fill('#f7e3d7', 'M14 20 B14 10 19 7 24 7 B29 7 34 10 34 20 B34 28 29 35 24 36 B19 35 14 28 14 20');
  p.fill('#3b2a22', 'M13 21 B12 9 18 5 24 5 B30 5 36 9 35 21 L33 14 B28 12 20 12 15 15');
  const dark = '#2a1a14';
  for (const [x, y] of [[17, 17], [18, 16], [19, 16], [20, 16], [31, 17], [30, 16], [29, 16], [28, 16]]) p.px(x, y, dark);
  for (const x of [18, 19, 20, 28, 29, 30]) p.px(x, 19, dark);
  for (const [x, c] of [[18, dark], [19, '#ffffff'], [20, dark], [28, dark], [29, '#ffffff'], [30, dark]] as const) p.px(x, 20, c);
  for (const x of [17, 18, 19, 20, 21, 27, 28, 29, 30, 31]) p.px(x, 21, '#e08080');
  for (const [x, y] of [[24, 25], [24, 26]]) p.px(x, y, '#e3bdae');
  for (const [x, y] of [[22, 30], [23, 29], [24, 29], [25, 29], [26, 30]]) p.px(x, y, '#a04848');
}

/** 陈坛：短黑发、方下巴、胡茬、眼袋、灰外套。 */
function drawFather(p: PixelPainter): void {
  p.fill('#5b5f66', 'M3 48 B6 39 14 36 24 36 B34 36 42 39 45 48');
  p.fill('#d8d4cc', 'M19 37 L24 44 L29 37');
  p.fill('#e3bdae', 'R 20 30 8 8');
  p.fill('#f7e3d7', 'M14 18 B14 9 19 6 24 6 B29 6 34 9 34 18 L34 26 B33 32 29 35 24 35 B19 35 15 32 14 26');
  p.fill('#1b1b22', 'M13 18 B12 7 18 3 24 3 B30 3 36 7 35 18 L33 12 B28 10 20 10 15 12');
  const dark = '#2a1a14';
  for (const x of [17, 18, 19, 20, 21, 27, 28, 29, 30, 31]) p.px(x, 16, '#1b1b22');
  for (const x of [18, 19, 20, 21, 27, 28, 29, 30]) p.px(x, 18, dark);
  for (const x of [19, 20, 28, 29]) p.px(x, 19, dark);
  for (const x of [18, 19, 20, 21, 27, 28, 29, 30]) p.px(x, 21, '#d8b0a0');
  for (const [x, y] of [[24, 24], [24, 25], [23, 26]]) p.px(x, y, '#e3bdae');
  for (let x = 21; x <= 27; x++) p.px(x, 29, '#8a4a4a');
  for (const [x, y] of [[18, 30], [20, 32], [22, 31], [26, 31], [28, 32], [30, 30], [24, 33], [19, 28], [29, 28]]) p.px(x, y, '#8a7e74');
}

const cache = new Map<Speaker, HTMLCanvasElement>();

export function portraitCanvas(speaker: Speaker): HTMLCanvasElement {
  const hit = cache.get(speaker);
  if (hit) return hit;
  const grid =
    speaker === 'chenling'
      ? paintPixels(48, 48, drawChenling, { x: 32, y: 0 })
      : paintPixels(48, 48, speaker === 'lixiuchun' ? drawMother : drawFather);
  const cv = colorGridCanvas(outlineColorGrid(grid, OUT));
  cache.set(speaker, cv);
  return cv;
}
```

`src/art/tiles.ts`
```ts
export const TILE_KINDS = ['stageFloor', 'stageWall', 'crate', 'homeFloor', 'homeWall', 'cobble'] as const;
export type TileKind = (typeof TILE_KINDS)[number];

const SEED: Record<TileKind, number> = { stageFloor: 11, stageWall: 23, crate: 37, homeFloor: 41, homeWall: 53, cobble: 67 };

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pick(kind: TileKind, x: number, y: number, r: () => number): string {
  const v = r();
  switch (kind) {
    case 'stageFloor': {
      if (y % 4 === 3) return '#2a1c12';
      const off = (Math.floor(y / 4) * 5) % 16;
      if ((x + off) % 16 === 0) return '#33231a';
      if ((x === 3 || x === 12) && y % 4 === 1) return '#1f150e';
      return v < 0.2 ? '#4a3220' : v > 0.92 ? '#6b4a2f' : '#5a3d26';
    }
    case 'homeFloor': {
      if (y % 4 === 3) return '#5a3d26';
      const off = (Math.floor(y / 4) * 7) % 16;
      if ((x + off) % 16 === 0) return '#6b4a2f';
      return v < 0.2 ? '#7a5838' : v > 0.92 ? '#9c7650' : '#8a6644';
    }
    case 'stageWall': {
      const off = Math.floor(y / 4) % 2 ? 4 : 0;
      if (y % 4 === 3 || (x + off) % 8 === 7) return '#1f1f25';
      return v < 0.2 ? '#34343c' : v > 0.88 ? '#4a4a54' : '#3d3d46';
    }
    case 'crate': {
      if (x === 0 || x === 15 || y === 0 || y === 15) return '#2a1c12';
      if (x === y || x === 15 - y) return '#4a3220';
      return v < 0.2 ? '#6b4a2f' : '#7d5a3a';
    }
    case 'homeWall':
      return x % 8 === 0 ? '#3e3f48' : v < 0.1 ? '#4a4b55' : '#45464f';
    case 'cobble': {
      const ox = Math.floor(y / 5) % 2 ? 4 : 0;
      if (y % 5 === 4 || (x + ox) % 8 === 7) return '#1a1c22';
      return v < 0.2 ? '#3a3d46' : v > 0.9 ? '#545866' : '#464a55';
    }
  }
}

/** 纯函数：16×16 颜色表，同一种瓦片每次结果相同。 */
export function tileColors(kind: TileKind): string[][] {
  const r = rng(SEED[kind]);
  const g: string[][] = [];
  for (let y = 0; y < 16; y++) {
    const row: string[] = [];
    for (let x = 0; x < 16; x++) row.push(pick(kind, x, y, r));
    g.push(row);
  }
  return g;
}

const cache = new Map<TileKind, HTMLCanvasElement>();

export function tileCanvas(kind: TileKind): HTMLCanvasElement {
  const hit = cache.get(kind);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 16;
  const ctx = cv.getContext('2d');
  if (ctx) {
    tileColors(kind).forEach((row, y) =>
      row.forEach((c, x) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }),
    );
  }
  cache.set(kind, cv);
  return cv;
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/art && npm run typecheck`
Expected: tests/art 全部通过（painter 3 + tiles 6 + sprites 14 = 23 passed）；typecheck 无输出

- [ ] **Step 5: Commit**

```bash
git add src/art tests/art
git commit -m "feat: 路径小语言、三张头像、六种瓦片贴图

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: 剧场关逻辑

**Files:**
- Create: `src/scenes/stage-session.ts`
- Test: `tests/scenes/stage-session.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/scenes/stage-session.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import {
  FAIL_DONE_AT,
  FOOTSTEP_INTERVAL,
  PASS_DONE_AT,
  STAGE_INTRO,
  createStageSession,
  stepStage,
  type StageSession,
} from '../../src/scenes/stage-session';
import type { FrameInput } from '../../src/input/frame-input';

const DT = 1 / 60;
const none: FrameInput = { dir: 0, jumpPressed: false, jumpHeld: false, interactPressed: false, advancePressed: false };
const tap: FrameInput = { ...none, advancePressed: true };

const skipIntro = (s0: StageSession): StageSession => {
  let s = s0;
  for (let i = 0; i < STAGE_INTRO.length * 2; i++) s = stepStage(s, tap, DT).session;
  return s;
};

const walkTo = (s0: StageSession, footX: number): StageSession => {
  let s = s0;
  for (let i = 0; i < 2000; i++) {
    const fx = s.actor.body.x + s.actor.body.w / 2;
    if (Math.abs(fx - footX) < 2) break;
    s = stepStage(s, { ...none, dir: fx < footX ? 1 : -1 }, DT).session;
  }
  return s;
};

describe('stage session', () => {
  it('开局是引导想法，期间角色不动、期待值不变', () => {
    const s0 = createStageSession();
    expect(s0.phase).toBe('intro');
    expect(s0.talk.current?.line.text).toBe('这是……哪里？');
    const s1 = stepStage(s0, { ...none, dir: 1 }, 1).session;
    expect(s1.actor.body.x).toBe(s0.actor.body.x);
    expect(s1.expect.value).toBe(29);
  });

  it('点完引导进入 play', () => {
    expect(skipIntro(createStageSession()).phase).toBe('play');
  });

  it('在地上走动按间隔发出嘎吱声', () => {
    let s = skipIntro(createStageSession());
    let creaks = 0;
    for (let i = 0; i < 60; i++) {
      const out = stepStage(s, { ...none, dir: 1 }, DT);
      creaks += out.sounds.filter((x) => x === 'creak').length;
      s = out.session;
    }
    expect(creaks).toBe(Math.floor(1 / FOOTSTEP_INTERVAL));
  });

  it('首次调查：+6% 飘字、打开想法；再次调查不加分', () => {
    let s = walkTo(skipIntro(createStageSession()), 30 * 16 + 8);
    expect(s.nearby?.id).toBe('trapdoor');
    const before = s.expect.value;
    const out = stepStage(s, { ...none, interactPressed: true }, DT);
    expect(out.popups.map((p) => p.text)).toEqual(['+6%']);
    expect(out.session.expect.value).toBeGreaterThan(before + 5.9);
    expect(out.session.talk.current?.line.text).toBe('地板上有块活板。');
    s = out.session;
    for (let i = 0; i < 4; i++) s = stepStage(s, tap, DT).session;
    expect(s.talk.current).toBeNull();
    const again = stepStage(s, { ...none, interactPressed: true }, DT);
    expect(again.popups).toEqual([]);
  });

  it('读想法期间期待值暂停', () => {
    let s = walkTo(skipIntro(createStageSession()), 30 * 16 + 8);
    s = stepStage(s, { ...none, interactPressed: true }, DT).session;
    const v = s.expect.value;
    for (let i = 0; i < 600; i++) s = stepStage(s, none, DT).session;
    expect(s.expect.value).toBe(v);
  });

  it('期待值低于 20% 时 heartbeat 为真；撑满 5 秒进入 failing，再过一会儿 outcome = failed', () => {
    let s = skipIntro(createStageSession());
    s = { ...s, expect: { ...s.expect, value: 19.5 } };
    let out = stepStage(s, none, DT);
    expect(out.heartbeat).toBe(true);
    s = out.session;
    let sawRumble = false;
    for (let i = 0; i < 60 * 6 && s.phase === 'play'; i++) {
      out = stepStage(s, none, DT);
      sawRumble = sawRumble || out.sounds.includes('rumble');
      s = out.session;
    }
    expect(s.phase).toBe('failing');
    expect(sawRumble).toBe(true);
    for (let i = 0; i < Math.ceil(FAIL_DONE_AT / DT) + 1; i++) s = stepStage(s, none, DT).session;
    expect(s.outcome).toBe('failed');
  });

  it('达到 60%：铃声 → 碎裂声 → outcome = passed', () => {
    let s = walkTo(skipIntro(createStageSession()), 30 * 16 + 8);
    s = { ...s, expect: { ...s.expect, value: 58 } };
    const out = stepStage(s, { ...none, interactPressed: true }, DT);
    expect(out.sounds).toContain('bell');
    expect(out.session.phase).toBe('passing');
    s = out.session;
    let shatters = 0;
    for (let i = 0; i < Math.ceil(PASS_DONE_AT / DT) + 1; i++) {
      const o = stepStage(s, none, DT);
      shatters += o.sounds.filter((x) => x === 'shatter').length;
      s = o.session;
    }
    expect(shatters).toBe(1);
    expect(s.outcome).toBe('passed');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/scenes/stage-session.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/scenes/stage-session.ts`
```ts
import { createActor, stepActor, type Actor } from '../actor/controller';
import { createExpectation, formatGain, tickExpectation, type ExpectState } from '../expectation/expectation';
import { startTalk, stepTalk, think, type Line, type Talk } from '../dialogue/dialogue';
import { findNearby, markFound } from '../level/interactables';
import { isSolidIn, spawnFoot, type InteractableDef } from '../level/level';
import { STAGE } from '../level/stage';
import type { FrameInput } from '../input/frame-input';
import type { SoundId } from '../audio/sound-ids';

export const FOOTSTEP_INTERVAL = 0.32;
export const PASS_SHATTER_AT = 0.8;
export const PASS_DONE_AT = 2.2;
export const FAIL_DONE_AT = 2.0;

export const STAGE_INTRO: readonly Line[] = [think('这是……哪里？'), think('得找到出口。')];

export type StagePhase = 'intro' | 'play' | 'passing' | 'failing' | 'done';

export interface Popup {
  worldX: number;
  worldY: number;
  text: string;
}

export interface StageSession {
  phase: StagePhase;
  phaseTime: number;
  time: number;
  actor: Actor;
  expect: ExpectState;
  found: ReadonlySet<string>;
  talk: Talk;
  nearby: InteractableDef | null;
  footstep: number;
  outcome: 'none' | 'passed' | 'failed';
}

export interface StageOutput {
  session: StageSession;
  sounds: SoundId[];
  popups: Popup[];
  heartbeat: boolean;
}

const solid = isSolidIn(STAGE);

export function createStageSession(): StageSession {
  const f = spawnFoot(STAGE);
  return {
    phase: 'intro',
    phaseTime: 0,
    time: 0,
    actor: createActor(f.x, f.y),
    expect: createExpectation(),
    found: new Set(),
    talk: startTalk(STAGE_INTRO),
    nearby: null,
    footstep: 0,
    outcome: 'none',
  };
}

export function stepStage(s: StageSession, input: FrameInput, dt: number): StageOutput {
  const sounds: SoundId[] = [];
  const popups: Popup[] = [];
  if (s.phase === 'done') return { session: s, sounds, popups, heartbeat: false };
  const time = s.time + dt;

  if (s.phase === 'passing' || s.phase === 'failing') {
    const phaseTime = s.phaseTime + dt;
    if (s.phase === 'passing' && s.phaseTime < PASS_SHATTER_AT && phaseTime >= PASS_SHATTER_AT) sounds.push('shatter');
    const doneAt = s.phase === 'passing' ? PASS_DONE_AT : FAIL_DONE_AT;
    if (phaseTime >= doneAt) {
      const outcome = s.phase === 'passing' ? 'passed' : 'failed';
      return { session: { ...s, time, phaseTime, phase: 'done', outcome }, sounds, popups, heartbeat: false };
    }
    return { session: { ...s, time, phaseTime }, sounds, popups, heartbeat: false };
  }

  if (s.talk.current) {
    const talk = stepTalk(s.talk, dt, input.advancePressed || input.interactPressed);
    const phase: StagePhase = s.phase === 'intro' && !talk.current ? 'play' : s.phase;
    return { session: { ...s, time, talk, phase }, sounds, popups, heartbeat: s.expect.status === 'danger' };
  }

  const r = stepActor(s.actor, { dir: input.dir, jumpPressed: input.jumpPressed, jumpHeld: input.jumpHeld }, dt, solid);

  let footstep = s.footstep;
  if (r.moving && r.actor.body.onGround) {
    footstep += dt;
    if (footstep >= FOOTSTEP_INTERVAL) {
      sounds.push('creak');
      footstep -= FOOTSTEP_INTERVAL;
    }
  } else {
    footstep = 0;
  }

  const nearby = findNearby(STAGE, r.actor.body);
  let found = s.found;
  let talk = s.talk;
  let newHotspots = 0;
  if (input.interactPressed && nearby) {
    const m = markFound(found, nearby.id);
    found = m.found;
    if (m.firstTime && nearby.scoring) newHotspots = 1;
    talk = startTalk(nearby.lines.map((text) => think(text)));
    sounds.push('blip');
  }

  const t = tickExpectation(s.expect, { moving: r.moving, jumped: r.jumped, onGround: r.actor.body.onGround, newHotspots }, dt);
  const headX = r.actor.body.x + r.actor.body.w / 2;
  const headY = r.actor.body.y - 4;
  for (const g of t.gains) {
    popups.push({ worldX: headX, worldY: headY, text: `+${formatGain(g)}%` });
    sounds.push('pop');
  }

  let phase: StagePhase = 'play';
  if (t.state.status === 'passed') {
    phase = 'passing';
    sounds.push('bell');
  } else if (t.state.status === 'failed') {
    phase = 'failing';
    sounds.push('rumble');
  }

  return {
    session: { ...s, time, phase, phaseTime: 0, actor: r.actor, expect: t.state, found, talk, nearby, footstep },
    sounds,
    popups,
    heartbeat: t.state.status === 'danger',
  };
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/scenes/stage-session.test.ts`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/scenes tests/scenes
git commit -m "feat: 剧场关逻辑（引导、调查、期待值、过关与失败演出时序）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: 醒来关逻辑

**Files:**
- Create: `src/scenes/home-session.ts`
- Test: `tests/scenes/home-session.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/scenes/home-session.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import {
  EYES_TIME,
  FINALE_DONE_AT,
  FLICKER_TIME,
  WAKE_DELAY,
  createHomeSession,
  stepHome,
  type HomeSession,
} from '../../src/scenes/home-session';
import type { FrameInput } from '../../src/input/frame-input';

const DT = 1 / 60;
const none: FrameInput = { dir: 0, jumpPressed: false, jumpHeld: false, interactPressed: false, advancePressed: false };
const tap: FrameInput = { ...none, advancePressed: true };

const wakeUp = (): HomeSession => {
  let s = createHomeSession();
  for (let i = 0; i < Math.ceil(WAKE_DELAY / DT) + 1; i++) s = stepHome(s, none, DT).session;
  s = stepHome(s, tap, DT).session;
  s = stepHome(s, tap, DT).session;
  return s;
};

const walkTo = (s0: HomeSession, footX: number): { s: HomeSession; sounds: string[] } => {
  let s = s0;
  const sounds: string[] = [];
  for (let i = 0; i < 4000; i++) {
    const fx = s.actor.body.x + s.actor.body.w / 2;
    if (Math.abs(fx - footX) < 2) break;
    const out = stepHome(s, { ...none, dir: fx < footX ? 1 : -1 }, DT);
    sounds.push(...out.sounds);
    s = out.session;
  }
  return { s, sounds };
};

describe('home session', () => {
  it('开局坐在床上，过一会儿弹出「……是梦？」，点掉后可以走', () => {
    let s = createHomeSession();
    expect(s.phase).toBe('wake');
    expect(s.sitting).toBe(true);
    for (let i = 0; i < Math.ceil(WAKE_DELAY / DT) + 1; i++) s = stepHome(s, none, DT).session;
    expect(s.talk.current?.line.text).toBe('……是梦？');
    s = stepHome(s, tap, DT).session;
    s = stepHome(s, tap, DT).session;
    expect(s.phase).toBe('play');
    expect(s.sitting).toBe(false);
  });

  it('走过客厅中间：墙上的红眼睛出现 0.5 秒，只触发一次', () => {
    const { s, sounds } = walkTo(wakeUp(), 45 * 16);
    expect(s.fired.has('eyes')).toBe(true);
    expect(sounds.filter((x) => x === 'rumble')).toHaveLength(1);
    expect(s.eyes).toBeGreaterThan(0);
    expect(s.eyes).toBeLessThanOrEqual(EYES_TIME);
    const back = walkTo(s, 40 * 16);
    const again = walkTo(back.s, 46 * 16);
    expect(again.sounds.filter((x) => x === 'rumble')).toHaveLength(0);
  });

  it('走进厨房门口：期待值屏闪一下', () => {
    const { s } = walkTo(wakeUp(), 62 * 16);
    expect(s.fired.has('flicker')).toBe(true);
    expect(s.flicker).toBeLessThanOrEqual(FLICKER_TIME);
  });

  it('调查普通物件只弹想法', () => {
    let { s } = walkTo(wakeUp(), 36 * 16 + 8);
    s = stepHome(s, { ...none, interactPressed: true }, DT).session;
    expect(s.talk.current?.line.text).toBe('饮水机空了。');
    for (let i = 0; i < 4; i++) s = stepHome(s, tap, DT).session;
    expect(s.phase).toBe('play');
  });

  it('调查厨房水桶：想法说完进入 finale，之后 outcome = complete', () => {
    let { s } = walkTo(wakeUp(), 77 * 16 + 8);
    s = stepHome(s, { ...none, interactPressed: true }, DT).session;
    for (let i = 0; i < 4; i++) s = stepHome(s, tap, DT).session;
    expect(s.phase).toBe('finale');
    for (let i = 0; i < Math.ceil(FINALE_DONE_AT / DT) + 1; i++) s = stepHome(s, none, DT).session;
    expect(s.outcome).toBe('complete');
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/scenes/home-session.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/scenes/home-session.ts`
```ts
import { createActor, footX, stepActor, type Actor } from '../actor/controller';
import { startTalk, stepTalk, think, type Talk } from '../dialogue/dialogue';
import { crossedTriggers, findNearby } from '../level/interactables';
import { isSolidIn, spawnFoot, type InteractableDef } from '../level/level';
import { HOME } from '../level/home';
import type { FrameInput } from '../input/frame-input';
import type { SoundId } from '../audio/sound-ids';

export const WAKE_DELAY = 1.0;
export const EYES_TIME = 0.5;
export const FLICKER_TIME = 0.6;
export const FINALE_FADE_AT = 1.5;
export const FINALE_DONE_AT = 3.0;

export type HomePhase = 'wake' | 'play' | 'finale' | 'done';

export interface HomeSession {
  phase: HomePhase;
  phaseTime: number;
  time: number;
  actor: Actor;
  sitting: boolean;
  talk: Talk;
  nearby: InteractableDef | null;
  fired: ReadonlySet<string>;
  eyes: number;
  flicker: number;
  finalePending: boolean;
  outcome: 'none' | 'complete';
}

export interface HomeOutput {
  session: HomeSession;
  sounds: SoundId[];
}

const solid = isSolidIn(HOME);

export function createHomeSession(): HomeSession {
  const f = spawnFoot(HOME);
  return {
    phase: 'wake',
    phaseTime: 0,
    time: 0,
    actor: createActor(f.x, f.y),
    sitting: true,
    talk: startTalk([]),
    nearby: null,
    fired: new Set(),
    eyes: 0,
    flicker: 0,
    finalePending: false,
    outcome: 'none',
  };
}

export function stepHome(s0: HomeSession, input: FrameInput, dt: number): HomeOutput {
  const sounds: SoundId[] = [];
  const s: HomeSession = {
    ...s0,
    time: s0.time + dt,
    eyes: Math.max(0, s0.eyes - dt),
    flicker: Math.max(0, s0.flicker - dt),
  };
  const advance = input.advancePressed || input.interactPressed;

  switch (s.phase) {
    case 'done':
      return { session: s0, sounds };

    case 'wake': {
      const phaseTime = s.phaseTime + dt;
      if (s.talk.current) {
        const talk = stepTalk(s.talk, dt, advance);
        if (!talk.current) return { session: { ...s, phaseTime, talk, phase: 'play', sitting: false }, sounds };
        return { session: { ...s, phaseTime, talk }, sounds };
      }
      if (s.phaseTime < WAKE_DELAY && phaseTime >= WAKE_DELAY) {
        return { session: { ...s, phaseTime, talk: startTalk([think('……是梦？')]) }, sounds };
      }
      return { session: { ...s, phaseTime }, sounds };
    }

    case 'finale': {
      const phaseTime = s.phaseTime + dt;
      if (phaseTime >= FINALE_DONE_AT) return { session: { ...s, phaseTime, phase: 'done', outcome: 'complete' }, sounds };
      return { session: { ...s, phaseTime }, sounds };
    }

    case 'play': {
      if (s.talk.current) {
        const talk = stepTalk(s.talk, dt, advance);
        if (!talk.current && s.finalePending) {
          sounds.push('rumble');
          return { session: { ...s, talk, phase: 'finale', phaseTime: 0, finalePending: false }, sounds };
        }
        return { session: { ...s, talk }, sounds };
      }

      const prevX = footX(s.actor);
      const r = stepActor(s.actor, { dir: input.dir, jumpPressed: input.jumpPressed, jumpHeld: input.jumpHeld }, dt, solid);
      let { fired, eyes, flicker } = s;
      const hits = crossedTriggers(HOME.triggers, fired, prevX, footX(r.actor));
      if (hits.length > 0) {
        const next = new Set(fired);
        for (const h of hits) {
          next.add(h.id);
          if (h.effect === 'eyesWall') {
            eyes = EYES_TIME;
            sounds.push('rumble');
          } else {
            flicker = FLICKER_TIME;
            sounds.push('blip');
          }
        }
        fired = next;
      }

      const nearby = findNearby(HOME, r.actor.body);
      let talk = s.talk;
      let finalePending = s.finalePending;
      if (input.interactPressed && nearby) {
        talk = startTalk(nearby.lines.map((text) => think(text)));
        if (nearby.finale) finalePending = true;
        sounds.push('blip');
      }

      return { session: { ...s, actor: r.actor, fired, eyes, flicker, nearby, talk, finalePending }, sounds };
    }
  }
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/scenes/home-session.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/scenes tests/scenes
git commit -m "feat: 醒来关逻辑（起床、幻觉触发、调查、厨房结尾）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: 开场动画剧本

**Files:**
- Create: `src/scenes/opening-script.ts`
- Test: `tests/scenes/opening-script.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/scenes/opening-script.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { OPENING } from '../../src/scenes/opening-script';
import { createRunner, skipRunner, tickRunner } from '../../src/cutscene/runner';

describe('opening script', () => {
  it('台词与 spec §4.1 一字不差、顺序一致', () => {
    const lines = OPENING.flatMap((s) => (s.kind === 'say' ? [[s.line.speaker, s.line.text]] : []));
    expect(lines).toEqual([
      ['lixiuchun', '阿伶……你、你是怎么回来的？'],
      ['chenling', '好渴……家里有水吗？'],
      ['chenling', '我先去睡了，爸妈你们也早点睡。'],
      ['chentan', '他是阿伶……那我们昨晚杀的，又是谁？'],
    ]);
  });

  it('以黑屏雨声开场', () => {
    expect(OPENING[0]).toEqual({ kind: 'rain', on: true });
    const firstVisual = OPENING.findIndex((s) => s.kind === 'cut');
    expect(OPENING.slice(0, firstVisual).some((s) => s.kind === 'wait')).toBe(true);
  });

  it('完整演完：最后是黑屏，雨停', () => {
    let r = createRunner(OPENING);
    for (let i = 0; i < 20000 && !r.finished; i++) r = tickRunner(r, 0.05, true).runner;
    expect(r.finished).toBe(true);
    expect(r.world.fade).toBe(1);
    expect(r.world.rain).toBe(false);
  });

  it('任何时候跳过，终态都是黑屏、雨停', () => {
    let r = createRunner(OPENING);
    for (let i = 0; i < 100; i++) r = tickRunner(r, 0.1, false).runner;
    const skipped = skipRunner(r);
    expect(skipped.world.fade).toBe(1);
    expect(skipped.world.rain).toBe(false);
  });

  it('碎桶口一刻同时有碎裂声与画面震动（不出现血）', () => {
    const i = OPENING.findIndex((s) => s.kind === 'prop' && s.prop === 'bucket' && s.state === 'broken');
    expect(i).toBeGreaterThan(0);
    const around = OPENING.slice(i - 2, i + 3);
    expect(around.some((s) => s.kind === 'sfx' && s.sound === 'crack')).toBe(true);
    expect(around.some((s) => s.kind === 'shake')).toBe(true);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/scenes/opening-script.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/scenes/opening-script.ts`
```ts
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
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/scenes/opening-script.test.ts`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/scenes tests/scenes
git commit -m "feat: 开场动画「雨夜归来」剧本

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: 视口与相机

**Files:**
- Create: `src/render/viewport.ts`, `src/render/camera.ts`
- Test: `tests/render/viewport.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/render/viewport.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { VIEW_H, VIEW_W, fitViewport } from '../../src/render/viewport';
import { clampCamera, followCamera } from '../../src/render/camera';

describe('fitViewport', () => {
  it('iPhone 横屏 812×375 @3x：放大 4 倍，居中', () => {
    const v = fitViewport(812, 375, 3);
    expect(v.scale).toBe(4);
    expect(v.cssW).toBeCloseTo((VIEW_W * 4) / 3, 6);
    expect(v.cssH).toBeCloseTo((VIEW_H * 4) / 3, 6);
    expect(v.left).toBeCloseTo((812 - v.cssW) / 2, 6);
    expect(v.top).toBeCloseTo((375 - v.cssH) / 2, 6);
  });

  it('电脑 1280×720 @2x：放大 5 倍', () => {
    expect(fitViewport(1280, 720, 2).scale).toBe(5);
  });

  it('再小也至少 1 倍', () => {
    expect(fitViewport(100, 100, 1).scale).toBe(1);
  });
});

describe('camera', () => {
  it('clampCamera 不让镜头越过地图两端', () => {
    expect(clampCamera(-50, 960)).toBe(0);
    expect(clampCamera(900, 960)).toBe(960 - VIEW_W);
    expect(clampCamera(100, 960)).toBe(100);
  });

  it('地图比画面窄时镜头固定在 0', () => {
    expect(clampCamera(100, 300)).toBe(0);
  });

  it('followCamera 平滑靠近「角色居中」的位置', () => {
    const next = followCamera(0, 600, 960, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(600 - VIEW_W / 2);
    let cam = 0;
    for (let i = 0; i < 600; i++) cam = followCamera(cam, 600, 960, 1 / 60);
    expect(cam).toBeCloseTo(600 - VIEW_W / 2, 1);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/render/viewport.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/render/viewport.ts`
```ts
export const VIEW_W = 480;
export const VIEW_H = 270;

export interface Viewport {
  /** 一个游戏像素 = 多少个设备像素（整数） */
  scale: number;
  cssW: number;
  cssH: number;
  left: number;
  top: number;
}

/** 按设备像素取整数倍放大，像素边缘才干净；剩下的边留黑。 */
export function fitViewport(cssW: number, cssH: number, dpr: number): Viewport {
  const scale = Math.max(1, Math.floor(Math.min((cssW * dpr) / VIEW_W, (cssH * dpr) / VIEW_H)));
  const w = (VIEW_W * scale) / dpr;
  const h = (VIEW_H * scale) / dpr;
  return { scale, cssW: w, cssH: h, left: (cssW - w) / 2, top: (cssH - h) / 2 };
}
```

`src/render/camera.ts`
```ts
import { VIEW_W } from './viewport';

export function clampCamera(x: number, levelWidthPx: number): number {
  return Math.max(0, Math.min(Math.max(0, levelWidthPx - VIEW_W), x));
}

export function followCamera(camX: number, targetX: number, levelWidthPx: number, dt: number): number {
  const desired = clampCamera(targetX - VIEW_W / 2, levelWidthPx);
  const k = 1 - Math.exp(-6 * dt);
  return clampCamera(camX + (desired - camX) * k, levelWidthPx);
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `npx vitest run tests/render/viewport.test.ts`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/render tests/render
git commit -m "feat: 视口整数倍缩放与相机跟随

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: 场景绘制

渲染层没有单测（jsdom 没有 Canvas）；本任务以 `npm run typecheck` 把关，画面在 Task 23 目视验收。

**Files:**
- Create: `src/render/present.ts`, `src/render/common.ts`, `src/render/street-scene.ts`, `src/render/stage-scene.ts`, `src/render/home-scene.ts`, `src/render/opening-scene.ts`

- [ ] **Step 1: 写 present.ts 与 common.ts**

`src/render/present.ts`
```ts
import { VIEW_H, VIEW_W, type Viewport } from './viewport';

export function sizeScreen(screen: HTMLCanvasElement, v: Viewport): void {
  screen.width = VIEW_W * v.scale;
  screen.height = VIEW_H * v.scale;
  screen.style.width = `${v.cssW}px`;
  screen.style.height = `${v.cssH}px`;
  screen.style.left = `${v.left}px`;
  screen.style.top = `${v.top}px`;
}

export function present(screenCtx: CanvasRenderingContext2D, view: HTMLCanvasElement, v: Viewport): void {
  screenCtx.imageSmoothingEnabled = false;
  screenCtx.drawImage(view, 0, 0, VIEW_W * v.scale, VIEW_H * v.scale);
}
```

`src/render/common.ts`
```ts
import { TILE } from '../physics/platformer';
import type { LevelDef } from '../level/level';
import { tileCanvas, type TileKind } from '../art/tiles';
import { chenlingCanvas, parentCanvas, type ChenlingFrame } from '../art/sprites';
import { VIEW_H, VIEW_W } from './viewport';

export const FLOOR_Y = 14 * TILE;

/** 0~1 的伪随机，同一输入永远同一输出（眨眼、雨丝、裂纹都用它，画面不闪烁乱跳）。 */
export function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function drawTiles(ctx: CanvasRenderingContext2D, level: LevelDef, kinds: Readonly<Record<string, TileKind>>, camX: number): void {
  const cx = Math.round(camX);
  const x0 = Math.max(0, Math.floor(cx / TILE));
  const x1 = Math.min(level.width - 1, Math.floor((cx + VIEW_W) / TILE));
  for (let ty = 0; ty < level.height; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const kind = kinds[level.rows[ty][tx]];
      if (kind) ctx.drawImage(tileCanvas(kind), tx * TILE - cx, ty * TILE);
    }
  }
}

export function drawRain(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.fillStyle = 'rgba(170,180,210,0.35)';
  for (let i = 0; i < 90; i++) {
    const x = Math.floor((i * 97 + time * 60 + hash(i) * 400) % (VIEW_W + 40)) - 20;
    const y = Math.floor((i * 61 + time * 320 + hash(i + 99) * 300) % (VIEW_H + 20)) - 10;
    for (let k = 0; k < 6; k++) ctx.fillRect(x - Math.floor(k / 3), y + k, 1, 1);
  }
}

/** 黄色像素「!」，(x, y) 是它底部中点（屏幕坐标）。 */
export function drawBang(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bob = Math.round(Math.sin(time * 6));
  ctx.fillStyle = '#101014';
  ctx.fillRect(x - 2, y - 12 + bob, 5, 12);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x - 1, y - 11 + bob, 3, 6);
  ctx.fillRect(x - 1, y - 3 + bob, 3, 2);
}

export function drawChenling(
  ctx: CanvasRenderingContext2D,
  footXPos: number,
  footY: number,
  facing: 1 | -1,
  frame: ChenlingFrame,
  dy: number,
  camX: number,
): void {
  ctx.drawImage(chenlingCanvas(frame, facing), Math.round(footXPos - 12 - camX), Math.round(footY - 39 + dy));
}

export function drawParent(
  ctx: CanvasRenderingContext2D,
  who: 'lixiuchun' | 'chentan',
  footXPos: number,
  facing: 1 | -1,
  scared: boolean,
  camX: number,
  time: number,
): void {
  const jitter = scared ? (Math.floor(time * 12) % 2 === 0 ? 1 : -1) : 0;
  ctx.drawImage(parentCanvas(who, facing), Math.round(footXPos - 12 - camX + jitter), FLOOR_Y - 39);
}

/** 陈伶抱着水桶喝水：桶挡在脸前。broken = 桶口碎了。 */
export function drawHeldBucket(ctx: CanvasRenderingContext2D, footXPos: number, facing: 1 | -1, broken: boolean, camX: number): void {
  const x = Math.round(footXPos - camX + facing * 3 - 6);
  const y = FLOOR_Y - 46;
  ctx.fillStyle = '#101014';
  ctx.fillRect(x - 1, y - 1, 14, 18);
  ctx.fillStyle = '#6fa8d8';
  ctx.fillRect(x, y, 12, 16);
  ctx.fillStyle = '#4a7fb0';
  ctx.fillRect(x, y + 4, 12, 2);
  ctx.fillRect(x, y + 11, 12, 2);
  if (broken) {
    ctx.clearRect(x, y - 1, 12, 3);
    ctx.fillStyle = '#6fa8d8';
    for (const [dx, h] of [[0, 2], [3, 1], [5, 3], [8, 1], [10, 2]] as const) ctx.fillRect(x + dx, y, 2, h);
    ctx.fillStyle = 'rgba(160,200,240,0.8)';
    ctx.fillRect(x + 2, y + 16, 1, 3);
    ctx.fillRect(x + 8, y + 16, 1, 4);
  }
}
```

- [ ] **Step 2: 写 street-scene.ts**

`src/render/street-scene.ts`
```ts
import { TILE } from '../physics/platformer';
import { STREET, STREET_DOOR_TILE } from '../level/street';
import { drawTiles, hash, FLOOR_Y } from './common';
import { VIEW_H, VIEW_W } from './viewport';

/** 雨夜极光城的街道：深色天空、极光、两层楼房剪影、路灯、陈伶家的门。 */
export function drawStreetScene(ctx: CanvasRenderingContext2D, camX: number, time: number, props: Readonly<Record<string, string>>): void {
  const cx = Math.round(camX);
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // 极光：三条缓慢起伏的色带
  for (const [color, base, amp, speed] of [
    ['rgba(63,181,176,0.22)', 34, 8, 0.4],
    ['rgba(90,200,130,0.16)', 48, 10, 0.3],
    ['rgba(120,90,200,0.12)', 60, 6, 0.5],
  ] as const) {
    ctx.fillStyle = color;
    for (let x = 0; x < VIEW_W; x += 2) {
      const y = base + Math.sin((x + cx * 0.1) / 40 + time * speed) * amp;
      ctx.fillRect(x, Math.round(y), 2, 6);
    }
  }

  // 远处楼房（视差 0.3）
  for (let i = 0; i < 24; i++) {
    const w = 40 + Math.floor(hash(i) * 40);
    const h = 60 + Math.floor(hash(i + 50) * 70);
    const x = Math.round(i * 70 - cx * 0.3);
    if (x > VIEW_W || x + w < 0) continue;
    ctx.fillStyle = '#141826';
    ctx.fillRect(x, FLOOR_Y - h, w, h);
    ctx.fillStyle = 'rgba(255,210,120,0.35)';
    for (let k = 0; k < 4; k++) {
      if (hash(i * 10 + k) > 0.6) ctx.fillRect(x + 6 + k * 9, FLOOR_Y - h + 10 + (k % 2) * 14, 3, 4);
    }
  }

  // 近处楼房（视差 0.7）
  for (let i = 0; i < 18; i++) {
    const w = 60 + Math.floor(hash(i + 200) * 30);
    const h = 90 + Math.floor(hash(i + 300) * 40);
    const x = Math.round(i * 100 + 30 - cx * 0.7);
    if (x > VIEW_W || x + w < 0) continue;
    ctx.fillStyle = '#1b2030';
    ctx.fillRect(x, FLOOR_Y - h, w, h);
  }

  // 陈伶家（世界坐标，跟地面一起走）
  const houseX = (STREET_DOOR_TILE - 4) * TILE - cx;
  ctx.fillStyle = '#2a2730';
  ctx.fillRect(houseX, FLOOR_Y - 120, 9 * TILE, 120);
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(houseX - 4, FLOOR_Y - 124, 9 * TILE + 8, 6);
  const doorX = STREET_DOOR_TILE * TILE - cx;
  ctx.fillStyle = props.streetDoor === 'open' ? '#06060a' : '#5a3d26';
  ctx.fillRect(doorX, FLOOR_Y - 40, 18, 40);
  ctx.fillStyle = 'rgba(255,200,120,0.5)';
  ctx.fillRect(houseX + 20, FLOOR_Y - 90, 12, 14);

  // 路灯
  for (let tx = 6; tx < STREET.width; tx += 14) {
    const x = tx * TILE - cx;
    if (x < -20 || x > VIEW_W + 20) continue;
    ctx.fillStyle = '#2e3240';
    ctx.fillRect(x, FLOOR_Y - 70, 2, 70);
    ctx.fillRect(x, FLOOR_Y - 70, 10, 2);
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(x + 8, FLOOR_Y - 68, 3, 3);
    ctx.fillStyle = 'rgba(255,217,138,0.08)';
    ctx.beginPath();
    ctx.moveTo(x + 9, FLOOR_Y - 66);
    ctx.lineTo(x + 30, FLOOR_Y);
    ctx.lineTo(x - 12, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
  }

  drawTiles(ctx, STREET, { '=': 'cobble' }, cx);

  // 积水
  ctx.fillStyle = 'rgba(120,140,190,0.25)';
  for (let i = 0; i < 10; i++) {
    const x = Math.round(i * 110 + 40 - cx);
    if (x > VIEW_W || x < -40) continue;
    ctx.fillRect(x, FLOOR_Y, 30, 1);
  }
}
```

- [ ] **Step 3: 写 stage-scene.ts**

`src/render/stage-scene.ts`
```ts
import { TILE } from '../physics/platformer';
import { STAGE } from '../level/stage';
import { interactableBox } from '../level/level';
import { frameFor } from '../art/sprites';
import { EXPECT } from '../expectation/expectation';
import { FAIL_DONE_AT, PASS_DONE_AT, PASS_SHATTER_AT, type StageSession } from '../scenes/stage-session';
import { FLOOR_Y, drawBang, drawChenling, drawTiles, hash } from './common';
import { VIEW_H, VIEW_W } from './viewport';

const TILES = { '=': 'stageFloor', '#': 'stageWall', x: 'crate' } as const;

let light: HTMLCanvasElement | null = null;

/** 危险程度 0~1：越接近失败，红眼睛凑得越近。 */
function dangerLean(s: StageSession): number {
  if (s.phase === 'failing') return 1;
  if (s.expect.status !== 'danger') return 0;
  return Math.min(1, s.expect.dangerTime / EXPECT.failAfter);
}

function drawAudience(ctx: CanvasRenderingContext2D, cx: number, time: number, lean: number): void {
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let row = 0; row < 7; row++) {
    const par = 0.3 + row * 0.08;
    const y = 40 + row * 22 + Math.round(lean * row * 3);
    const spacing = 12 + row * 2;
    ctx.fillStyle = '#121218';
    ctx.fillRect(0, y + 4, VIEW_W, 3);
    const scroll = cx * par;
    const first = Math.floor(scroll / spacing) - 1;
    for (let i = first; i * spacing - scroll < VIEW_W + spacing; i++) {
      const x = Math.round(i * spacing - scroll);
      const seat = i + row * 1000;
      if (hash(seat) < 0.2) continue;
      if (hash(seat * 7 + Math.floor(time * 1.5 + hash(seat) * 10)) < 0.06) continue;
      const size = lean > 0.5 ? 2 : 1;
      ctx.fillStyle = '#d0202c';
      ctx.fillRect(x, y, 2, size);
      ctx.fillRect(x + 4, y, 2, size);
    }
  }
}

function drawCurtain(ctx: CanvasRenderingContext2D, x: number, w: number): void {
  for (let i = 0; i < w; i++) {
    const f = i % 4;
    ctx.fillStyle = f === 0 ? '#6e0c14' : f === 1 ? '#a8141f' : f === 2 ? '#c41e2a' : '#8c1019';
    ctx.fillRect(x + i, 0, 1, FLOOR_Y);
  }
}

function drawSpotlight(ctx: CanvasRenderingContext2D, sx: number): void {
  if (!light) {
    light = document.createElement('canvas');
    light.width = VIEW_W;
    light.height = VIEW_H;
  }
  const l = light.getContext('2d');
  if (!l) return;
  const cone = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(sx - 10, 0);
    c.lineTo(sx + 10, 0);
    c.lineTo(sx + 44, FLOOR_Y);
    c.lineTo(sx - 44, FLOOR_Y);
    c.closePath();
  };
  l.globalCompositeOperation = 'source-over';
  l.clearRect(0, 0, VIEW_W, VIEW_H);
  l.fillStyle = 'rgba(0,0,0,0.62)';
  l.fillRect(0, 0, VIEW_W, VIEW_H);
  l.globalCompositeOperation = 'destination-out';
  cone(l);
  l.fill();
  l.beginPath();
  l.ellipse(sx, FLOOR_Y + 2, 48, 6, 0, 0, Math.PI * 2);
  l.fill();
  l.globalCompositeOperation = 'source-over';
  ctx.drawImage(light, 0, 0);
  ctx.fillStyle = 'rgba(255,245,220,0.07)';
  cone(ctx);
  ctx.fill();
}

function drawGiantEyes(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.fillStyle = '#d0202c';
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      if (hash(gx * 13 + gy * 7 + Math.floor(time * 4)) < 0.15) continue;
      const x = 30 + gx * 56 + (gy % 2) * 20;
      const y = 30 + gy * 48;
      ctx.fillRect(x, y, 8, 3);
      ctx.fillRect(x + 14, y, 8, 3);
    }
  }
}

function drawCracks(ctx: CanvasRenderingContext2D, p: number): void {
  ctx.fillStyle = '#f4f1ec';
  for (let i = 0; i < 14; i++) {
    const ang = hash(i) * Math.PI * 2;
    const len = Math.min(1, p) * (80 + hash(i + 7) * 200);
    for (let d = 0; d < len; d += 2) {
      const wob = Math.sin(d / 9 + i) * 3;
      ctx.fillRect(Math.round(VIEW_W / 2 + Math.cos(ang) * d + wob), Math.round(VIEW_H / 2 + Math.sin(ang) * d), 1, 1);
    }
  }
}

export function drawStageScene(ctx: CanvasRenderingContext2D, s: StageSession, camX: number, spotX: number): void {
  const cx = Math.round(camX);
  const lean = dangerLean(s);
  drawAudience(ctx, cx, s.time, lean);

  ctx.fillStyle = '#5a0a12';
  ctx.fillRect(0, 0, VIEW_W, 10);
  ctx.fillStyle = '#8c1019';
  for (let x = 0; x < VIEW_W; x += 4) ctx.fillRect(x, 10, 2, 3);

  drawTiles(ctx, STAGE, TILES, cx);
  drawCurtain(ctx, 2 * TILE - cx, 24);
  drawCurtain(ctx, (STAGE.width - 2) * TILE - 24 - cx, 24);

  for (const it of STAGE.interactables) {
    if (s.found.has(it.id)) continue;
    if (Math.floor(s.time * 2 + hash(it.tileX) * 4) % 3 !== 0) continue;
    const b = interactableBox(it);
    ctx.fillStyle = 'rgba(255,240,200,0.7)';
    ctx.fillRect(b.x + 7 - cx, b.y + 14, 2, 2);
  }

  const { frame, dy } = frameFor(s.actor.anim, s.actor.animTime);
  drawChenling(ctx, s.actor.body.x + s.actor.body.w / 2, s.actor.body.y + s.actor.body.h, s.actor.facing, frame, dy, cx);

  if (s.nearby && s.phase === 'play' && !s.talk.current) {
    const b = interactableBox(s.nearby);
    drawBang(ctx, b.x + 8 - cx, b.y - 2, s.time);
  }

  drawSpotlight(ctx, Math.round(spotX - cx));

  if (lean > 0) {
    ctx.fillStyle = `rgba(160,0,20,${0.5 * lean})`;
    const t = 10 + Math.round(20 * lean);
    ctx.fillRect(0, 0, VIEW_W, t);
    ctx.fillRect(0, VIEW_H - t, VIEW_W, t);
    ctx.fillRect(0, 0, t, VIEW_H);
    ctx.fillRect(VIEW_W - t, 0, t, VIEW_H);
  }

  if (s.phase === 'failing') {
    const p = s.phaseTime / FAIL_DONE_AT;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, p * 2.5)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (p > 0.3) drawGiantEyes(ctx, s.time);
  }

  if (s.phase === 'passing') {
    drawCracks(ctx, s.phaseTime / PASS_SHATTER_AT);
    if (s.phaseTime > PASS_SHATTER_AT) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (s.phaseTime - PASS_SHATTER_AT) / (PASS_DONE_AT - PASS_SHATTER_AT))})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
```

- [ ] **Step 4: 写 home-scene.ts**

`src/render/home-scene.ts`
```ts
import { TILE } from '../physics/platformer';
import { HOME, HOME_DECOR } from '../level/home';
import { interactableBox } from '../level/level';
import { frameFor } from '../art/sprites';
import { FINALE_DONE_AT, FINALE_FADE_AT, type HomeSession } from '../scenes/home-session';
import { FLOOR_Y, drawBang, drawChenling, drawTiles, hash } from './common';
import { VIEW_H, VIEW_W } from './viewport';

const X = (tile: number, camX: number): number => tile * TILE - camX;

export interface HomeBackdrop {
  camX: number;
  time: number;
  night: boolean;
  props: Readonly<Record<string, string>>;
  eyes: number;
}

function door(ctx: CanvasRenderingContext2D, x: number, open: boolean): void {
  ctx.fillStyle = '#2a1f18';
  ctx.fillRect(x - 2, FLOOR_Y - 46, 22, 46);
  ctx.fillStyle = open ? '#08080c' : '#5a3d26';
  ctx.fillRect(x, FLOOR_Y - 44, 18, 44);
  if (!open) {
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(x + 14, FLOOR_Y - 22, 2, 2);
  }
}

/** 陈伶家的背景与家具（不含人物）。opening 与醒来关共用。 */
export function drawHomeBackdrop(ctx: CanvasRenderingContext2D, v: HomeBackdrop): void {
  const cx = Math.round(v.camX);
  ctx.fillStyle = v.night ? '#24232a' : '#4a4c56';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = v.night ? '#2a2930' : '#52545e';
  for (let x = -((cx * 1) % 8); x < VIEW_W; x += 8) ctx.fillRect(x, 0, 2, FLOOR_Y);
  ctx.fillStyle = '#2a1f18';
  ctx.fillRect(0, FLOOR_Y - 8, VIEW_W, 8);

  // 卧室
  const bx = X(HOME_DECOR.bed, cx);
  ctx.fillStyle = '#5a3d26';
  ctx.fillRect(bx, FLOOR_Y - 22, 80, 22);
  ctx.fillStyle = '#d8d4cc';
  ctx.fillRect(bx + 2, FLOOR_Y - 28, 76, 8);
  ctx.fillStyle = '#eeeae2';
  ctx.fillRect(bx + 4, FLOOR_Y - 32, 16, 6);
  const wx = X(HOME_DECOR.window, cx);
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(wx, 96, 48, 64);
  ctx.fillStyle = v.night ? '#141a2e' : '#6f7f9a';
  ctx.fillRect(wx + 3, 99, 42, 58);
  ctx.fillStyle = 'rgba(88,196,208,0.55)';
  ctx.fillRect(wx + 3, 110 + Math.round(Math.sin(v.time) * 2), 42, 4);
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(wx + 23, 99, 2, 58);
  const wd = X(HOME_DECOR.wardrobe, cx);
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(wd, FLOOR_Y - 104, 48, 104);
  ctx.fillStyle = '#2a1c12';
  ctx.fillRect(wd + 23, FLOOR_Y - 100, 2, 96);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(wd + 19, FLOOR_Y - 56, 2, 4);
  ctx.fillRect(wd + 27, FLOOR_Y - 56, 2, 4);

  // 卧室门、大门
  door(ctx, X(HOME_DECOR.bedroomDoor, cx), v.props.bedroomDoor === 'open');
  door(ctx, X(HOME_DECOR.frontDoor, cx), v.props.frontDoor === 'open');

  // 客厅
  const dx = X(HOME_DECOR.dispenser, cx);
  ctx.fillStyle = '#d8d8dc';
  ctx.fillRect(dx, FLOOR_Y - 48, 18, 48);
  ctx.fillStyle = '#9a9aa2';
  ctx.fillRect(dx + 3, FLOOR_Y - 30, 4, 3);
  if (v.props.bucket === 'full') {
    ctx.fillStyle = '#6fa8d8';
    ctx.fillRect(dx + 2, FLOOR_Y - 72, 14, 24);
    ctx.fillStyle = '#4a7fb0';
    ctx.fillRect(dx + 2, FLOOR_Y - 64, 14, 2);
  }
  if (v.props.bucket === 'empty') {
    ctx.fillStyle = '#6fa8d8';
    for (const [ox, w] of [[-8, 4], [-2, 3], [22, 5], [28, 2]] as const) ctx.fillRect(dx + ox, FLOOR_Y - 2, w, 2);
  }
  const sx = X(HOME_DECOR.sofa, cx);
  ctx.fillStyle = '#5b4a5e';
  ctx.fillRect(sx, FLOOR_Y - 28, 80, 28);
  ctx.fillStyle = '#4a3a4e';
  ctx.fillRect(sx, FLOOR_Y - 40, 80, 14);
  door(ctx, X(HOME_DECOR.parentsDoor, cx), false);
  const px = X(HOME_DECOR.photo, cx);
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(px, 116, 26, 22);
  ctx.fillStyle = '#9a8a7a';
  ctx.fillRect(px + 2, 118, 22, 18);
  ctx.fillStyle = '#2a1a14';
  for (const ox of [4, 9, 14, 19]) ctx.fillRect(px + ox, 124, 3, 3);

  // 客厅与厨房之间的拱门
  const ax = X(HOME_DECOR.kitchenArch, cx);
  ctx.fillStyle = '#2a1f18';
  ctx.fillRect(ax, 70, 6, FLOOR_Y - 70);
  ctx.fillRect(ax + 26, 70, 6, FLOOR_Y - 70);
  ctx.fillRect(ax, 64, 32, 8);

  // 厨房
  const kx = X(HOME_DECOR.counter, cx);
  ctx.fillStyle = '#6b6f78';
  ctx.fillRect(kx, FLOOR_Y - 40, 144, 40);
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(kx, FLOOR_Y - 42, 144, 3);
  ctx.fillStyle = '#5b5f68';
  ctx.fillRect(kx, 100, 144, 40);
  const fx = X(HOME_DECOR.fridge, cx);
  ctx.fillStyle = '#cfd3d8';
  ctx.fillRect(fx, FLOOR_Y - 84, 32, 84);
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(fx, FLOOR_Y - 52, 32, 2);
  if (!v.night) {
    const bk = X(HOME_DECOR.bucket, cx);
    ctx.fillStyle = '#6fa8d8';
    for (const [ox, oy, w] of [[0, 2, 5], [7, 1, 3], [12, 2, 6], [20, 1, 3], [26, 2, 4]] as const) ctx.fillRect(bk + ox, FLOOR_Y - oy, w, oy);
    ctx.fillStyle = '#5a0a12';
    for (const [ox, w] of [[-6, 10], [6, 4], [14, 12], [30, 6]] as const) ctx.fillRect(bk + ox, FLOOR_Y, w, 1);
  }

  drawTiles(ctx, HOME, { '=': 'homeFloor', '#': 'homeWall' }, cx);

  if (v.eyes > 0) {
    ctx.fillStyle = '#d0202c';
    for (let i = 0; i < 10; i++) {
      const ex = X(40, cx) + i * 18 + Math.round(hash(i) * 6);
      const ey = 104 + Math.round(hash(i + 20) * 30);
      ctx.fillRect(ex, ey, 3, 2);
      ctx.fillRect(ex + 6, ey, 3, 2);
    }
  }

  ctx.fillStyle = v.night ? 'rgba(10,14,30,0.45)' : 'rgba(60,80,110,0.22)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (v.night) {
    const lx = X(43, cx);
    ctx.fillStyle = 'rgba(255,200,120,0.10)';
    ctx.beginPath();
    ctx.ellipse(lx, 120, 90, 70, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 结尾特写：放大的地板、碎桶片、形状扭曲的深红痕迹（暗示，不写实）。 */
function drawFinale(ctx: CanvasRenderingContext2D, phaseTime: number): void {
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#2a1c12';
  for (let y = 30; y < VIEW_H; y += 48) ctx.fillRect(0, y, VIEW_W, 4);
  ctx.fillStyle = '#6fa8d8';
  for (let i = 0; i < 9; i++) ctx.fillRect(Math.round(60 + hash(i) * 360), Math.round(40 + hash(i + 9) * 190), 6 + Math.round(hash(i + 3) * 10), 4);
  const grow = Math.min(1, phaseTime / 1.2);
  ctx.fillStyle = '#5a0a12';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = (40 + hash(i) * 60) * grow;
    const x = Math.round(VIEW_W / 2 + Math.cos(a) * r * 1.6);
    const y = Math.round(VIEW_H / 2 + Math.sin(a) * r * 0.8);
    ctx.fillRect(x - 6, y - 4, 12, 8);
  }
  ctx.fillStyle = '#3a0508';
  ctx.fillRect(VIEW_W / 2 - 46, VIEW_H / 2 - 16, 18, 8);
  ctx.fillRect(VIEW_W / 2 + 28, VIEW_H / 2 - 16, 18, 8);
  if (phaseTime > FINALE_FADE_AT) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, (phaseTime - FINALE_FADE_AT) / (FINALE_DONE_AT - FINALE_FADE_AT))})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

export function drawHomeLevel(ctx: CanvasRenderingContext2D, s: HomeSession, camX: number): void {
  if (s.phase === 'finale' || s.phase === 'done') {
    drawFinale(ctx, s.phase === 'done' ? FINALE_DONE_AT : s.phaseTime);
    return;
  }
  const cx = Math.round(camX);
  drawHomeBackdrop(ctx, { camX: cx, time: s.time, night: false, props: { bucket: 'none' }, eyes: s.eyes });
  const fx = s.actor.body.x + s.actor.body.w / 2;
  if (s.sitting) {
    drawChenling(ctx, fx, FLOOR_Y, 1, 'idle0', 10, cx);
    ctx.fillStyle = '#5b6b8a';
    ctx.fillRect(X(HOME_DECOR.bed, cx) + 20, FLOOR_Y - 30, 60, 12);
  } else {
    const { frame, dy } = frameFor(s.actor.anim, s.actor.animTime);
    drawChenling(ctx, fx, s.actor.body.y + s.actor.body.h, s.actor.facing, frame, dy, cx);
  }
  if (s.nearby && !s.talk.current) {
    const b = interactableBox(s.nearby);
    drawBang(ctx, b.x + 8 - cx, b.y - 2, s.time);
  }
}
```

- [ ] **Step 5: 写 opening-scene.ts**

`src/render/opening-scene.ts`
```ts
import type { CutsceneWorld } from '../cutscene/runner';
import { levelWidthPx } from '../level/level';
import { HOME } from '../level/home';
import { STREET } from '../level/street';
import { clampCamera } from './camera';
import { FLOOR_Y, drawChenling, drawHeldBucket, drawParent, drawRain, hash } from './common';
import { drawHomeBackdrop } from './home-scene';
import { drawStreetScene } from './street-scene';
import { VIEW_H, VIEW_W } from './viewport';

function drawActors(ctx: CanvasRenderingContext2D, w: CutsceneWorld, cam: number, time: number): void {
  for (const who of ['lixiuchun', 'chentan'] as const) {
    const a = w.actors[who];
    if (a.visible) drawParent(ctx, who, a.x, a.facing, a.pose === 'scared', cam, time);
  }
  const c = w.actors.chenling;
  if (!c.visible) return;
  const frames = ['walk0', 'walk1', 'walk2', 'walk3'] as const;
  const frame = c.walking ? frames[Math.floor(time / (c.stagger ? 0.18 : 0.12)) % 4] : 'idle0';
  const dy = c.stagger ? Math.round(Math.sin(time * 7) * 1.2) : 0;
  const sway = c.stagger ? Math.round(Math.sin(time * 3.3)) : 0;
  drawChenling(ctx, c.x + sway, FLOOR_Y, c.facing, frame, dy, cam);
  if (c.pose === 'drink') drawHeldBucket(ctx, c.x, c.facing, w.props.bucket === 'broken', cam);
}

export function drawOpening(ctx: CanvasRenderingContext2D, w: CutsceneWorld, time: number): void {
  const shake = w.shakeTime > 0 ? Math.round((hash(Math.floor(time * 30)) - 0.5) * 2 * w.shakeStrength) : 0;
  ctx.save();
  ctx.translate(shake, 0);
  if (w.scene === 'street') {
    const cam = clampCamera(w.cameraX, levelWidthPx(STREET));
    drawStreetScene(ctx, cam, time, w.props);
    drawActors(ctx, w, cam, time);
  } else if (w.scene === 'home') {
    const cam = clampCamera(w.cameraX, levelWidthPx(HOME));
    drawHomeBackdrop(ctx, { camX: cam, time, night: true, props: w.props, eyes: 0 });
    drawActors(ctx, w, cam, time);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();
  if (w.rain && w.scene === 'street') drawRain(ctx, time);
  if (w.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${w.fade})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
```

- [ ] **Step 6: 类型检查**

Run: `npm run typecheck`
Expected: 无输出

- [ ] **Step 7: Commit**

```bash
git add src/render
git commit -m "feat: 街道、剧场、家、开场四个场景的绘制

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: DOM 界面

**Files:**
- Create: `src/ui/style.css`, `src/ui/confirm.ts`, `src/ui/ui.ts`
- Test: `tests/ui/confirm.test.ts`

- [ ] **Step 1: 写失败的测试**

`tests/ui/confirm.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { ConfirmGate } from '../../src/ui/confirm';

describe('ConfirmGate', () => {
  it('第一次只是上膛，3 秒内第二次才确认', () => {
    const g = new ConfirmGate(3000);
    expect(g.press(1000)).toBe(false);
    expect(g.isArmed(2000)).toBe(true);
    expect(g.press(3999)).toBe(true);
    expect(g.isArmed(4000)).toBe(false);
  });

  it('超过 3 秒重新上膛', () => {
    const g = new ConfirmGate(3000);
    g.press(0);
    expect(g.isArmed(3001)).toBe(false);
    expect(g.press(3001)).toBe(false);
    expect(g.press(3500)).toBe(true);
  });

  it('reset 取消上膛', () => {
    const g = new ConfirmGate(3000);
    g.press(0);
    g.reset();
    expect(g.press(100)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/ui/confirm.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

`src/ui/confirm.ts`
```ts
/** 两步确认：第一下上膛，windowMs 内第二下才算数。 */
export class ConfirmGate {
  private armedAt: number | null = null;

  constructor(private readonly windowMs = 3000) {}

  press(now: number): boolean {
    if (this.isArmed(now)) {
      this.armedAt = null;
      return true;
    }
    this.armedAt = now;
    return false;
  }

  isArmed(now: number): boolean {
    return this.armedAt !== null && now - this.armedAt <= this.windowMs;
  }

  reset(): void {
    this.armedAt = null;
  }
}
```

`src/ui/style.css`
```css
#overlay { position: absolute; pointer-events: none; color: #f4f1ec; font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif; --u: 1px; }
.hidden { display: none !important; }

.dialogue { position: absolute; left: calc(var(--u) * 16); right: calc(var(--u) * 16); bottom: calc(var(--u) * 10); min-height: calc(var(--u) * 58); box-sizing: border-box; display: flex; gap: calc(var(--u) * 8); padding: calc(var(--u) * 5); background: rgba(10, 10, 14, 0.9); border: calc(var(--u) * 1) solid #c41e2a; }
.dialogue canvas { width: calc(var(--u) * 48); height: calc(var(--u) * 48); image-rendering: pixelated; flex: none; }
.dialogue .name { font-size: calc(var(--u) * 9); color: #e0414b; margin-bottom: calc(var(--u) * 3); }
.dialogue .text { font-size: calc(var(--u) * 11); line-height: 1.5; }
.dialogue.think { border-color: #55555e; }
.dialogue.think canvas, .dialogue.think .name { display: none; }
.dialogue.think .text { font-style: italic; color: #b8b8c0; }
.dialogue .more { position: absolute; right: calc(var(--u) * 6); bottom: calc(var(--u) * 3); font-size: calc(var(--u) * 7); animation: blink 1s steps(2) infinite; }

.expect { position: absolute; right: calc(var(--u) * 8); top: calc(var(--u) * 8); padding: calc(var(--u) * 4) calc(var(--u) * 6); background: #0b0b0e; border: calc(var(--u) * 1) solid #3a0a10; color: #ff3344; text-shadow: 0 0 calc(var(--u) * 3) #ff2233; }
.expect .value { font-size: calc(var(--u) * 12); letter-spacing: 0.05em; }
.expect .fine { font-size: calc(var(--u) * 5); color: #a33; margin-top: calc(var(--u) * 2); max-width: calc(var(--u) * 120); line-height: 1.3; }
.expect.danger .value { animation: blink 0.5s steps(2) infinite; }

.popup { position: absolute; font-size: calc(var(--u) * 9); color: #ffd166; text-shadow: 0 1px 0 #000; transform: translate(-50%, 0); animation: rise 0.9s ease-out forwards; }

#controls { position: absolute; inset: 0; pointer-events: none; }
.btn { position: absolute; pointer-events: auto; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; background: rgba(255, 255, 255, 0.12); border: 2px solid rgba(255, 255, 255, 0.35); touch-action: none; }
.btn.held { background: rgba(196, 30, 42, 0.45); }
.btn.hint { animation: blink 0.8s steps(2) 5; }
#btn-left { left: calc(env(safe-area-inset-left) + 20px); bottom: calc(env(safe-area-inset-bottom) + 20px); }
#btn-right { left: calc(env(safe-area-inset-left) + 96px); bottom: calc(env(safe-area-inset-bottom) + 20px); }
#btn-jump { right: calc(env(safe-area-inset-right) + 20px); bottom: calc(env(safe-area-inset-bottom) + 28px); width: 76px; height: 76px; }
#btn-interact { right: calc(env(safe-area-inset-right) + 108px); bottom: calc(env(safe-area-inset-bottom) + 20px); font-size: 16px; }
.small-btn { position: absolute; pointer-events: auto; padding: 8px 14px; border-radius: 8px; font-size: 14px; color: #fff; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.3); }
#btn-pause { left: calc(env(safe-area-inset-left) + 12px); top: calc(env(safe-area-inset-top) + 12px); }
#btn-skip { right: calc(env(safe-area-inset-right) + 12px); top: calc(env(safe-area-inset-top) + 12px); }

.screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; color: #f4f1ec; background: rgba(0, 0, 0, 0.55); pointer-events: auto; font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif; }
.screen h1 { margin: 0; font-size: 34px; color: #e0414b; letter-spacing: 0.12em; }
.screen .sub { font-size: 15px; color: #cfcfd6; }
.screen .note { font-size: 13px; color: #9a9aa4; }
.screen button { min-width: 180px; padding: 12px 20px; font-size: 17px; color: #fff; border-radius: 10px; border: 1px solid #c41e2a; background: rgba(196, 30, 42, 0.25); }
.screen .credit { position: absolute; bottom: calc(env(safe-area-inset-bottom) + 10px); padding: 0 16px; font-size: 11px; color: #8a8a94; }
.screen.endcard { background: #000; }
.screen.endcard .big { font-size: 28px; letter-spacing: 0.3em; animation: fadein 2s ease-out; }

#rotate { display: none; }
@media (orientation: portrait) {
  #rotate { display: flex; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; font-size: 20px; color: #fff; background: #000; }
}

@keyframes blink { 50% { opacity: 0.2; } }
@keyframes rise { to { transform: translate(-50%, calc(var(--u) * -18)); opacity: 0; } }
@keyframes fadein { from { opacity: 0; } }
```

`src/ui/ui.ts`
```ts
import type { Actions } from '../input/actions';
import { bindTouchButton } from '../input/touch';
import { VIEW_W, type Viewport } from '../render/viewport';
import type { Mode, TitleMenu } from '../flow/game-flow';
import { SPEAKER_NAMES, isComplete, visibleText, type DialogueState } from '../dialogue/dialogue';
import { portraitCanvas } from '../art/portraits';
import { ConfirmGate } from './confirm';

export interface UiCallbacks {
  onStart(): void;
  onContinue(): void;
  onRestart(): void;
  onPause(): void;
  onResume(): void;
  onQuit(): void;
  onSkip(): void;
  onEndDone(): void;
}

export interface Ui {
  layout(v: Viewport): void;
  setMode(mode: Mode): void;
  showTitle(menu: TitleMenu): void;
  showPause(show: boolean): void;
  renderDialogue(d: DialogueState | null): void;
  /** text 为 null 时隐藏期待值屏 */
  renderExpect(text: string | null, danger: boolean): void;
  popup(gameX: number, gameY: number, text: string): void;
  showEndCard(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
  return e;
}

export function createUi(app: HTMLElement, actions: Actions, cb: UiCallbacks): Ui {
  const overlay = el('div', '', app);
  overlay.id = 'overlay';

  const dlg = el('div', 'dialogue hidden', overlay);
  const portrait = el('canvas', '', dlg);
  portrait.width = 48;
  portrait.height = 48;
  const body = el('div', '', dlg);
  const name = el('div', 'name', body);
  const text = el('div', 'text', body);
  const more = el('div', 'more', dlg, '▼');
  let lastDialogueKey = '';

  const expect = el('div', 'expect hidden', overlay);
  const expectValue = el('div', 'value', expect);
  el('div', 'fine', expect, '请不要让观众期待值低于20%，否则剧院不保证演员的人身安全');

  const controls = el('div', '', app);
  controls.id = 'controls';
  const button = (id: string, label: string, cls: string): HTMLDivElement => {
    const b = el('div', `${cls} hidden`, controls, label);
    b.id = id;
    return b;
  };
  const left = button('btn-left', '◀', 'btn');
  const right = button('btn-right', '▶', 'btn');
  const jump = button('btn-jump', '跳', 'btn');
  const interact = button('btn-interact', '互动', 'btn');
  bindTouchButton(left, 'left', actions);
  bindTouchButton(right, 'right', actions);
  bindTouchButton(jump, 'jump', actions);
  bindTouchButton(interact, 'interact', actions);
  bindTouchButton(interact, 'advance', actions);
  const pauseBtn = button('btn-pause', '暂停', 'small-btn');
  const skipBtn = button('btn-skip', '跳过 ▶▶', 'small-btn');
  pauseBtn.addEventListener('click', () => cb.onPause());
  skipBtn.addEventListener('click', () => cb.onSkip());

  const title = el('div', 'screen hidden', app);
  el('h1', '', title, '我不是戏神');
  el('div', 'sub', title, '同人像素游戏 · 第一章「戏鬼回家」');
  const menu = el('div', 'screen-menu', title);
  menu.style.display = 'flex';
  menu.style.flexDirection = 'column';
  menu.style.gap = '12px';
  el('div', 'credit', title, '同人作品 · 原作《我不是戏神》三九音域 · 非官方，不收费 · 陈伶造型参考画师 @SYZDXZ 的同人图');
  const gate = new ConfirmGate(3000);

  const pause = el('div', 'screen hidden', app);
  el('div', 'sub', pause, '已暂停');
  el('button', '', pause, '继续').addEventListener('click', () => cb.onResume());
  el('button', '', pause, '回到标题').addEventListener('click', () => cb.onQuit());

  const end = el('div', 'screen endcard hidden', app);
  el('div', 'big', end, '第一章 · 未完待续');
  const endHint = el('div', 'note', end, '点击返回标题');
  let endShownAt = 0;
  let endTimer: ReturnType<typeof setTimeout> | null = null;
  end.addEventListener('click', () => {
    if (Date.now() - endShownAt < 2000) return;
    if (endTimer) clearTimeout(endTimer);
    endTimer = null;
    cb.onEndDone();
  });

  return {
    layout(v) {
      overlay.style.left = `${v.left}px`;
      overlay.style.top = `${v.top}px`;
      overlay.style.width = `${v.cssW}px`;
      overlay.style.height = `${v.cssH}px`;
      overlay.style.setProperty('--u', `${v.cssW / VIEW_W}px`);
    },
    setMode(mode) {
      const playing = mode === 'stage' || mode === 'home';
      for (const b of [left, right, jump, interact]) b.classList.toggle('hidden', !playing);
      // spec §4.2 开场引导：进剧场时左右键与互动键轻微闪烁
      for (const b of [left, right, interact]) {
        b.classList.toggle('hint', mode === 'stage');
        if (mode === 'stage') setTimeout(() => b.classList.remove('hint'), 4000);
      }
      pauseBtn.classList.toggle('hidden', !(playing || mode === 'opening'));
      skipBtn.classList.toggle('hidden', mode !== 'opening');
      title.classList.toggle('hidden', mode !== 'title');
      end.classList.toggle('hidden', mode !== 'end');
      pause.classList.add('hidden');
      expect.classList.add('hidden');
      dlg.classList.add('hidden');
      lastDialogueKey = '';
      overlay.querySelectorAll('.popup').forEach((p) => p.remove());
    },
    showTitle(m) {
      menu.replaceChildren();
      gate.reset();
      if (m === 'fresh') {
        el('button', '', menu, '点击开始').addEventListener('click', () => cb.onStart());
        return;
      }
      if (m === 'cleared') {
        el('div', 'note', menu, '第一章前三关已通关');
        el('button', '', menu, '从头开始').addEventListener('click', () => cb.onRestart());
        return;
      }
      el('button', '', menu, '继续').addEventListener('click', () => cb.onContinue());
      const restart = el('button', '', menu, '从头开始');
      restart.addEventListener('click', () => {
        if (gate.press(Date.now())) {
          cb.onRestart();
          return;
        }
        restart.textContent = '再点一次确认';
        setTimeout(() => {
          if (!gate.isArmed(Date.now())) restart.textContent = '从头开始';
        }, 3100);
      });
    },
    showPause(show) {
      pause.classList.toggle('hidden', !show);
    },
    renderDialogue(d) {
      if (!d) {
        if (lastDialogueKey !== '') dlg.classList.add('hidden');
        lastDialogueKey = '';
        return;
      }
      const key = `${d.line.speaker}|${d.line.text}|${Math.floor(d.shown)}`;
      if (key === lastDialogueKey) return;
      const newLine = !lastDialogueKey.startsWith(`${d.line.speaker}|${d.line.text}|`);
      lastDialogueKey = key;
      dlg.classList.remove('hidden');
      dlg.classList.toggle('think', d.line.style === 'think');
      if (newLine && d.line.speaker) {
        name.textContent = SPEAKER_NAMES[d.line.speaker];
        const ctx = portrait.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 48, 48);
          ctx.drawImage(portraitCanvas(d.line.speaker), 0, 0);
        }
      }
      text.textContent = visibleText(d);
      more.classList.toggle('hidden', !isComplete(d));
    },
    renderExpect(t, danger) {
      if (t === null) {
        expect.classList.add('hidden');
        return;
      }
      expect.classList.remove('hidden');
      expect.classList.toggle('danger', danger);
      const label = `观众期待值：${t}`;
      if (expectValue.textContent !== label) expectValue.textContent = label;
    },
    popup(gameX, gameY, msg) {
      const p = el('div', 'popup', overlay, msg);
      p.style.left = `calc(var(--u) * ${gameX})`;
      p.style.top = `calc(var(--u) * ${gameY})`;
      setTimeout(() => p.remove(), 1000);
    },
    showEndCard() {
      endShownAt = Date.now();
      endHint.classList.add('hidden');
      setTimeout(() => endHint.classList.remove('hidden'), 2000);
      if (endTimer) clearTimeout(endTimer);
      endTimer = setTimeout(() => {
        endTimer = null;
        cb.onEndDone();
      }, 8000);
    },
  };
}
```

- [ ] **Step 4: 运行测试与类型检查**

Run: `npx vitest run tests/ui && npm run typecheck`
Expected: 3 passed；typecheck 无输出

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/ui
git commit -m "feat: DOM 界面（按键、对话框、期待值屏、飘字、标题、暂停、结尾卡）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: 主循环接线与接线断言

**Files:**
- Modify: `src/main.ts`（整体替换 Task 1 的临时内容）
- Test: `tests/main-wiring.test.ts`

- [ ] **Step 1: 写失败的接线断言**

`tests/main-wiring.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import mainSource from '../src/main.ts?raw';

/** 先剥注释：注释里的字样不许喂饱正向断言（voxel-builder 七期踩过的坑）。 */
const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const SRC = stripComments(mainSource);

const fnBody = (signature: string): string => {
  const start = SRC.indexOf(signature);
  expect(start, `main.ts 里没找到 ${signature}`).toBeGreaterThanOrEqual(0);
  const open = SRC.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') {
      depth--;
      if (depth === 0) return SRC.slice(open, i + 1);
    }
  }
  throw new Error(`${signature} 的花括号不配对`);
};

describe('main.ts 接线', () => {
  it('剥注释真的剥干净了', () => {
    expect(SRC).not.toMatch(/\/\/|\/\*/);
  });

  it('两个关卡会话都吃 readInput(actions)', () => {
    expect(SRC).toMatch(/stepStage\(\s*stage\s*,\s*readInput\(actions\)\s*,\s*dt\s*\)/);
    expect(SRC).toMatch(/stepHome\(\s*home\s*,\s*readInput\(actions\)\s*,\s*dt\s*\)/);
  });

  it('开场动画的推进键是 advance 或 interact 的刚按下', () => {
    expect(SRC).toMatch(/tickRunner\(\s*opening\s*,\s*dt\s*,\s*actions\.justPressed\('advance'\)\s*\|\|\s*actions\.justPressed\('interact'\)\s*\)/);
  });

  it('固定步长循环里每跑一步就 endStep', () => {
    const loop = fnBody('function frame(');
    expect(loop).toMatch(/while\s*\(\s*acc\s*>=\s*STEP\s*\)\s*\{[^}]*update\(STEP\)[^}]*actions\.endStep\(\)/);
  });

  it('切后台：清键并暂停', () => {
    const i = SRC.indexOf("'visibilitychange'");
    expect(i).toBeGreaterThanOrEqual(0);
    const handler = SRC.slice(i, SRC.indexOf('});', i));
    expect(handler).toMatch(/actions\.releaseAll\(\)/);
    expect(handler).toMatch(/setPaused\(true\)/);
  });

  it('存档操作落到 saveProgress / clearProgress', () => {
    const apply = fnBody('function apply(');
    expect(apply).toMatch(/saveProgress\(\s*storage\s*,\s*r\.save\.level\s*\)/);
    expect(apply).toMatch(/clearProgress\(\s*storage\s*\)/);
  });

  it('标题的三个入口都先 sfx.unlock()', () => {
    for (const k of ['onStart', 'onContinue', 'onRestart']) {
      const i = SRC.indexOf(`${k}:`);
      expect(i, k).toBeGreaterThanOrEqual(0);
      const line = SRC.slice(i, SRC.indexOf('\n', i));
      expect(line, k).toMatch(/sfx\.unlock\(\)/);
    }
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `npx vitest run tests/main-wiring.test.ts`
Expected: FAIL（main.ts 还是临时内容）

- [ ] **Step 3: 实现 main.ts**

`src/main.ts`
```ts
import './ui/style.css';
import { Actions } from './input/actions';
import { bindKeyboard } from './input/keyboard';
import { bindTapToAdvance } from './input/touch';
import { readInput } from './input/frame-input';
import { createSfx } from './audio/synth';
import { clearProgress, loadProgress, safeLocalStorage, saveProgress } from './save/progress';
import { createFlow, dispatch, titleMenu, type FlowEvent, type FlowState } from './flow/game-flow';
import { createRunner, skipRunner, tickRunner, type Runner } from './cutscene/runner';
import { OPENING } from './scenes/opening-script';
import { createStageSession, stepStage, type StageSession } from './scenes/stage-session';
import { createHomeSession, stepHome, type HomeSession } from './scenes/home-session';
import { footX } from './actor/controller';
import { levelWidthPx } from './level/level';
import { STAGE } from './level/stage';
import { HOME } from './level/home';
import { VIEW_H, VIEW_W, fitViewport, type Viewport } from './render/viewport';
import { clampCamera, followCamera } from './render/camera';
import { present, sizeScreen } from './render/present';
import { drawOpening } from './render/opening-scene';
import { drawStageScene } from './render/stage-scene';
import { drawHomeLevel } from './render/home-scene';
import { drawStreetScene } from './render/street-scene';
import { drawRain } from './render/common';
import { createUi } from './ui/ui';

const STEP = 1 / 60;

const app = document.getElementById('app') as HTMLElement;
const screen = document.getElementById('screen') as HTMLCanvasElement;
const screenCtx = screen.getContext('2d') as CanvasRenderingContext2D;
const view = document.createElement('canvas');
view.width = VIEW_W;
view.height = VIEW_H;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;

const actions = new Actions();
bindKeyboard(window, actions);
bindTapToAdvance(screen, actions);
const sfx = createSfx();
const storage = safeLocalStorage();

let flow: FlowState = createFlow(loadProgress(storage));
let opening: Runner | null = null;
let stage: StageSession | null = null;
let home: HomeSession | null = null;
let camX = 0;
let spotX = 0;
let time = 0;
let paused = false;
let viewport: Viewport = fitViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

const ui = createUi(app, actions, {
  onStart: () => { sfx.unlock(); apply({ type: 'start' }); },
  onContinue: () => { sfx.unlock(); apply({ type: 'continue' }); },
  onRestart: () => { sfx.unlock(); apply({ type: 'restart' }); },
  onPause: () => setPaused(true),
  onResume: () => setPaused(false),
  onQuit: () => {
    setPaused(false);
    apply({ type: 'quitToTitle' });
  },
  onSkip: () => {
    if (opening) opening = skipRunner(opening);
  },
  onEndDone: () => apply({ type: 'endFinished' }),
});

function apply(e: FlowEvent): void {
  const r = dispatch(flow, e);
  flow = r.state;
  if (r.save.kind === 'write') saveProgress(storage, r.save.level);
  else if (r.save.kind === 'clear') clearProgress(storage);
  if (r.enter) enterMode();
}

function enterMode(): void {
  opening = null;
  stage = null;
  home = null;
  sfx.setHeartbeat(false);
  actions.releaseAll();
  ui.setMode(flow.mode);
  switch (flow.mode) {
    case 'title':
      sfx.setRain(true);
      ui.showTitle(titleMenu(flow.saved));
      break;
    case 'opening':
      opening = createRunner(OPENING);
      break;
    case 'stage':
      sfx.setRain(false);
      stage = createStageSession();
      camX = clampCamera(footX(stage.actor) - VIEW_W / 2, levelWidthPx(STAGE));
      spotX = footX(stage.actor);
      break;
    case 'home':
      sfx.setRain(false);
      home = createHomeSession();
      camX = clampCamera(footX(home.actor) - VIEW_W / 2, levelWidthPx(HOME));
      break;
    case 'end':
      sfx.setRain(false);
      ui.showEndCard();
      break;
  }
}

function setPaused(p: boolean): void {
  const can = opening !== null || stage !== null || home !== null;
  paused = p && can;
  actions.releaseAll();
  ui.showPause(paused);
  if (paused) sfx.setHeartbeat(false);
}

function update(dt: number): void {
  time += dt;
  if (opening) {
    const r = tickRunner(opening, dt, actions.justPressed('advance') || actions.justPressed('interact'));
    opening = r.runner;
    for (const s of r.sounds) sfx.play(s);
    sfx.setRain(opening.world.rain);
    ui.renderDialogue(opening.world.dialogue);
    if (opening.finished) apply({ type: 'levelComplete' });
    return;
  }
  if (stage) {
    const out = stepStage(stage, readInput(actions), dt);
    stage = out.session;
    for (const s of out.sounds) sfx.play(s);
    sfx.setHeartbeat(out.heartbeat);
    camX = followCamera(camX, footX(stage.actor), levelWidthPx(STAGE), dt);
    spotX += (footX(stage.actor) - spotX) * (1 - Math.exp(-2.5 * dt));
    for (const p of out.popups) ui.popup(p.worldX - camX, p.worldY, p.text);
    ui.renderDialogue(stage.talk.current);
    ui.renderExpect(`${Math.floor(stage.expect.value)}%`, stage.expect.status === 'danger');
    if (stage.outcome === 'passed') apply({ type: 'levelComplete' });
    else if (stage.outcome === 'failed') apply({ type: 'levelFailed' });
    return;
  }
  if (home) {
    const out = stepHome(home, readInput(actions), dt);
    home = out.session;
    for (const s of out.sounds) sfx.play(s);
    camX = followCamera(camX, footX(home.actor), levelWidthPx(HOME), dt);
    ui.renderDialogue(home.talk.current);
    ui.renderExpect(home.flicker > 0 ? '??%' : null, false);
    if (home.outcome === 'complete') apply({ type: 'levelComplete' });
  }
}

function render(): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (opening) drawOpening(ctx, opening.world, time);
  else if (stage) drawStageScene(ctx, stage, camX, spotX);
  else if (home) drawHomeLevel(ctx, home, camX);
  else {
    drawStreetScene(ctx, 300, time, {});
    drawRain(ctx, time);
  }
  present(screenCtx, view, viewport);
}

let last = performance.now();
let acc = 0;

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (actions.justPressed('pause')) {
    setPaused(!paused);
    actions.endStep();
  }
  if (!paused) {
    acc += dt;
    while (acc >= STEP) {
      update(STEP);
      actions.endStep();
      acc -= STEP;
    }
  } else {
    acc = 0;
  }
  render();
  requestAnimationFrame(frame);
}

function relayout(): void {
  viewport = fitViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  sizeScreen(screen, viewport);
  ui.layout(viewport);
}

window.addEventListener('resize', relayout);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    actions.releaseAll();
    setPaused(true);
  }
});

relayout();
enterMode();
requestAnimationFrame(frame);
```

- [ ] **Step 4: 运行全部测试、类型检查、构建**

Run: `npm test && npm run typecheck && npm run build`
Expected: 全部测试通过；typecheck 无输出；`dist/index.html` 生成

- [ ] **Step 5: 变异自检**

把 `while` 循环里的 `actions.endStep();` 删掉，确认「固定步长循环里每跑一步就 endStep」变红；恢复。

- [ ] **Step 6: Commit**

```bash
git add src/main.ts tests/main-wiring.test.ts
git commit -m "feat: 主循环接线（固定步长、流程切换、暂停、切后台）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: 目视验收（内嵌浏览器，手机横屏尺寸）

**Files:** 无新增；发现的问题就地修，修完补测试（若是逻辑问题）。

- [ ] **Step 1: 启动开发服务器**

在 `.claude/launch.json`（项目根）写入：
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "xishen-dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev", "--", "--port", "5174"], "port": 5174 }
  ]
}
```
用 `preview_start` 启动 `xishen-dev`，再用 `resize_window` 设为宽 812、高 375，刷新页面。

- [ ] **Step 2: 逐项截图检查**

用 `computer` 截图、键盘操作（← → 空格 E），逐项确认并记录结论：
1. 标题页：标题、副标题、「点击开始」、底部致谢小字都在，背景是下雨的街道。
2. 开场动画：黑屏 → 街道淡入、能看到极光和雨 → 陈伶踉跄走到门口 → 屋内三人 → 4 句台词依次出现（头像、名字正确）→ 咬碎桶口时画面抖动 → 最后黑屏。中途点「跳过」能直接进入剧场。
3. 剧场：引导两句想法 → 右上角期待值屏显示 29% → 走动有嘎吱声、聚光灯慢半拍跟随 → 跳过箱子 → 6 个调查点都能触发「!」和想法、首次 +6% 飘字 → 跳上台子调查假门 → 站着不动期待值下降，低于 20% 时边缘泛红、红眼睛逼近 → 等 5 秒失败、满屏红眼睛、重开 → 再玩到 60% 铃响、裂纹、白闪。
4. 醒来：坐在床上 → 「……是梦？」→ 走过客厅中间红眼睛闪现 → 厨房门口期待值屏闪「??%」→ 调查饮水机等物件 → 厨房水桶 → 特写深红痕迹 → 黑 → 「第一章 · 未完待续」→ 回标题后显示「第一章前三关已通关」。
5. 刷新页面后「继续」回到上次的关卡。
6. 暂停按钮 / Esc：暂停层出现，继续后不卡键。

- [ ] **Step 3: 修问题**

截图里看到的问题逐个修（位置不对、颜色看不清、文字溢出等）。逻辑问题先补失败测试再修。每修一类提交一次：

```bash
git add -A
git commit -m "fix: 目视验收发现的问题（写明具体是什么）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: 收尾检查**

Run: `npm test && npm run typecheck && npm run build`
Expected: 全绿、无输出、构建成功。用 `resize_window` 的 `desktop` 预设恢复视口。

---

### Task 24: 发布到 GitHub Pages

**Files:**
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: 写工作流**

`.github/workflows/pages.yml`
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github
git commit -m "ci: 构建并部署到 GitHub Pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: ⚠️ 先征得玩家同意再继续**

停下来，用大白话问玩家：「要在 GitHub 账号 dragon102 下建一个**公开**仓库 `xishen-game`，把游戏传上去并发布成网址。传上去以后谁知道网址谁就能玩，代码也能被看到。可以吗？」**得到明确的「可以」之前不执行下面的步骤。**

- [ ] **Step 4: 建仓、推送、开启 Pages**

```bash
gh repo create dragon102/xishen-game --public --source . --remote origin --push
gh api -X POST repos/dragon102/xishen-game/pages -f build_type=workflow
gh run watch --repo dragon102/xishen-game --exit-status $(gh run list --repo dragon102/xishen-game --limit 1 --json databaseId -q '.[0].databaseId')
```
Expected: 工作流成功；网址为 `https://dragon102.github.io/xishen-game/`。

- [ ] **Step 5: 线上验证**

用内嵌浏览器打开上面的网址，确认标题页出现、能进入开场动画。然后把网址告诉玩家，并说明在手机上「添加到主屏幕」的方法（iPhone：Safari 分享按钮 → 添加到主屏幕；安卓：Chrome 菜单 → 添加到主屏幕），请玩家真机玩通三关。
