import { keyMeta } from '../../data/keyboardLayout';
import type { SwitchSound } from '../../data/switches';
import { specialFor, type SampleBank } from './samples';

export type KeyEvent = 'down' | 'up';

const MAX_VOICES = 16;

/**
 * Synthesizes keystrokes with Web Audio — no samples.
 * Each press layers: a pitch-dropping sine body (the "thock"), a band-passed
 * noise burst (plastic on plate), and optionally a tactile bump, a click, and a
 * stabilizer rattle for wide keys. Every press is slightly randomized.
 */
export class KeySynth {
	private ctx: AudioContext | null = null;
	private master!: GainNode;
	private noise!: AudioBuffer;
	private voices = 0;
	private volume = 0.7;
	private muted = false;

	/** Creates/resumes the AudioContext. The first call must happen inside a user gesture. */
	unlock(): boolean {
		if (!this.ctx) {
			const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
			if (!Ctor) return false;
			const ctx: AudioContext = new Ctor({ latencyHint: 'interactive' });

			const limiter = ctx.createDynamicsCompressor();
			limiter.threshold.value = -14;
			limiter.knee.value = 20;
			limiter.ratio.value = 6;
			limiter.attack.value = 0.003;
			limiter.release.value = 0.12;

			this.master = ctx.createGain();
			this.master.connect(limiter).connect(ctx.destination);

			// One second of white noise, reused (at a random offset) by every voice
			this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
			const data = this.noise.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

			this.ctx = ctx;
			this.applyVolume();
		}
		if (this.ctx.state === 'suspended') void this.ctx.resume();
		return true;
	}

	get ready() {
		return this.ctx !== null;
	}

	setVolume(v: number) {
		this.volume = v;
		this.applyVolume();
	}

	setMuted(m: boolean) {
		this.muted = m;
		this.applyVolume();
	}

	suspend() {
		if (this.ctx?.state === 'running') void this.ctx.suspend();
	}

	resume() {
		if (this.ctx?.state === 'suspended') void this.ctx.resume();
	}

