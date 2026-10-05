import type { SoundId } from './sound-ids';

export interface Sfx {
  /** 必须在一次用户点击里调用（iOS 规定声音只能由手势开启）。 */
  unlock(): void;
  play(id: SoundId): void;
  setRain(on: boolean): void;
  setHeartbeat(on: boolean): void;
  /** 暂停时挂起音频；回来后由 unlock() 恢复。 */
  suspend(): void;
}

const SILENT: Sfx = { unlock() {}, play() {}, setRain() {}, setHeartbeat() {}, suspend() {} };

export function createSfx(): Sfx {
  const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return SILENT;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let rain: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  // 想要的状态：标题画面在第一次点击（unlock）之前就会要求下雨，要先记着，解锁后补上。
  let wantRain = false;
  let wantHeartbeat = false;

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

  const applyRain = (): void => {
    if (!ctx || !master || !noise) return;
    if (wantRain && !rain) {
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
    } else if (!wantRain && rain) {
      const r = rain;
      rain = null;
      r.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      r.src.stop(ctx.currentTime + 0.9);
    }
  };

  const applyHeartbeat = (): void => {
    if (!ctx) return;
    if (wantHeartbeat && !heartbeatTimer) {
      play('heartbeat');
      heartbeatTimer = setInterval(() => play('heartbeat'), 900);
    } else if (!wantHeartbeat && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
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
      // iOS 里 state 可能是 'interrupted'，不只是 'suspended'
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      applyRain();
      applyHeartbeat();
    },
    play,
    setRain(on) {
      wantRain = on;
      applyRain();
    },
    setHeartbeat(on) {
      wantHeartbeat = on;
      applyHeartbeat();
    },
    suspend() {
      ctx?.suspend().catch(() => {});
    },
  };
}
