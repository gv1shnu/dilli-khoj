// Procedural ambience: filtered-noise wind plus sparse birdcalls.
// No audio files ship; everything is synthesized with the Web Audio API.

export interface Ambience {
  /** Resume/start playback (must be called from a user gesture). */
  resume: () => void;
  setEnabled: (on: boolean) => void;
  enabled: () => boolean;
  dispose: () => void;
}

export function createAmbience(): Ambience {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let windGain: GainNode | null = null;
  let birdTimer: number | null = null;
  let on = true;
  let started = false;

  const build = () => {
    if (ctx) return;
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = on ? 0.5 : 0;
    master.connect(ctx.destination);

    // Wind: brown-ish noise through a slowly modulated low-pass.
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 480;
    windGain = ctx.createGain();
    windGain.gain.value = 0.35;
    noise.connect(windFilter).connect(windGain).connect(master);
    noise.start();

    // Slow LFO on the wind cutoff for gusting.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    lfo.start();

    scheduleBird();
  };

  const scheduleBird = () => {
    birdTimer = window.setTimeout(() => {
      if (ctx && master && on) chirp();
      scheduleBird();
    }, 2500 + Math.random() * 6000);
  };

  const chirp = () => {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const notes = 2 + Math.floor(Math.random() * 3);
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(master);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const baseF = 1600 + Math.random() * 1400;
    osc.frequency.setValueAtTime(baseF, t);
    osc.connect(gain);
    for (let n = 0; n < notes; n += 1) {
      const nt = t + n * 0.12;
      osc.frequency.setValueAtTime(baseF * (0.9 + Math.random() * 0.5), nt);
      gain.gain.setValueAtTime(0.0001, nt);
      gain.gain.exponentialRampToValueAtTime(0.09, nt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, nt + 0.1);
    }
    osc.start(t);
    osc.stop(t + notes * 0.12 + 0.15);
  };

  const resume = () => {
    build();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    started = true;
  };

  const setEnabled = (next: boolean) => {
    on = next;
    if (!started && next) resume();
    if (master && ctx) master.gain.setTargetAtTime(next ? 0.5 : 0, ctx.currentTime, 0.2);
  };

  const dispose = () => {
    if (birdTimer) window.clearTimeout(birdTimer);
    void ctx?.close();
    ctx = null;
    master = null;
    windGain = null;
  };

  return { resume, setEnabled, enabled: () => on, dispose };
}
