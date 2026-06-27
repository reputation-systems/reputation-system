import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
    DEFAULT_EXPLORER_URI_TX,
    DEFAULT_EXPLORER_URI_TOKEN,
    DEFAULT_EXPLORER_URI_ADDR
} from './constants';

// Wallet stores
export const address = writable<string | null>(null);
export const network = writable<string | null>(null);
export const connected = writable<boolean>(false);
export const balance = writable<number | null>(null);

// Token cache for user tokens
export const user_tokens = writable<Map<string, any>>(new Map());

// Helper function to create a persistent store
function createPersistentStore<T>(key: string, defaultValue: T) {
    let initial = defaultValue;

    if (browser) {
        const storedValue = localStorage.getItem(key);
        
        // Check if value exists and isn't the string "undefined" which breaks JSON.parse
        if (storedValue && storedValue !== "undefined" && storedValue !== "null") {
            try {
                initial = JSON.parse(storedValue);
            } catch (e) {
                // If parsing fails, fail silently and stick with defaultValue
                // This "heals" the corruption automatically
                console.warn(`Corrupted storage for ${key}, resetting to default.`);
            }
        }
    }

    const store = writable<T>(initial);

    if (browser) {
        store.subscribe(value => {
            // NEVER write "undefined" to storage
            if (value === undefined) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        });
    }

    return store;
}

// Web Explorer URI stores with persistence
export const web_explorer_uri_tx = createPersistentStore(
    'web_explorer_uri_tx',
    DEFAULT_EXPLORER_URI_TX
);

export const web_explorer_uri_token = createPersistentStore(
    'web_explorer_uri_token',
    DEFAULT_EXPLORER_URI_TOKEN
);

export const web_explorer_uri_addr = createPersistentStore(
    'web_explorer_uri_addr',
    DEFAULT_EXPLORER_URI_ADDR
);
