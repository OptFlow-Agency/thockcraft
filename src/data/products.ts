import type { ImageMetadata } from 'astro';
import nexus from '../assets/nexus.svg';
import phantom from '../assets/phantom.svg';

export interface Product {
	name: string;
	image: ImageMetadata;
	alt: string;
	href: string;
}

export const products: Product[] = [
	{
		name: 'Nexus 75 (Wireless Gasket-Mount Keyboard)',
		image: nexus,
		alt: 'Nexus 75 keyboard in white and blue',
		href: '/keyboards/nexus-75',
	},
	{
		name: 'Phantom 60 (Ultra-Compact Enthusiast Board)',
		image: phantom,
		alt: 'Phantom 60 keyboard in black and tan',
		href: '/keyboards/phantom-60',
	},
];
