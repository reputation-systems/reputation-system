/// <reference types="svelte" />
import type { ReputationProof, TypeNFT } from './ReputationProof';
export declare const proofs: import("svelte/store").Writable<Map<string, ReputationProof>>;
export declare const reputation_proof: import("svelte/store").Writable<ReputationProof | null>;
export declare const user_profiles: import("svelte/store").Writable<ReputationProof[]>;
export declare const advance_mode: import("svelte/store").Writable<boolean>;
export declare const fetch_all: import("svelte/store").Writable<boolean>;
export declare const building_graph: import("svelte/store").Writable<boolean | null>;
export declare const address: import("svelte/store").Writable<string | null>;
export declare const network: import("svelte/store").Writable<string | null>;
export declare const connected: import("svelte/store").Writable<boolean>;
export declare const compute_deep_level: import("svelte/store").Writable<number>;
export declare const searchStore: import("svelte/store").Writable<string | null>;
export declare const data_store: import("svelte/store").Writable<any>;
export declare const types: import("svelte/store").Writable<Map<string, TypeNFT>>;
