export interface Testimonial {
	quote: string;
	name: string;
	role: string;
}

// Placeholder copy — replace with real customer reviews before launch.
export const testimonials: Testimonial[] = [
	{
		quote: 'The Nexus 75 sounds unreal out of the box. I have not touched a single setting and it already feels custom.',
		name: 'Customer name',
		role: 'Software engineer',
	},
	{
		quote: 'Hot-swap sockets let me try three switch types in one afternoon. No soldering, no stress.',
		name: 'Customer name',
		role: 'Hobbyist builder',
	},
	{
		quote: 'Solid aluminum, clean typing sound, and the PBT caps still look new after months of daily use.',
		name: 'Customer name',
		role: 'Writer',
	},
	{
		quote: 'Packaging, build quality, tuning: everything arrived better than the photos. Easily the best board I have owned.',
		name: 'Customer name',
		role: 'Product designer',
	},
	{
		quote: 'QMK and VIA worked immediately. I remapped my layers in minutes and have not looked back.',
		name: 'Customer name',
		role: 'Developer',
	},
	{
		quote: 'The stabilizers are properly lubed from the factory. No rattle, no hollow ping, just a clean thock.',
		name: 'Customer name',
		role: 'Streamer',
	},
];
