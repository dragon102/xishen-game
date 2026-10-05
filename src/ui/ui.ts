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
  /** 玩家不能行动时（过关/失败动画、结尾特写）收起四个移动键；不会越过 setMode 定下的底线。 */
  setMoveControlsVisible(visible: boolean): void;
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
  const more = el('div', 'more', dlg, '▼︎');
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
  const left = button('btn-left', '◀︎', 'btn');
  const right = button('btn-right', '▶︎', 'btn');
  const jump = button('btn-jump', '跳', 'btn');
  const interact = button('btn-interact', '互动', 'btn');
  const moveButtons = [left, right, jump, interact];
  let playingMode = false;
  let moveVisible = true;
  const applyMoveButtons = (): void => {
    for (const b of moveButtons) b.classList.toggle('hidden', !(playingMode && moveVisible));
  };
  bindTouchButton(left, 'left', actions);
  bindTouchButton(right, 'right', actions);
  bindTouchButton(jump, 'jump', actions);
  bindTouchButton(interact, 'interact', actions);
  bindTouchButton(interact, 'advance', actions);
  const pauseBtn = button('btn-pause', '暂停', 'small-btn');
  const skipBtn = button('btn-skip', '跳过 ▶▶︎', 'small-btn');
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
  // 桌面便利：标题画面里 Enter / Space / E 等于点第一个按钮
  window.addEventListener('keydown', (e) => {
    if (e.repeat || title.classList.contains('hidden')) return;
    if (e.code !== 'Enter' && e.code !== 'Space' && e.code !== 'KeyE') return;
    const first = menu.querySelector('button');
    if (!first) return;
    e.preventDefault();
    first.click();
  });

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
      playingMode = playing;
      moveVisible = true;
      applyMoveButtons();
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
      dlg.classList.remove('beside-expect');
      dlg.classList.add('hidden');
      lastDialogueKey = '';
      overlay.querySelectorAll('.popup').forEach((p) => p.remove());
    },
    setMoveControlsVisible(visible) {
      moveVisible = visible;
      applyMoveButtons();
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
        dlg.classList.remove('beside-expect');
        return;
      }
      expect.classList.remove('hidden');
      dlg.classList.add('beside-expect');
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
