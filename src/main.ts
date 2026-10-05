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
import { FLOOR_Y, drawChenling, drawRain } from './render/common';
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
let titleTime = 0;
let paused = false;
let viewport: Viewport = fitViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

const ui = createUi(app, actions, {
  onStart: () => { sfx.unlock(); apply({ type: 'start' }); },
  onContinue: () => { sfx.unlock(); apply({ type: 'continue' }); },
  onRestart: () => { sfx.unlock(); apply({ type: 'restart' }); },
  onPause: () => setPaused(true),
  onResume: () => { sfx.unlock(); setPaused(false); },
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
  const was = paused;
  paused = p && can;
  actions.releaseAll();
  ui.showPause(paused);
  if (paused) {
    sfx.setHeartbeat(false);
    sfx.suspend();
  } else if (was && !paused) {
    sfx.unlock();
  }
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
    ui.setMoveControlsVisible(stage.phase !== 'passing' && stage.phase !== 'failing' && stage.phase !== 'done');
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
    ui.setMoveControlsVisible(home.phase !== 'finale' && home.phase !== 'done');
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
    drawStreetScene(ctx, 300, titleTime, {});
    drawChenling(ctx, 300 + 330, FLOOR_Y, 1, Math.floor(titleTime / 0.6) % 2 === 0 ? 'idle0' : 'idle1', 0, 300);
    drawRain(ctx, titleTime);
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
  if (!opening && !stage && !home) titleTime += dt;
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

const portrait = window.matchMedia('(orientation: portrait)');
portrait.addEventListener('change', (e) => {
  if (e.matches) setPaused(true);
});

if (import.meta.env.DEV) {
  (window as unknown as { __xishen: unknown }).__xishen = {
    frames(n: number) {
      for (let i = 0; i < n; i++) {
        update(STEP);
        actions.endStep();
      }
      render();
    },
    press(code: string, down: boolean) {
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
    },
  };
}

app.addEventListener('contextmenu', (e) => e.preventDefault());

relayout();
enterMode();
requestAnimationFrame(frame);
