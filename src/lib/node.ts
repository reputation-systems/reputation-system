/**
 * Node entry point for `reputation-system`.
 *
 * The default entry (`index.ts`) re-exports Svelte components and is resolved
 * through the `"svelte"` export condition, so plain Node (agents, MCP servers,
 * CI) cannot import it. This entry exposes ONLY the headless, Node-safe surface:
 * the publish functions, the signer abstraction, the fetch/search helpers, the
 * derived contract constants, and the serializer utilities — no `.svelte`
 * imports anywhere in its dependency graph.
 *
 * Consume it via the `"./node"` subpath:
 *
 *   import { create_opinion_with_signer, SeedSigner } from 'reputation-system/node';
 */

// --- Signer abstraction ---
export {
    type Signer,
    type SignerResult,
    type SeedSignerOptions,
    type UnsignedSignerOptions,
    NautilusSigner,
    SeedSigner,
    UnsignedSigner
} from './signer';

// --- Publish functions (signer-aware) ---
export { create_opinion_with_signer, create_opinion_chained } from './create_opinion';
export { create_profile_with_signer, create_profile_chained } from './create_profile';

// --- Read / fetch helpers ---
export {
    fetchTypeNfts,
    searchBoxes,
    getTimestampFromBlockId
} from './fetch';
export { fetchAllUserProfiles, fetchAllProfiles, convertToRPBox } from './profileFetch';

// --- Derived contract constants (needed to build/search reputation boxes) ---
export {
    explorer_uri,
    ergo_tree_address,
    ergo_tree,
    ergo_tree_hash,
    digital_public_good_ergo_tree,
    digital_public_good_contract_hash,
    PROFILE_TYPE_NFT_ID,
    PROFILE_TOTAL_SUPPLY
} from './envs';

// --- Serializer / parsing utilities ---
export {
    hexToBytes,
    hexToUtf8,
    hexOrUtf8ToBytes,
    serializedToRendered,
    stringToRendered,
    renderedToString,
    parseCollByteToHex,
    generate_pk_proposition,
    SString
} from './utils';

// --- Types ---
export type { ReputationProof, RPBox, TypeNFT, ApiBox } from './ReputationProof';
