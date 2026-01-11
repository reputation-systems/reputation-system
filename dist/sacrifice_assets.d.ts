import { TransactionBuilder } from '@fleet-sdk/core';
import { type RPBox } from './ReputationProof';
/**
 * Sacrifices ERG and tokens by adding them to an existing reputation box.
 * The target box is recreated with the additional assets permanently locked inside.
 *
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes.
 * @param target_box The reputation box to receive the sacrificed assets.
 * @param sacrificed_erg Amount of ERG to sacrifice (added to existing box value).
 * @param sacrificed_tokens Array of tokens to sacrifice (added to existing box tokens).
 * @returns The transaction ID if successful, otherwise null.
 */
export declare function sacrifice_assets(explorerUri: string, target_box: RPBox, sacrificed_erg?: bigint, sacrificed_tokens?: {
    tokenId: string;
    amount: bigint;
}[]): Promise<string | null>;
/**
 * Sacrifices assets and returns the TransactionBuilder for chaining.
 * Use this when you need to chain multiple transactions together.
 *
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes.
 * @param target_box The reputation box to receive the sacrificed assets.
 * @param sacrificed_erg Amount of ERG to sacrifice (added to existing box value).
 * @param sacrificed_tokens Array of tokens to sacrifice (added to existing box tokens).
 * @returns The TransactionBuilder after .build() for chaining.
 */
export declare function sacrifice_assets_chained(explorerUri: string, target_box: RPBox, sacrificed_erg?: bigint, sacrificed_tokens?: {
    tokenId: string;
    amount: bigint;
}[]): Promise<TransactionBuilder>;
