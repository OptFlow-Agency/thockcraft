import type { ImageMetadata } from 'astro';
import keycaps from '../assets/layers/keycaps.svg';
import switches from '../assets/layers/switches.svg';
import plate from '../assets/layers/switch-plate.svg';
import pcb from '../assets/layers/pcb.svg';
import bottomCase from '../assets/layers/base.svg';

/**
 * Layers are the Figma SVG exports (already flipped/rotated to share one perspective).
 *
 * Diagram space is 2000 x 1300. Layer placement is in percent of that frame;
 * labelY and target are in diagram units. Parts are ordered top to bottom —
 * on scroll they are revealed bottom to top (case first).
 */
export const FRAME = { width: 2000, height: 1300 };

export interface AnatomyPart {
	name: string;
	description: string;
	layer: ImageMetadata;
	/** Position/size of the layer image in percent of the diagram frame */
	placement: { left: number; top: number; width: number };
	/** Label height in diagram units */
	labelY: number;
	/** Where the leader line lands on the layer, in diagram units */
	target: [number, number];
}

export const anatomyParts: AnatomyPart[] = [
	{
		name: 'Keycaps',
		description: 'The cream and dark gray plastic caps that you touch to type',
		layer: keycaps,
		placement: { left: 2.34, top: -3.96, width: 55.69 },
		labelY: 150,
		target: [846, 234],
	},
	{
		name: 'Switches',
		description:
			'The individual mechanical switches (with light beige housings and stems) that register keypresses',
		layer: switches,
		placement: { left: 7.57, top: 12.06, width: 45.71 },
		labelY: 410,
		target: [912, 420],
	},
	{
		name: 'Switch Plate',
		description: 'The metallic/champagne-colored plate that holds the switches in place for stability.',
		layer: plate,
		placement: { left: 3.15, top: 17.45, width: 53.51 },
		labelY: 670,
		target: [924, 546],
	},
	{
		name: 'PCB(Printed Circuit Board)',
		description:
			'The black circuit board containing hot-swap sockets, traces, and the USB-C port that processes key signals.',
		layer: pcb,
		placement: { left: 5.78, top: 33.16, width: 48.3 },
		labelY: 930,
		target: [888, 696],
	},
	{
		name: 'Case (Base)',
		description: 'The outer wooden bottom housing that holds all the internal components.',
		layer: bottomCase,
		placement: { left: 1.42, top: 39.87, width: 57.06 },
		labelY: 1190,
		target: [954, 858],
	},
];
