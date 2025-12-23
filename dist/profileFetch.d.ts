import { type TypeNFT, type ReputationProof } from './ReputationProof';
/**
 * Fetches all ReputationProof objects for the connected user,
 * by searching all boxes where R7 matches their wallet address.
 * Profiles are ordered by total ERG burned.
 */
export declare function fetchAllProfiles(is_self_defined: boolean | null | undefined, types: string[] | undefined, availableTypes: Map<string, TypeNFT>, explorerUri?: string): Promise<ReputationProof[]>;
