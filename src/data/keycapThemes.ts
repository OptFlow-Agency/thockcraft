export interface KeycapColors {
	/** Keycap color */
	base: string;
	/** Printed legend / icon color */
	legend: string;
}

export interface KeycapTheme {
	id: string;
	name: string;
	/** Letters, numbers, punctuation, space */
	alpha: KeycapColors;
	/** Tab, Caps, Shift, Ctrl, Meta, Alt, Menu */
	mod: KeycapColors;
	/** Enter, Backspace and the top-left key */
	accent: KeycapColors;
	/** Case color */
	case: string;
}

export const keycapThemes: KeycapTheme[] = [
	{
		id: 'forest',
		name: 'Forest',
		alpha: { base: '#ecdcc4', legend: '#4c6444' },
		mod: { base: '#4c6444', legend: '#ecdcc4' },
		accent: { base: '#4c6444', legend: '#ecdcc4' },
		case: '#26302a',
	},
	{
		id: 'walnut',
		name: 'Walnut',
		alpha: { base: '#ecdcc4', legend: '#5a3a22' },
		mod: { base: '#5a3a22', legend: '#ecdcc4' },
		accent: { base: '#c9a27a', legend: '#3a2414' },
		case: '#4a2f1c',
	},
	{
		id: 'midnight',
		name: 'Midnight',
		alpha: { base: '#34363d', legend: '#e6e1d6' },
		mod: { base: '#1d1e22', legend: '#c9a27a' },
		accent: { base: '#c9a27a', legend: '#1d1e22' },
		case: '#17181c',
	},
	{
		id: 'sakura',
		name: 'Sakura',
		alpha: { base: '#f6e6e6', legend: '#8a5a6a' },
		mod: { base: '#d9a3b0', legend: '#6b3a4a' },
		accent: { base: '#8a5a6a', legend: '#f6e6e6' },
		case: '#6b4452',
	},
	{
		id: 'graphite',
		name: 'Graphite',
		alpha: { base: '#d9d9dc', legend: '#2a2a2e' },
		mod: { base: '#2a2a2e', legend: '#d9d9dc' },
		accent: { base: '#e5532d', legend: '#ffffff' },
		case: '#f2f1ee',
	},
];

export const defaultThemeId = 'forest';
