/**
 * Loads Mechvibes-style "full travel" packs from /sounds/<pack>/:
 *   press/GENERIC_R0..R4.mp3, release/GENERIC.mp3, plus optional
 *   BACKSPACE / ENTER / SPACE files in both folders.
 */

const VARIANTS = 5;
const SPECIAL_NAMES = ['BACKSPACE', 'ENTER', 'SPACE'] as const;

/** KeyboardEvent.code → the pack's dedicated file name */
const SPECIAL_BY_CODE: Record<string, (typeof SPECIAL_NAMES)[number]> = {
	Backspace: 'BACKSPACE',
	Enter: 'ENTER',
	NumpadEnter: 'ENTER',
	Space: 'SPACE',
};

export interface SampleBank {
	press: AudioBuffer[];
	release: AudioBuffer | null;
	special: Map<string, { press: AudioBuffer | null; release: AudioBuffer | null }>;
}

const root = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/sounds`;
const pending = new Map<string, Promise<SampleBank | null>>();
const ready = new Map<string, SampleBank>();

const decode = async (ctx: AudioContext, url: string): Promise<AudioBuffer | null> => {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		return await ctx.decodeAudioData(await res.arrayBuffer());
	} catch {
		return null;
	}
};

const fetchBank = async (ctx: AudioContext, dir: string): Promise<SampleBank | null> => {
	const url = (path: string) => `${root}/${dir}/${path}`;
	const [press, release, special] = await Promise.all([
		Promise.all(Array.from({ length: VARIANTS }, (_, i) => decode(ctx, url(`press/GENERIC_R${i}.mp3`)))),
		decode(ctx, url('release/GENERIC.mp3')),
		Promise.all(
			SPECIAL_NAMES.map(async (name) => {
				const [p, r] = await Promise.all([decode(ctx, url(`press/${name}.mp3`)), decode(ctx, url(`release/${name}.mp3`))]);
				return [name, { press: p, release: r }] as const;
			}),
		),
	]);

	const variants = press.filter((b): b is AudioBuffer => b !== null);
	if (variants.length === 0) return null;
	return { press: variants, release, special: new Map(special) };
};

/** Starts loading a pack once; later calls reuse the same promise. */
export function loadBank(ctx: AudioContext, dir: string): Promise<SampleBank | null> {
	let bank = pending.get(dir);
	if (!bank) {
		bank = fetchBank(ctx, dir).then((b) => {
			if (b) ready.set(dir, b);
			return b;
		});
		pending.set(dir, bank);
	}
	return bank;
}

/** The pack if it has finished loading, otherwise undefined (caller falls back to the synth). */
export const getBank = (dir?: string): SampleBank | undefined => (dir ? ready.get(dir) : undefined);

export const specialFor = (bank: SampleBank, code: string) => {
	const name = SPECIAL_BY_CODE[code];
	return name ? bank.special.get(name) : undefined;
};
