import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { explorer_uri as defaultExplorerUri } from './envs';
function createPersistedStringStore(key, initialValue) {
    const store = writable(initialValue);
    if (browser) {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue) {
            store.set(storedValue);
        }
        store.subscribe((value) => {
            window.localStorage.setItem(key, value);
        });
    }
    return store;
}
// Main store for holding fetched reputation proofs, keyed by token ID.
export const proofs = writable(new Map());
export const reputation_proof = writable(null);
export const user_profiles = writable([]);
// UI state stores
export const advance_mode = writable(false);
export const fetch_all = writable(true);
export const building_graph = writable(null);
// Wallet and connection state stores
export const address = writable(null);
export const network = writable(null);
export const connected = writable(false);
export const explorer_uri = createPersistedStringStore('explorer_uri', defaultExplorerUri);
// App logic stores
export const compute_deep_level = writable(5);
export const searchStore = writable(null);
export const data_store = writable(null);
export const types = writable(new Map());
