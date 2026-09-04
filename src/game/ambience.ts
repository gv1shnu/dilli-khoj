import type { Soundscape } from "./world/types";

const DEFAULT: Soundscape = {
  name: "Fortress wind",
  wind: 0.24,
  water: 0,
  hum: 0.01,
  birds: 0.7,
  tone: 220,
  detail: "bell",
};
export interface Ambience {
  resume: () => void;
  setEnabled: (on: boolean) => void;
  enabled: () => boolean;
  setProfile: (profile: Soundscape) => void;
  setQuiet: (quiet: boolean) => void;
  footstep: (stone: boolean) => void;
  dispose: () => void;
}
/** Original procedural environmental audio. No recording downloads or external licenses. */
export function createAmbience(): Ambience {
  let ctx: AudioContext | null = null,
    master: GainNode | null = null;
  let wind: GainNode | null = null,
    water: GainNode | null = null,
    hum: GainNode | null = null;
  let humOsc: OscillatorNode | null = null,
    filter: BiquadFilterNode | null = null;
  let profile = DEFAULT,
    on = true,
    quiet = false,
    disposed = false,
    timer: number | undefined;
  let buffer: AudioBuffer | null = null;
  const volume = () => (on && !document.hidden ? (quiet ? 0.12 : 0.42) : 0);
  const mix = () => {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(volume(), t, 0.35);
    wind?.gain.setTargetAtTime(profile.wind, t, 1.8);
    water?.gain.setTargetAtTime(profile.water, t, 1.8);
    hum?.gain.setTargetAtTime(profile.hum, t, 1.8);
    humOsc?.frequency.setTargetAtTime(profile.tone / 4, t, 1.8);
    filter?.frequency.setTargetAtTime(250 + profile.wind * 1800, t, 1.8);
  };
  const note = (
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    slide = frequency,
  ) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      pan = ctx.createStereoPanner();
    const t = ctx.currentTime;
    pan.pan.value = (Math.random() - 0.5) * 1.5;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, slide),
      t + duration,
    );
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(pan).connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
  };
  const detail = () => {
    if (disposed) return;
    if (ctx?.state === "running" && on && !document.hidden) {
      if (Math.random() < profile.birds) {
        note(1800 + Math.random() * 900, 0.18, 0.045, "sine", 2800);
      } else
        switch (profile.detail) {
          case "bell":
            note(profile.tone, 2.8, 0.045);
            note(profile.tone * 2.76, 1.5, 0.013);
            break;
          case "metal":
            note(profile.tone, 1.1, 0.025, "triangle", profile.tone * 0.97);
            break;
          case "drip":
            note(profile.tone * 2, 0.16, 0.06, "sine", profile.tone);
            break;
          case "insects":
            note(profile.tone * 5, 0.6, 0.014, "sine", profile.tone * 5.02);
            break;
          case "wood":
            note(profile.tone, 0.15, 0.025, "triangle", profile.tone * 0.4);
            break;
          case "rail":
            note(profile.tone * 2, 1.8, 0.018, "triangle", profile.tone * 1.7);
            break;
        }
    }
    timer = window.setTimeout(detail, 3200 + Math.random() * 6500);
  };
  const build = () => {
    if (ctx || disposed) return;
    const Audio = window.AudioContext;
    if (!Audio) return;
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    wind = ctx.createGain();
    noise.connect(filter).connect(wind).connect(master);
    const wash = ctx.createBiquadFilter();
    wash.type = "bandpass";
    wash.frequency.value = 1100;
    wash.Q.value = 0.3;
    water = ctx.createGain();
    noise.connect(wash).connect(water).connect(master);
    noise.start();
    humOsc = ctx.createOscillator();
    humOsc.type = "sine";
    hum = ctx.createGain();
    humOsc.connect(hum).connect(master);
    humOsc.start();
    const gust = ctx.createOscillator(),
      depth = ctx.createGain();
    gust.frequency.value = 0.07;
    depth.gain.value = 120;
    gust.connect(depth).connect(filter.frequency);
    gust.start();
    mix();
    detail();
  };
  const visibility = () => mix();
  document.addEventListener("visibilitychange", visibility);
  const resume = () => {
    build();
    if (ctx?.state === "suspended") void ctx.resume();
  };
  return {
    resume,
    enabled: () => on,
    setEnabled: (next) => {
      on = next;
      if (next) resume();
      mix();
    },
    setProfile: (next) => {
      profile = next;
      mix();
    },
    setQuiet: (next) => {
      if (quiet !== next) {
        quiet = next;
        mix();
      }
    },
    footstep: (stone) => {
      if (on && !quiet && ctx?.state === "running")
        note(stone ? 95 : 65, 0.07, 0.025, "triangle", 35);
    },
    dispose: () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
      void ctx?.close();
      ctx = null;
      master = null;
      buffer = null;
    },
  };
}
