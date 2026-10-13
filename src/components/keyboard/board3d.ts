import {
	ACESFilmicToneMapping,
	BufferGeometry,
	CanvasTexture,
	Box3,
	Color,
	Group,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	PerspectiveCamera,
	PlaneGeometry,
	PMREMGenerator,
	Raycaster,
	Scene,
	Vector2,
	Vector3,
	WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { KeycapTheme } from '../../data/keycapThemes';
import modelUrl from '../../assets/custom_-_mechanical_keyboard.glb?url';

/**
 * The model is a 60% ANSI board whose keycaps are merged into one mesh. Each keycap is
 * five separate pieces (top + four sides), so we split the mesh into per-key meshes by
 * connected piece, then name each key by its position in the layout below.
 */
const LAYOUT_60: string[][] = [
	['Backquote', ...[...'1234567890'].map((d) => `Digit${d}`), 'Minus', 'Equal', 'Backspace'],
	['Tab', ...[...'QWERTYUIOP'].map((c) => `Key${c}`), 'BracketLeft', 'BracketRight', 'Backslash'],
	['CapsLock', ...[...'ASDFGHJKL'].map((c) => `Key${c}`), 'Semicolon', 'Quote', 'Enter'],
	['ShiftLeft', ...[...'ZXCVBNM'].map((c) => `Key${c}`), 'Comma', 'Period', 'Slash', 'ShiftRight'],
	['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight'],
];

// Model units (the mesh's own space, where one key pitch is ~10.8)
const TOP_MIN_SIZE = 6.5; // a keycap's top face is wider than this in x and y; the sides are slivers
const ROW_GAP = 5.4; // half a key pitch: tops further apart in y than this are on different rows
const KEY_TRAVEL = 3.4; // how far a key sinks when pressed

// The two colors painted into the model's keycap texture. Keycap pixels are remapped along the
// line between them, so the base color and the legends (which use the other color) both recolor.
const SOURCE_CREAM = '#ecdcc4';
const SOURCE_GREEN = '#4c6444';
const SOURCE_CASE = '#263124'; // average color of the case texture
const MOD_CODES = new Set(['Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight', 'ContextMenu']);
const ACCENT_CODES = new Set(['Enter', 'Backspace', 'Backquote']);
type KeyGroup = 'alpha' | 'mod' | 'accent';
const groupOf = (code: string): KeyGroup => (ACCENT_CODES.has(code) ? 'accent' : MOD_CODES.has(code) ? 'mod' : 'alpha');

/** A copy of `source` whose texture colors can be remapped through the `lo`/`hi` colors. */
function recolorableMaterial(source: MeshStandardMaterial) {
	const material = source.clone();
	// Start as the identity mapping (original colors) until a theme is applied
	const lo = new Color(SOURCE_GREEN);
	const hi = new Color(SOURCE_CREAM);
	const srcLo = new Color(SOURCE_GREEN);
	const srcHi = new Color(SOURCE_CREAM);
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, { uLo: { value: lo }, uHi: { value: hi }, uSrcLo: { value: srcLo }, uSrcHi: { value: srcHi } });
		shader.fragmentShader =
			'uniform vec3 uLo;\nuniform vec3 uHi;\nuniform vec3 uSrcLo;\nuniform vec3 uSrcHi;\n' +
			shader.fragmentShader.replace(
				'#include <map_fragment>',
				`#include <map_fragment>
				#ifdef USE_MAP
				{
					vec3 axis = uSrcHi - uSrcLo;
					float f = clamp(dot(sampledDiffuseColor.rgb - uSrcLo, axis) / dot(axis, axis), 0.0, 1.0);
					diffuseColor.rgb = mix(uLo, uHi, f);
				}
				#endif`,
			);
	};
	material.customProgramCacheKey = () => 'keycap-remap';
	return { material, lo, hi };
}

interface Island {
	tris: number[];
	min: [number, number];
	max: [number, number];
	cx: number;
	cy: number;
}

