export type SwitchType = 'linear' | 'tactile' | 'clicky';

/**
 * Parameters for the Web Audio synth (see keyboard-engine.ts).
 * Frequencies in Hz, times in seconds, gains are linear (0–1).
 */
export interface SwitchSound {
	/** Pitch of the "thock" body at rest; it drops from 1.6x to this on impact */
	bodyFreq: number;
	bodyDecay: number;
	bodyGain: number;
	/** Lowpass cutoff shaping the body — lower sounds deeper and creamier */
	bodyCutoff: number;
	/** Bottom-out noise (plastic on plate) */
	noiseFreq: number;
	noiseQ: number;
	noiseDecay: number;
	noiseGain: number;
	/** Tactile bump: small thump just before bottom-out (0 = none) */
	bumpGain: number;
	bumpFreq: number;
	/** Click jacket / click bar (0 = none) */
	clickGain: number;
	clickFreq: number;
	/** Key-release loudness relative to the press */
	upGain: number;
	/** Key-release click loudness relative to the press click (clicky switches click on release too) */
	upClick: number;
}

export interface SwitchProfile {
	id: string;
	name: string;
	type: SwitchType;
	/** Stem color shown on the picker card */
	color: string;
	description: string;
	/** Folder under public/sounds/ with recorded samples; without it the synth is used */
	samples?: string;
	/** Synth parameters — also the fallback while samples load */
	sound: SwitchSound;
}

export const switches: SwitchProfile[] = [
	{
		id: 'linear',
		samples: 'mxblack-travel',
		name: 'Linear',
		type: 'linear',
		color: '#b8362e',
		description: 'Smooth and quiet with no bump. Fast and fluid.',
		sound: {
			bodyFreq: 190,
			bodyDecay: 0.075,
			bodyGain: 0.8,
			bodyCutoff: 1800,
			noiseFreq: 2400,
			noiseQ: 0.9,
			noiseDecay: 0.03,
			noiseGain: 0.22,
			bumpGain: 0,
			bumpFreq: 0,
			clickGain: 0,
			clickFreq: 0,
			upGain: 0.45,
			upClick: 0,
		},
	},
	{
		id: 'tactile',
		samples: 'mxbrown-travel',
		name: 'Tactile',
		type: 'tactile',
		color: '#8a5a33',
		description: 'A soft bump at the actuation point you can feel and hear.',
		sound: {
			bodyFreq: 215,
			bodyDecay: 0.07,
			bodyGain: 0.7,
			bodyCutoff: 2200,
			noiseFreq: 2800,
			noiseQ: 1.1,
			noiseDecay: 0.03,
			noiseGain: 0.26,
			bumpGain: 0.5,
			bumpFreq: 420,
			clickGain: 0,
			clickFreq: 0,
			upGain: 0.5,
			upClick: 0,
		},
	},
	{
		id: 'clicky',
		samples: 'mxblue-travel',
		name: 'Clicky',
		type: 'clicky',
		color: '#2f6fb3',
		description: 'A sharp, high-pitched click on every press and release.',
		sound: {
			bodyFreq: 260,
			bodyDecay: 0.05,
			bodyGain: 0.5,
			bodyCutoff: 3200,
			noiseFreq: 4200,
			noiseQ: 1.4,
			noiseDecay: 0.025,
			noiseGain: 0.3,
			bumpGain: 0.25,
			bumpFreq: 520,
			clickGain: 0.75,
			clickFreq: 3600,
			upGain: 0.6,
			upClick: 0.55,
		},
	},
	{
		id: 'silent',
		name: 'Silent Linear',
		type: 'linear',
		color: '#3d3d42',
		description: 'Dampened stems for a muted, library-friendly sound.',
		sound: {
			bodyFreq: 150,
			bodyDecay: 0.05,
			bodyGain: 0.5,
			bodyCutoff: 900,
			noiseFreq: 1500,
			noiseQ: 0.7,
			noiseDecay: 0.02,
			noiseGain: 0.09,
			bumpGain: 0,
			bumpFreq: 0,
			clickGain: 0,
			clickFreq: 0,
			upGain: 0.3,
			upClick: 0,
		},
	},
	{
		id: 'creamy',
		samples: 'cream-travel',
		name: 'Creamy Thock',
		type: 'linear',
		color: '#e0c9a6',
		description: 'Lubed and tuned for a deep, rounded, marble-like thock.',
		sound: {
			bodyFreq: 125,
			bodyDecay: 0.13,
			bodyGain: 1,
			bodyCutoff: 1100,
			noiseFreq: 1700,
			noiseQ: 0.8,
			noiseDecay: 0.035,
			noiseGain: 0.12,
			bumpGain: 0,
			bumpFreq: 0,
			clickGain: 0,
			clickFreq: 0,
			upGain: 0.4,
			upClick: 0,
		},
	},
];

export const defaultSwitchId = 'creamy';
