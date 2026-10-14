// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			include: ['three', 'three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/environments/RoomEnvironment.js'],
		},
	},
});
