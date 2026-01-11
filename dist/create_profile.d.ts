import { TransactionBuilder } from '@fleet-sdk/core';
/**
 * Creates a new reputation profile by minting a new reputation token.
 * This creates a "SELF" box where R5 points to its own token ID (the minted token).
 *
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @param total_supply The total amount of reputation tokens to mint.
 * @param type_nft_id The Type NFT ID that defines the category/type for this profile.
 * @param content Optional content for the profile (text, JSON object, or null).
 * @param sacrified_erg Optional extra ERG to add to the profile box (sacrificed).
 * @param sacrified_tokens Optional extra tokens to add to the profile box (sacrificed).
 * @returns The transaction ID if successful, otherwise null.
 */
export declare function create_profile(explorerUri: string, total_supply: number, type_nft_id: string, content?: object | string | null, sacrified_erg?: bigint, sacrified_tokens?: {
    tokenId: string;
    amount: bigint;
}[]): Promise<string | null>;
/**
 * Creates a new reputation profile and returns the TransactionBuilder for chaining.
 * Use this when you need to chain multiple transactions together.
 *
 * @param total_supply The total amount of reputation tokens to mint.
 * @param type_nft_id The Type NFT ID that defines the category/type for this profile.
 * @param content Optional content for the profile (text, JSON object, or null).
 * @param sacrified_erg Optional extra ERG to add to the profile box (sacrificed).
 * @param sacrified_tokens Optional extra tokens to add to the profile box (sacrificed).
 * @returns The TransactionBuilder after .build() for chaining.
 */
export declare function create_profile_chained(total_supply: number, type_nft_id: string, content?: object | string | null, sacrified_erg?: bigint, sacrified_tokens?: {
    tokenId: string;
    amount: bigint;
}[]): Promise<TransactionBuilder>;
