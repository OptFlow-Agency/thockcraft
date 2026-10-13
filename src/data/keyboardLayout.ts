export interface KeyDef {
	/** KeyboardEvent.code, so the layout works regardless of the user's keyboard language */
	code: string;
	label: string;
	/** Width in key units (1u = standard key) */
	w: number;
}

/** Every row is 16u wide (75% layout, matching the Nexus 75). */
export const ROW_UNITS = 16;

const k = (code: string, label: string, w = 1): KeyDef => ({ code, label, w });
const letters = (codes: string): KeyDef[] => [...codes].map((c) => k(`Key${c}`, c));
const digits = [...'1234567890'].map((d) => k(`Digit${d}`, d));
const fkeys = Array.from({ length: 12 }, (_, i) => k(`F${i + 1}`, `F${i + 1}`));

export const keyboardRows: KeyDef[][] = [
	[k('Escape', 'Esc'), ...fkeys, k('PrintScreen', 'Prt'), k('Insert', 'Ins'), k('Delete', 'Del')],
	[k('Backquote', '`'), ...digits, k('Minus', '-'), k('Equal', '='), k('Backspace', 'Back', 2), k('Home', 'Home')],
	[
		k('Tab', 'Tab', 1.5),
		...letters('QWERTYUIOP'),
		k('BracketLeft', '['),
		k('BracketRight', ']'),
		k('Backslash', '\\', 1.5),
		k('PageUp', 'PgUp'),
	],
	[
		k('CapsLock', 'Caps', 1.75),
		...letters('ASDFGHJKL'),
		k('Semicolon', ';'),
		k('Quote', "'"),
		k('Enter', 'Enter', 2.25),
		k('PageDown', 'PgDn'),
	],
	[
		k('ShiftLeft', 'Shift', 2.25),
		...letters('ZXCVBNM'),
		k('Comma', ','),
		k('Period', '.'),
		k('Slash', '/'),
		k('ShiftRight', 'Shift', 1.75),
		k('ArrowUp', '↑'),
		k('End', 'End'),
	],
	[
		k('ControlLeft', 'Ctrl', 1.25),
		k('MetaLeft', 'Meta', 1.25),
		k('AltLeft', 'Alt', 1.25),
		k('Space', '', 6.25),
		k('AltRight', 'Alt'),
		k('ContextMenu', 'Fn'),
		k('ControlRight', 'Ctrl'),
		k('ArrowLeft', '←'),
		k('ArrowDown', '↓'),
		k('ArrowRight', '→'),
	],
];

/** Keys that scroll the page by default; we stop that while the board is active. */
export const scrollKeys = new Set(['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

export const modifierCodes = new Set([
	'ShiftLeft',
	'ShiftRight',
	'ControlLeft',
	'ControlRight',
	'AltLeft',
	'AltRight',
	'MetaLeft',
	'MetaRight',
]);

/** Position of each key, used for stereo panning, pitch and stabilizer rattle (w >= 2u) */
export interface KeyMeta {
	row: number;
	/** Horizontal center in key units from the left edge */
	x: number;
	w: number;
}

export const keyMeta: Map<string, KeyMeta> = new Map();
keyboardRows.forEach((row, r) => {
	let x = 0;
	row.forEach(({ code, w }) => {
		keyMeta.set(code, { row: r, x: x + w / 2, w });
		x += w;
	});
});
