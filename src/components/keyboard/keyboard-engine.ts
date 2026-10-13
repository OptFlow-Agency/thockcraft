import { modifierCodes, scrollKeys } from '../../data/keyboardLayout';
import { defaultThemeId, keycapThemes } from '../../data/keycapThemes';
import { defaultSwitchId, switches } from '../../data/switches';
import type { Board3D } from './board3d';
import { getBank, loadBank } from './samples';
import { KeySynth, type KeyEvent } from './synth';

const STORE = { switch: 'thockcraft:switch', volume: 'thockcraft:volume', muted: 'thockcraft:muted', theme: 'thockcraft:theme' };

const read = (key: string) => {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
};
const write = (key: string, value: string) => {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* storage unavailable (private mode) — preferences just won't persist */
	}
};

const isTextEntry = (el: EventTarget | null) =>
	el instanceof HTMLElement &&
	(el.isContentEditable ||
		el instanceof HTMLTextAreaElement ||
		el instanceof HTMLSelectElement ||
		(el instanceof HTMLInputElement && !['radio', 'checkbox', 'range', 'button'].includes(el.type)));

const isInteractive = (el: EventTarget | null) =>
	el instanceof Element && !!el.closest('button, a, input, select, textarea, [role="radio"], [contenteditable]');

export function initSoundKeyboard(root: HTMLElement) {
	const board = root.querySelector<HTMLElement>('[data-board]');
	const stage = root.querySelector<HTMLElement>('[data-stage]');
	const board2d = root.querySelector<HTMLElement>('[data-board2d]');
	const board3dEl = root.querySelector<HTMLElement>('[data-board3d]');
	const themesEl = root.querySelector<HTMLElement>('[data-themes]');
	const status = root.querySelector<HTMLElement>('[data-status]');
	const volume = root.querySelector<HTMLInputElement>('[data-volume]');
	const mute = root.querySelector<HTMLButtonElement>('[data-mute]');
	const radios = [...root.querySelectorAll<HTMLInputElement>('input[name="switch"]')];
	if (!board || !stage) return;

	const keyEls = new Map<string, HTMLElement>();
	board.querySelectorAll<HTMLElement>('[data-code]').forEach((el) => keyEls.set(el.dataset.code!, el));

	const synth = new KeySynth();
	let profile = switches.find((s) => s.id === read(STORE.switch)) ?? switches.find((s) => s.id === defaultSwitchId)!;

	const setStatus = (text: string) => {
		if (status) status.textContent = text;
	};
	const idleHint = 'Press any key or click the board to turn the sound on.';
	setStatus(idleHint);

	// --- Preferences ---------------------------------------------------------
	const selectSwitch = (id: string) => {
		profile = switches.find((s) => s.id === id) ?? profile;
		radios.forEach((r) => (r.checked = r.value === profile.id));
		write(STORE.switch, profile.id);
		if (synth.ready) {
			setStatus(`Sound on · ${profile.name}`);
			preload();
		}
	};
	radios.forEach((r) => r.addEventListener('change', () => r.checked && selectSwitch(r.value)));
	selectSwitch(profile.id);

	const savedVolume = Number(read(STORE.volume));
	const initialVolume = read(STORE.volume) !== null && savedVolume >= 0 && savedVolume <= 1 ? savedVolume : 0.7;
	synth.setVolume(initialVolume);
	if (volume) {
		volume.value = String(initialVolume);
		volume.addEventListener('input', () => {
			synth.setVolume(Number(volume.value));
			write(STORE.volume, volume.value);
		});
	}

	const setMuted = (muted: boolean) => {
		synth.setMuted(muted);
		mute?.setAttribute('aria-pressed', String(muted));
		if (mute) mute.textContent = muted ? 'Unmute' : 'Mute';
		write(STORE.muted, String(muted));
	};
	mute?.addEventListener('click', () => setMuted(mute.getAttribute('aria-pressed') !== 'true'));
	setMuted(read(STORE.muted) === 'true');

	// --- Key presses -----------------------------------------------------------
	const down = new Set<string>();

	/** Starts fetching the selected switch's samples (once per pack). Needs a running AudioContext. */
	const preload = () => {
		if (synth.context && profile.samples) void loadBank(synth.context, profile.samples);
	};

	const sound = (kind: KeyEvent, code: string) => {
		if (!synth.unlock()) return;
		if (status?.textContent === idleHint) setStatus(`Sound on · ${profile.name}`);
		preload();
		// Recorded samples once loaded; the synth covers the first keystrokes and any pack that fails to load
		const bank = getBank(profile.samples);
		if (bank && synth.playSample(bank, code, kind)) return;
		synth.play(profile.sound, code, kind);
	};

	// The 3D board replaces the 2D one when WebGL and the model are available (see below)
	let view3d: Board3D | null = null;

	const setVisual = (code: string, pressed: boolean) => {
		const el = keyEls.get(code);
		if (el) pressed ? el.setAttribute('data-pressed', '') : el.removeAttribute('data-pressed');
		view3d?.setPressed(code, pressed);
	};

	/** Returns true if this call started the press */
	const press = (code: string) => {
		if (down.has(code)) return false;
		down.add(code);
		setVisual(code, true);
		sound('down', code);
		return true;
	};

	const release = (code: string, silent = false) => {
		if (!down.delete(code)) return;
		setVisual(code, false);
		if (!silent) sound('up', code);
	};

	const releaseAll = () => [...down].forEach((code) => release(code, true));

	// Only react to the physical keyboard while the board is on screen
	let inView = false;
	new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), { threshold: 0.5 }).observe(stage);

	window.addEventListener('keydown', (e) => {
		if (!inView || isTextEntry(e.target)) return;
		// Leave browser/OS shortcuts alone (Cmd+R, Ctrl+C, ...)
		if ((e.ctrlKey || e.metaKey || e.altKey) && !modifierCodes.has(e.code)) return;
		// Stop the page from scrolling while the user types on the board
		if (scrollKeys.has(e.code) && !isInteractive(e.target)) e.preventDefault();
		if (e.repeat) return;
		press(e.code);
	});

	window.addEventListener('keyup', (e) => release(e.code));
	window.addEventListener('blur', releaseAll);

	// --- Mouse / touch -----------------------------------------------------------
	const pointers = new Map<number, string>();

	const pointerPress = (code: string, pointerId: number) => {
		if (press(code)) pointers.set(pointerId, code);
	};

	board.addEventListener('pointerdown', (e) => {
		const el = (e.target as Element).closest<HTMLElement>('[data-code]');
		if (!el) return;
		e.preventDefault(); // no focus, no text selection
		pointerPress(el.dataset.code!, e.pointerId);
	});

	const endPointer = (e: PointerEvent) => {
		const code = pointers.get(e.pointerId);
		if (code === undefined) return;
		pointers.delete(e.pointerId);
		release(code);
	};
	window.addEventListener('pointerup', endPointer);
	window.addEventListener('pointercancel', endPointer);

	// --- 3D board ------------------------------------------------------------------------------
	// Loaded lazily (Three.js + the model are ~1 MB) once the section is near the screen.
	// If WebGL or the model fails, the 2D board simply stays.
	const applyTheme = (id: string) => {
		const theme = keycapThemes.find((t) => t.id === id) ?? keycapThemes.find((t) => t.id === defaultThemeId)!;
		view3d?.setTheme(theme);
		themesEl?.querySelectorAll<HTMLElement>('[data-theme]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.theme === theme.id)));
		write(STORE.theme, theme.id);
	};
	themesEl?.addEventListener('click', (e) => {
		const id = (e.target as Element).closest<HTMLElement>('[data-theme]')?.dataset.theme;
		if (id) applyTheme(id);
	});

	const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
	if (board3dEl && board2d && !saveData) {
		const loader = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				loader.disconnect();
				import('./board3d')
					.then((m) => m.createBoard3D(board3dEl, { onPointerPress: pointerPress }))
					.then((view) => {
						if (!view) return;
						view3d = view;
						applyTheme(read(STORE.theme) ?? defaultThemeId);
						if (themesEl) themesEl.hidden = false;
						down.forEach((code) => view.setPressed(code, true));
						board2d.hidden = true;
						board3dEl.hidden = false;
					})
					.catch(() => {});
			},
			{ rootMargin: '600px 0px' },
		);
		loader.observe(stage);
	}

	// --- Housekeeping ------------------------------------------------------------
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			releaseAll();
			synth.suspend();
		} else {
			synth.resume();
		}
	});
}