/** Groups triangles into connected pieces (keys' tops and sides aren't connected to each other). */
function findIslands(geometry: BufferGeometry): Island[] {
	const pos = geometry.getAttribute('position');
	const index = geometry.getIndex()!.array;
	const parent = new Int32Array(pos.count);
	for (let i = 0; i < parent.length; i++) parent[i] = i;
	const find = (x: number) => {
		while (parent[x] !== x) x = parent[x] = parent[parent[x]];
		return x;
	};
	for (let t = 0; t < index.length; t += 3) {
		const a = find(index[t]);
		for (const v of [index[t + 1], index[t + 2]]) {
			const r = find(v);
			if (r !== a) parent[r] = a;
		}
	}

	const islands = new Map<number, Island>();
	for (let v = 0; v < pos.count; v++) {
		const r = find(v);
		let isl = islands.get(r);
		if (!isl) islands.set(r, (isl = { tris: [], min: [Infinity, Infinity], max: [-Infinity, -Infinity], cx: 0, cy: 0 }));
		const x = pos.getX(v);
		const y = pos.getY(v);
		isl.min[0] = Math.min(isl.min[0], x);
		isl.min[1] = Math.min(isl.min[1], y);
		isl.max[0] = Math.max(isl.max[0], x);
		isl.max[1] = Math.max(isl.max[1], y);
	}
	for (let t = 0; t < index.length; t += 3) {
		islands.get(find(index[t]))!.tris.push(index[t], index[t + 1], index[t + 2]);
	}
	for (const isl of islands.values()) {
		isl.cx = (isl.min[0] + isl.max[0]) / 2;
		isl.cy = (isl.min[1] + isl.max[1]) / 2;
	}
	return [...islands.values()];
}

interface KeyState {
	mesh: Mesh;
	base: Vector3;
	/** Parent-space offset for a fully pressed key */
	travel: Vector3;
	value: number;
	target: number;
}

export interface Board3D {
	setPressed(code: string, pressed: boolean): void;
	setTheme(theme: KeycapTheme): void;
}

export interface Board3DOptions {
	/** Called when the user presses a 3D key with a mouse/finger */
	onPointerPress(code: string, pointerId: number): void;
}

