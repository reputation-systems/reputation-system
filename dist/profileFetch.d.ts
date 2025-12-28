import { type TypeNFT, type ReputationProof } from './ReputationProof';
/**
 * Fetches all ReputationProof objects for the connected user,
 * by searching all boxes where R7 matches their wallet address.
 * Profiles are ordered by total ERG burned.
 */
export declare function fetchAllProfiles(explorerUri: string, is_self_defined: boolean | null | undefined, types: string[] | undefined, availableTypes: Map<string, TypeNFT>): Promise<ReputationProof[]>;
