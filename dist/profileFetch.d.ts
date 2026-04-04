import { type RPBox, type TypeNFT, type ReputationProof, type ApiBox } from './ReputationProof';
/**
 * Converts an ApiBox to an RPBox (Reputation Proof Box).
 */
export declare function convertToRPBox(box: ApiBox, token_id: string | null, availableTypes: Map<string, TypeNFT>): RPBox | null;
/**
 * Fetches all ReputationProof objects for the connected user.
 */
export declare function fetchAllUserProfiles(explorerUri: string, is_self_defined: boolean | null | undefined, types: string[] | undefined, availableTypes: Map<string, TypeNFT>, limit?: number, offset?: number): Promise<ReputationProof[]>;
/**
 * Fetches ALL ReputationProof objects in the network (Global view).
 * Does not filter by R7.
 */
export declare function fetchAllProfiles(explorerUri: string, is_self_defined: boolean | null | undefined, types: string[] | undefined, availableTypes: Map<string, TypeNFT>, limit?: number, offset?: number): Promise<ReputationProof[]>;
/**
 * Fetch a specific ReputationProof by its token ID.
 */
export declare function fetchProfileById(explorerUri: string, tokenId: string): Promise<ReputationProof | null>;
