import { Buffer } from 'buffer';

window.global = window.global ?? window;
window.Buffer = window.Buffer ?? Buffer;

// @ts-ignore
window.process = window.process ?? { env: {} }; // Minimal process polyfill

export {};