	private applyVolume() {
		if (!this.ctx) return;
		// Squared for a perceptually even slider
		const target = this.muted ? 0 : this.volume * this.volume;
		this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.01);
	}

	get context() {
		return this.ctx;
	}

	/** Per-voice bus: level + stereo position from the key's place on the board */
	private createBus(ctx: AudioContext, level: number, code: string) {
		const bus = ctx.createGain();
		bus.gain.value = level;
		const meta = keyMeta.get(code);
		if (ctx.createStereoPanner && meta) {
			const pan = ctx.createStereoPanner();
			pan.pan.value = (meta.x / 16 - 0.5) * 0.7;
			bus.connect(pan).connect(this.master);
		} else {
			bus.connect(this.master);
		}
		return bus;
	}

	private lastVariant = -1;

	/** Plays a recorded keystroke. Returns false if nothing was played so the caller can fall back to the synth. */
	playSample(bank: SampleBank, code: string, kind: KeyEvent): boolean {
		const ctx = this.ctx;
		if (!ctx) return false;
		if (this.muted || this.volume === 0 || this.voices >= MAX_VOICES) return true; // silent on purpose, don't fall back

		const special = specialFor(bank, code);
		let buffer: AudioBuffer | null;
		if (kind === 'down') {
			if (special?.press) {
				buffer = special.press;
			} else {
				// Round-robin through the press variants, never the same one twice in a row
				let i = Math.floor(Math.random() * bank.press.length);
				if (bank.press.length > 1 && i === this.lastVariant) i = (i + 1) % bank.press.length;
				this.lastVariant = i;
				buffer = bank.press[i];
			}
		} else {
			buffer = special?.release ?? bank.release;
		}
		if (!buffer) return false;

		const rand = (spread: number) => 1 + (Math.random() * 2 - 1) * spread;
		const src = ctx.createBufferSource();
		src.buffer = buffer;
		src.playbackRate.value = rand(0.03);
		const bus = this.createBus(ctx, rand(0.06), code);
		src.connect(bus);

		this.voices++;
		src.onended = () => {
			bus.disconnect();
			this.voices--;
		};
		src.start();
		return true;
	}

	play(s: SwitchSound, code: string, kind: KeyEvent) {
		const ctx = this.ctx;
		if (!ctx || this.muted || this.volume === 0 || this.voices >= MAX_VOICES) return;

		const meta = keyMeta.get(code);
		const down = kind === 'down';
		const big = !!meta && meta.w >= 2;
		const rand = (spread: number) => 1 + (Math.random() * 2 - 1) * spread;
		// Upper rows ring slightly higher; wide keys sit lower
		const pitch = rand(0.05) * (meta ? 1 + (2 - meta.row) * 0.02 : 1) * (big ? 0.82 : 1);
		const level = (down ? 1 : s.upGain) * rand(0.08);

		const t = ctx.currentTime;
		// A tactile bump lands just before the key bottoms out
		const lag = down && s.bumpGain > 0 ? 0.012 : 0;

		const bus = this.createBus(ctx, level, code);

		this.voices++;
		let live = 0;
		const run = (src: AudioScheduledSourceNode, start: number, stop: number, offset?: number) => {
			live++;
			src.onended = () => {
				if (--live > 0) return;
				bus.disconnect();
				this.voices--;
			};
			if (offset === undefined) src.start(start);
			else (src as AudioBufferSourceNode).start(start, offset);
			src.stop(stop);
		};

		/** Gain envelope: instant attack, exponential-ish decay with time constant `decay / 3` */
		const envelope = (peak: number, decay: number, at: number) => {
			const g = ctx.createGain();
			g.gain.setValueAtTime(0, at);
			g.gain.linearRampToValueAtTime(peak, at + 0.0015);
			g.gain.setTargetAtTime(0, at + 0.0015, decay / 3);
			g.connect(bus);
			return g;
		};

		const tone = (type: OscillatorType, freq: number, drop: number, peak: number, decay: number, at: number) => {
			const osc = ctx.createOscillator();
			osc.type = type;
			osc.frequency.setValueAtTime(freq * drop, at);
			if (drop !== 1) osc.frequency.exponentialRampToValueAtTime(freq, at + 0.035);
			osc.connect(envelope(peak, decay, at));
			run(osc, at, at + decay * 2 + 0.01);
			return osc;
		};

		const burst = (filterType: BiquadFilterType, freq: number, q: number, peak: number, decay: number, at: number) => {
			const src = ctx.createBufferSource();
			src.buffer = this.noise;
			const filter = ctx.createBiquadFilter();
			filter.type = filterType;
			filter.frequency.value = freq;
			filter.Q.value = q;
			src.connect(filter).connect(envelope(peak, decay, at));
			run(src, at, at + decay * 2 + 0.01, Math.random() * 0.8);
		};

		// Body: the "thock", through a lowpass that sets how deep/creamy it is
		{
			const decay = s.bodyDecay * (down ? 1 : 0.6) * (big ? 1.4 : 1);
			const freq = s.bodyFreq * pitch * (down ? 1 : 1.25);
			const osc = ctx.createOscillator();
			osc.type = 'sine';
			const at = t + lag;
			osc.frequency.setValueAtTime(freq * 1.6, at);
			osc.frequency.exponentialRampToValueAtTime(freq, at + 0.035);
			const lp = ctx.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.value = s.bodyCutoff * pitch;
			osc.connect(lp).connect(envelope(s.bodyGain * (down ? 1 : 0.7), decay, at));
			run(osc, at, at + decay * 2 + 0.01);
		}

		// Plastic-on-plate noise
		burst('bandpass', s.noiseFreq * pitch * (big ? 0.8 : 1), s.noiseQ, s.noiseGain * (down ? 1 : 0.7), s.noiseDecay, t + lag);

		// Tactile bump (press only)
		if (down && s.bumpGain > 0) tone('sine', s.bumpFreq * pitch, 1, s.bumpGain, 0.025, t);

		// Click: on press, and on release for clicky switches
		const click = down ? s.clickGain : s.clickGain * s.upClick;
		if (click > 0) {
			const f = s.clickFreq * rand(0.04) * (down ? 1 : 1.1);
			tone('sine', f, 1, click, 0.02, t);
			tone('sine', f * 1.5, 1, click * 0.5, 0.014, t);
			burst('highpass', 3000, 0.7, click * 0.35, 0.012, t);
		}

		// Stabilizer rattle on wide keys (and a faint metallic ping)
		if (big) {
			const at = t + 0.006;
			const amt = down ? 1 : 0.5;
			burst('bandpass', 1900, 2, 0.2 * amt, down ? 0.09 : 0.05, at);
			tone('triangle', 2300 * rand(0.03), 1, 0.035 * amt, 0.05, at);
			tone('triangle', 3100 * rand(0.03), 1, 0.025 * amt, 0.04, at);
		}
	}
}