/** Builds the 3D board inside `container`. Resolves to null if WebGL or the model isn't usable. */
export async function createBoard3D(container: HTMLElement, { onPointerPress }: Board3DOptions): Promise<Board3D | null> {
	let renderer: WebGLRenderer;
	try {
		renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
	} catch {
		return null;
	}
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.toneMapping = ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;

	const scene = new Scene();
	const pmrem = new PMREMGenerator(renderer);
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

	const gltf = await new GLTFLoader().loadAsync(modelUrl).catch(() => null);
	if (!gltf) {
		renderer.dispose();
		return null;
	}

	// --- Split the merged keycap mesh into one mesh per key -------------------------------
	let keyMesh: Mesh | null = null;
	let maxIslands = 0;
	const meshes: Mesh[] = [];
	gltf.scene.traverse((o) => (o as Mesh).isMesh && meshes.push(o as Mesh));
	const islandsByMesh = new Map<Mesh, Island[]>();
	for (const m of meshes) {
		const islands = findIslands(m.geometry);
		islandsByMesh.set(m, islands);
		if (islands.length > maxIslands) {
			maxIslands = islands.length;
			keyMesh = m;
		}
	}

	const tops = islandsByMesh
		.get(keyMesh!)
		?.filter((i) => i.max[0] - i.min[0] > TOP_MIN_SIZE && i.max[1] - i.min[1] > TOP_MIN_SIZE)
		.sort((a, b) => b.cy - a.cy);
	const rows: Island[][] = [];
	tops?.forEach((t) => {
		const last = rows[rows.length - 1];
		if (last && last[0].cy - t.cy <= ROW_GAP) last.push(t);
		else rows.push([t]);
	});
	if (!keyMesh || rows.length !== LAYOUT_60.length || rows.some((r, i) => r.length !== LAYOUT_60[i].length)) {
		console.warn('3D keyboard: model layout not recognized, using 2D board');
		renderer.dispose();
		return null;
	}

	const keyTops = new Map<string, Island>();
	rows.forEach((row, r) => row.sort((a, b) => a.cx - b.cx).forEach((t, c) => keyTops.set(LAYOUT_60[r][c], t)));

	// Every side piece belongs to the key whose top is nearest
	const groups = new Map<string, number[]>([...keyTops.keys()].map((code) => [code, []]));
	const topSet = new Set(keyTops.values());
	for (const isl of islandsByMesh.get(keyMesh)!) {
		let best = '';
		let bestDist = Infinity;
		if (topSet.has(isl)) {
			best = [...keyTops].find(([, t]) => t === isl)![0];
		} else {
			for (const [code, t] of keyTops) {
				const dx = Math.max(t.min[0] - isl.cx, 0, isl.cx - t.max[0]);
				const dy = Math.max(t.min[1] - isl.cy, 0, isl.cy - t.max[1]);
				const d = Math.hypot(dx, dy);
				if (d < bestDist) [best, bestDist] = [code, d];
			}
		}
		const list = groups.get(best)!;
		for (const i of isl.tris) list.push(i);
	}

	const keys = new Map<string, KeyState>();
	const keyMeshes: Mesh[] = [];
	const source = keyMesh;
	const parent = source.parent!;
	// Local +z is "up" for the key mesh; a press moves along -z (in parent space, including its scale)
	const down = new Vector3(0, 0, -1).applyQuaternion(source.quaternion).multiply(source.scale).multiplyScalar(KEY_TRAVEL);
	// One recolorable material per key group (the case shares the original material and keeps its look)
	const recolor: Record<KeyGroup, ReturnType<typeof recolorableMaterial>> = {
		alpha: recolorableMaterial(source.material as MeshStandardMaterial),
		mod: recolorableMaterial(source.material as MeshStandardMaterial),
		accent: recolorableMaterial(source.material as MeshStandardMaterial),
	};
	// The wooden case texture is a near-flat dark green, so a color multiply recolors it
	const caseMaterials: MeshStandardMaterial[] = [];
	for (const m of meshes) {
		if (m === source || (m.material as MeshStandardMaterial).name !== 'Wood_00') continue;
		const material = (m.material as MeshStandardMaterial).clone();
		m.material = material;
		caseMaterials.push(material);
	}
	for (const [code, triangles] of groups) {
		const geometry = new BufferGeometry();
		for (const name of Object.keys(source.geometry.attributes)) geometry.setAttribute(name, source.geometry.getAttribute(name)); // shared, not copied
		geometry.setIndex(triangles);
		const mesh = new Mesh(geometry, recolor[groupOf(code)].material);
		mesh.position.copy(source.position);
		mesh.quaternion.copy(source.quaternion);
		mesh.scale.copy(source.scale);
		mesh.frustumCulled = false;
		mesh.userData.code = code;
		parent.add(mesh);
		keyMeshes.push(mesh);
		keys.set(code, { mesh, base: mesh.position.clone(), travel: down.clone(), value: 0, target: 0 });
	}
	parent.remove(source);

	// --- Scene ----------------------------------------------------------------------------
	const pivot = new Group(); // tilts with the pointer
	const centered = new Group();
	centered.add(gltf.scene);
	pivot.add(centered);
	scene.add(pivot);

	const bounds = new Box3().setFromObject(gltf.scene);
	const size = bounds.getSize(new Vector3());
	centered.position.copy(bounds.getCenter(new Vector3())).negate();

	// Soft contact shadow under the board
	const shadowCanvas = document.createElement('canvas');
	shadowCanvas.width = shadowCanvas.height = 128;
	const g = shadowCanvas.getContext('2d')!;
	const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
	grad.addColorStop(0, 'rgba(0,0,0,0.75)');
	grad.addColorStop(1, 'rgba(0,0,0,0)');
	g.fillStyle = grad;
	g.fillRect(0, 0, 128, 128);
	const shadow = new Mesh(
		new PlaneGeometry(size.x * 1.35, size.z * 1.9),
		new MeshBasicMaterial({ map: new CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
	);
	shadow.rotation.x = -Math.PI / 2;
	shadow.position.y = -size.y / 2 - size.y * 0.15;
	scene.add(shadow);

	const camera = new PerspectiveCamera(28, 1, 0.1, 1000);
	const ELEVATION = (54 * Math.PI) / 180;
	container.appendChild(renderer.domElement);
	Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block', touchAction: 'manipulation' });

	const fit = () => {
		const w = container.clientWidth;
		const h = container.clientHeight;
		if (!w || !h) return;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		const tanV = Math.tan((camera.fov * Math.PI) / 360);
		const tanH = tanV * camera.aspect;
		const projectedH = size.z * Math.sin(ELEVATION) + size.y * Math.cos(ELEVATION);
		const dist = Math.max((size.x * 0.58) / tanH, (projectedH * 0.6) / tanV);
		camera.position.set(0, Math.sin(ELEVATION) * dist, Math.cos(ELEVATION) * dist);
		camera.lookAt(0, 0, 0);
		// The model is hundreds of units wide, so the clip planes must scale with the camera distance
		camera.near = dist * 0.1;
		camera.far = dist * 10;
		camera.updateProjectionMatrix();
		invalidate();
	};

	// --- Render loop (only runs while something moves and the board is on screen) ---------
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
	let visible = false;
	let raf = 0;
	let last = 0;

	const tick = (now: number) => {
		raf = 0;
		const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
		last = now;
		let moving = false;

		for (const k of keys.values()) {
			if (k.value === k.target) continue;
			const rate = k.target > k.value ? 45 : 22; // quick down, slightly slower spring back
			k.value += (k.target - k.value) * (1 - Math.exp(-dt * rate));
			if (Math.abs(k.target - k.value) < 0.002) k.value = k.target;
			k.mesh.position.copy(k.base).addScaledVector(k.travel, k.value);
			moving ||= k.value !== k.target;
		}

		tilt.x += (tilt.tx - tilt.x) * (1 - Math.exp(-dt * 5));
		tilt.y += (tilt.ty - tilt.y) * (1 - Math.exp(-dt * 5));
		pivot.rotation.set(tilt.x, tilt.y, 0);
		moving ||= Math.abs(tilt.tx - tilt.x) > 0.0005 || Math.abs(tilt.ty - tilt.y) > 0.0005;

		renderer.render(scene, camera);
		if (moving) raf = requestAnimationFrame(tick);
	};
	function invalidate() {
		if (visible && !raf) raf = requestAnimationFrame(tick);
	}

	new ResizeObserver(fit).observe(container);
	new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		if (visible) invalidate();
		else if (raf) (cancelAnimationFrame(raf), (raf = 0));
	}).observe(container);

	// Subtle pointer-follow tilt (not on touch screens, not with reduced motion)
	if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
		window.addEventListener('pointermove', (e) => {
			if (!visible || e.pointerType !== 'mouse') return;
			const r = container.getBoundingClientRect();
			const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
			const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
			tilt.ty = nx * 0.1;
			tilt.tx = ny * 0.05;
			invalidate();
		});
	}

	// --- Clicking keys ----------------------------------------------------------------------
	const raycaster = new Raycaster();
	const ndc = new Vector2();
	renderer.domElement.addEventListener('pointerdown', (e) => {
		const r = renderer.domElement.getBoundingClientRect();
		ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
		raycaster.setFromCamera(ndc, camera);
		const hit = raycaster.intersectObjects(keyMeshes, false)[0];
		if (!hit) return;
		e.preventDefault();
		onPointerPress(hit.object.userData.code, e.pointerId);
	});

	fit();

	return {
		setTheme(theme) {
			for (const group of ['alpha', 'mod', 'accent'] as const) {
				const { base, legend } = theme[group];
				const { lo, hi } = recolor[group];
				// Letters are cream in the model (legend = green); modifiers and accents are green (legend = cream)
				if (group === 'alpha') (lo.set(legend), hi.set(base));
				else (lo.set(base), hi.set(legend));
			}
			const tint = new Color(theme.case);
			const source = new Color(SOURCE_CASE);
			tint.setRGB(tint.r / source.r, tint.g / source.g, tint.b / source.b);
			caseMaterials.forEach((m) => m.color.copy(tint));
			invalidate();
		},
		setPressed(code, pressed) {
			const key = keys.get(code);
			if (!key) return;
			key.target = pressed ? 1 : 0;
			invalidate();
		},
	};
}
