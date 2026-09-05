import type { Soundscape } from "./world/types";

/** The audible controls that must differ between every ruin. */
export function soundscapeSignature(profile: Soundscape): string {
  return [
    profile.wind,
    profile.water,
    profile.hum,
    profile.birds,
    profile.tone,
    profile.detail,
  ].join(":");
}

function soundscapeSeed(profile: Soundscape): number {
  let seed = 2166136261;
  for (const character of `${profile.name}:${soundscapeSignature(profile)}`) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

const DEFAULT: Soundscape = {
  name: "Fortress wind",
  wind: 0.24,
  water: 0,
  hum: 0.01,
  birds: 0.7,
  tone: 220,
  detail: "fortress",
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
    filter: BiquadFilterNode | null = null,
    wash: BiquadFilterNode | null = null;
  let profile = DEFAULT,
    on = true,
    quiet = false,
    disposed = false,
    timer: number | undefined,
    detailStep = 0;
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
    const seed = soundscapeSeed(profile);
    filter?.frequency.setTargetAtTime(
      250 + profile.wind * 1800 + (seed % 240),
      t,
      1.8,
    );
    wash?.frequency.setTargetAtTime(760 + (seed % 820), t, 1.8);
  };
  const note = (
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    slide = frequency,
    delay = 0,
  ) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      pan = ctx.createStereoPanner();
    const t = ctx.currentTime + delay;
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
  const noiseHit = (
    frequency: number,
    duration: number,
    volume: number,
    delay = 0,
    q = 1.2,
  ) => {
    if (!ctx || !master || !buffer) return;
    const source = ctx.createBufferSource(),
      hitFilter = ctx.createBiquadFilter(),
      gain = ctx.createGain(),
      pan = ctx.createStereoPanner(),
      t = ctx.currentTime + delay;
    source.buffer = buffer;
    hitFilter.type = "bandpass";
    hitFilter.frequency.value = frequency;
    hitFilter.Q.value = q;
    pan.pan.value = (Math.random() - 0.5) * 1.6;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(hitFilter).connect(gain).connect(pan).connect(master);
    source.start(t);
    source.stop(t + duration + 0.04);
    source.onended = () => {
      source.disconnect();
      hitFilter.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
  };
  const detail = () => {
    if (disposed) return;
    const seed = soundscapeSeed(profile);
    const step = detailStep++;
    const pitch = 0.84 + ((seed >>> step % 16) & 15) / 45;
    if (ctx?.state === "running" && on && !document.hidden) {
      const tone = profile.tone * pitch;
      switch (profile.detail) {
        case "fortress":
          note(tone, 2.9, 0.065);
          note(tone * 2.76, 1.7, 0.024, "sine", tone * 2.7, 0.06);
          break;
        case "depot":
          noiseHit(1150, 0.18, 0.075);
          note(tone, 1.1, 0.05, "triangle", tone * 0.91, 0.03);
          note(tone * 1.48, 0.32, 0.022, "square", tone * 1.2, 0.18);
          break;
        case "river":
          noiseHit(820, 1.4, 0.035, 0, 0.45);
          note(tone * 3.4, 0.16, 0.04, "sine", tone * 4.5, 0.15);
          note(tone * 3.9, 0.13, 0.026, "sine", tone * 4.8, 0.34);
          break;
        case "office":
          note(tone * 1.5, 1.15, 0.035, "sawtooth", tone * 0.55);
          noiseHit(460, 0.11, 0.035, 0.92, 2.5);
          break;
        case "vault":
          for (const delay of [0, 0.34, 0.86])
            note(tone * 4.2, 0.22, 0.055, "sine", tone * 1.4, delay);
          break;
        case "bazaar":
          for (const [index, delay] of [0, 0.11, 0.27, 0.52].entries())
            note(tone * (1 - index * 0.08), 0.13, 0.05, "triangle", tone * 0.32, delay);
          break;
        case "courtyard":
          note(tone * 0.72, 0.38, 0.04, "sine", tone * 0.48);
          note(tone * 0.82, 0.42, 0.035, "sine", tone * 0.52, 0.44);
          note(tone * 6.2, 0.11, 0.02, "sine", tone * 7.1, 0.75);
          break;
        case "workshop":
          for (const [ratio, delay] of [[1, 0], [1.5, 0.08], [2.18, 0.18]] as const)
            note(tone * ratio, 1.8 - delay, 0.038, "triangle", tone * ratio * 0.98, delay);
          break;
        case "jeweller":
          for (const [ratio, delay] of [[2, 0], [2.5, 0.16], [3, 0.34], [4, 0.58]] as const)
            note(tone * ratio, 0.75, 0.023, "sine", tone * ratio * 1.015, delay);
          break;
        case "salvage":
          noiseHit(680, 0.65, 0.07, 0, 2.8);
          for (const delay of [0.04, 0.16, 0.31, 0.49])
            note(tone * (1.2 + delay), 0.16, 0.032, "square", tone * 0.7, delay);
          break;
        case "kitchen":
          for (const [ratio, delay] of [[2.7, 0], [3.9, 0.13], [3.1, 0.28]] as const)
            note(tone * ratio, 0.3, 0.035, "triangle", tone * ratio * 0.88, delay);
          break;
        case "waterworks":
          noiseHit(620, 1.8, 0.045, 0, 0.4);
          for (const delay of [0, 0.62, 1.24])
            note(tone * 0.55, 0.2, 0.045, "sine", tone * 0.42, delay);
          break;
        case "station":
          note(tone * 1.7, 2.4, 0.045, "triangle", tone * 1.28);
          note(tone * 2.05, 1.8, 0.025, "sine", tone * 1.72, 0.16);
          noiseHit(1500, 0.09, 0.04, 1.25, 4);
          break;
        case "mandi":
          noiseHit(1250, 0.32, 0.035, 0, 0.7);
          note(tone * 11, 0.14, 0.032, "sine", tone * 15, 0.18);
          note(tone * 13, 0.12, 0.025, "sine", tone * 16, 0.43);
          break;
        case "landfill":
          noiseHit(330, 2.1, 0.06, 0, 0.35);
          note(tone, 0.75, 0.038, "square", tone * 0.7, 0.72);
          break;
        case "sorting":
          noiseHit(980, 0.7, 0.055, 0, 3.2);
          for (const delay of [0.04, 0.12, 0.22, 0.36, 0.57])
            note(tone * 2.2, 0.09, 0.024, "triangle", tone * 1.1, delay);
          break;
        case "concourse":
          note(tone * 0.5, 2.4, 0.04, "square", tone * 0.505);
          for (const delay of [0.28, 0.56, 0.84])
            note(tone * 2.02, 0.07, 0.018, "square", tone * 1.98, delay);
          break;
        case "woodland":
          for (const delay of [0, 0.09, 0.18, 0.43, 0.52])
            note(tone * 5.5, 0.07, 0.025, "sine", tone * 6.3, delay);
          note(tone * 3.4, 0.17, 0.028, "sine", tone * 4.6, 0.75);
          break;
        case "stepwell":
          noiseHit(900, 1.2, 0.038, 0, 0.5);
          for (const [ratio, delay] of [[2.8, 0], [2.1, 0.27], [3.4, 0.68], [1.7, 1.05]] as const)
            note(tone * ratio, 0.25, 0.045, "sine", tone * ratio * 0.42, delay);
          break;
        case "bridge":
          noiseHit(460, 2.5, 0.045, 0, 0.3);
          note(tone, 2.8, 0.04, "sine", tone * 1.04);
          note(tone * 1.5, 2.3, 0.026, "triangle", tone * 1.46, 0.18);
          break;
      }
      if (
        profile.birds > 0.5 &&
        !["river", "courtyard", "mandi", "woodland"].includes(profile.detail) &&
        Math.random() < profile.birds * 0.35
      )
        note(tone * 7, 0.14, 0.025, "sine", tone * 10, 0.55);
    }
    timer = window.setTimeout(
      detail,
      2200 + (seed % 1400) + ((step * 613) % 900) + Math.random() * 500,
    );
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
    wash = ctx.createBiquadFilter();
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
      detailStep = 0;
      mix();
      if (ctx) {
        window.clearTimeout(timer);
        detail();
      }
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
