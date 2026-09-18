import { PlayerSettings } from "./playerSettings";
export const EQ_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
class AudioEngine {
  private ctx: AudioContext | null = null;
  private src: MediaElementAudioSourceNode | null = null;
  private pre: GainNode | null = null;
  private bands: BiquadFilterNode[] = [];
  private pan: StereoPannerNode | null = null;
  private analyser: AnalyserNode | null = null;
  private el: HTMLAudioElement | null = null;
  private fadeTimer: any = null;
  init(audio: HTMLAudioElement) {
    this.el = audio;
    try {
      audio.crossOrigin = "anonymous";
      if (!this.ctx) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.pre = this.ctx.createGain();
        this.bands = EQ_FREQS.map((f, i) => {
          const b = this.ctx!.createBiquadFilter();
          b.type = i === 0 ? "lowshelf" : i === EQ_FREQS.length - 1 ? "highshelf" : "peaking";
          b.frequency.value = f; b.Q.value = 1; b.gain.value = 0;
          return b;
        });
        this.pan = this.ctx.createStereoPanner();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.8;
        let node: AudioNode = this.pre;
        this.bands.forEach((b) => { node.connect(b); node = b; });
        node.connect(this.pan); this.pan.connect(this.analyser); this.analyser.connect(this.ctx.destination);
      }
      if (this.ctx && !this.src) {
        try { this.src = this.ctx.createMediaElementSource(audio); this.src.connect(this.pre!); } catch { /* already bound */ }
      }
    } catch { /* native fallback */ }
  }
  resume() { this.ctx?.resume().catch(() => {}); }
  updateSettings(s: Partial<PlayerSettings>) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.pre?.gain.setTargetAtTime(s.preamp ?? 1, t, 0.02);
    (s.eq ?? []).slice(0, 10).forEach((g, i) => this.bands[i]?.gain.setTargetAtTime(Math.max(-12, Math.min(12, g || 0)), t, 0.02));
    this.pan?.pan.setTargetAtTime(Math.max(-1, Math.min(1, s.stereoPan ?? 0)), t, 0.02);
  }
  getAnalyser() { return this.analyser; }
  estimateBPM(): number | null {
    try {
      const a = this.analyser; if (!a) return null;
      const buf = new Uint8Array(a.fftSize); a.getByteTimeDomainData(buf);
      let peaks = 0; let last = 0;
      for (let i = 1; i < buf.length - 1; i++) {
        if (buf[i] > 200 && buf[i] > buf[i - 1] && buf[i] >= buf[i + 1] && i - last > 12) { peaks++; last = i; }
      }
      if (!peaks) return null;
      const sr = this.ctx?.sampleRate || 44100;
      const sec = buf.length / sr;
      const bps = peaks / sec;
      const bpm = Math.round(bps * 60 / 2);
      return bpm >= 60 && bpm <= 200 ? bpm : null;
    } catch { return null; }
  }
  estimateKey(): string | null {
    try {
      const a = this.analyser; if (!a || !this.ctx) return null;
      const f = new Uint8Array(a.frequencyBinCount); a.getByteFrequencyData(f);
      const sr = this.ctx.sampleRate; let best = 0; let bi = -1;
      for (let i = 2; i < f.length; i++) if (f[i] > best) { best = f[i]; bi = i; }
      if (bi < 0 || best < 40) return null;
      const hz = (bi * sr) / (2 * f.length);
      const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const n = Math.round(12 * Math.log2(hz / 440)) + 69;
      return names[((n % 12) + 12) % 12];
    } catch { return null; }
  }
  private ramp(el: HTMLAudioElement, to: number, dur: number, done?: () => void) {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    if (dur <= 0) { el.volume = to; done?.(); return; }
    const from = el.volume; const t0 = performance.now();
    this.fadeTimer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / (dur * 1000));
      el.volume = Math.max(0, Math.min(1, from + (to - from) * p));
      if (p >= 1) { clearInterval(this.fadeTimer); this.fadeTimer = null; done?.(); }
    }, 40);
  }
  fadeIn(el: HTMLAudioElement, to: number, dur: number) { this.ramp(el, Math.max(0, Math.min(1, to)), dur); }
  fadeOut(el: HTMLAudioElement, dur: number, done?: () => void) { this.ramp(el, 0, dur, done); }
}
export const audioEngine = new AudioEngine();
