export interface FooterColumn {
	title: string;
	links: { label: string; href: string }[];
}

export const footerColumns: FooterColumn[] = [
	{
		title: 'Shop',
		links: [
			{ label: 'Keyboards', href: '#' },
			{ label: 'Switches', href: '#' },
			{ label: 'Keycaps', href: '#' },
			{ label: 'Accessories', href: '#' },
		],
	},
	{
		title: 'Company',
		links: [
			{ label: 'About', href: '#' },
			{ label: 'Build Custom', href: '#' },
			{ label: 'Journal', href: '#' },
		],
	},
	{
		title: 'Support',
		links: [
			{ label: 'Shipping', href: '#' },
			{ label: 'Warranty', href: '#' },
			{ label: 'Returns', href: '#' },
			{ label: 'Contact', href: '#' },
		],
	},
];

export const legalLinks = [
	{ label: 'Privacy', href: '#' },
	{ label: 'Terms', href: '#' },
];
