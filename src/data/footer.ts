export interface FooterColumn {
	title: string;
	links: { label: string; href: string }[];
}

export const footerColumns: FooterColumn[] = [
	{
		title: 'Shop',
		links: [
			{ label: 'Keyboards', href: '/keyboards' },
			{ label: 'Switches', href: '/switches' },
			{ label: 'Keycaps', href: '/keycaps' },
			{ label: 'Accessories', href: '/accessories' },
		],
	},
	{
		title: 'Company',
		links: [
			{ label: 'About', href: '/about' },
			{ label: 'Build Custom', href: '/custom' },
			{ label: 'Journal', href: '/journal' },
		],
	},
	{
		title: 'Support',
		links: [
			{ label: 'Shipping', href: '/shipping' },
			{ label: 'Warranty', href: '/warranty' },
			{ label: 'Returns', href: '/returns' },
			{ label: 'Contact', href: '/contact' },
		],
	},
];

export const legalLinks = [
	{ label: 'Privacy', href: '/privacy' },
	{ label: 'Terms', href: '/terms' },
];
