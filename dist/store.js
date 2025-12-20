import { writable } from 'svelte/store';
// Main store for holding fetched reputation proofs, keyed by token ID.
export const proofs = writable(new Map());
// UI state stores
export const advance_mode = writable(false);
export const fetch_all = writable(true);
export const building_graph = writable(null);
// Wallet and connection state stores
export const address = writable(null);
export const network = writable(null);
export const connected = writable(false);
// App logic stores
export const compute_deep_level = writable(5);
export const searchStore = writable(null);
export const data_store = writable(null);
export const types = writable(new Map());
