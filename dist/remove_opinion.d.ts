import { TransactionBuilder } from '@fleet-sdk/core';
import { type RPBox } from './ReputationProof';
/**
 * Removes an opinion box by merging all its assets (ERG + tokens) into the main box.
 * The opinion box is consumed and not recreated, effectively deleting it.
 * The main box is recreated with the combined assets.
 *
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @param opinion_box The opinion box to remove (must not be locked).
 * @param main_box The main box to receive all assets from the opinion box.
 * @returns The transaction ID if successful, otherwise null.
 */
export declare function remove_opinion(explorerUri: string, opinion_box: RPBox, main_box: RPBox): Promise<string | null>;
/**
 * Removes an opinion box and returns the TransactionBuilder for chaining.
 * Use this when you need to chain multiple transactions together.
 *
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @param opinion_box The opinion box to remove (must not be locked).
 * @param main_box The main box to receive all assets from the opinion box.
 * @returns The TransactionBuilder after .build() for chaining.
 */
export declare function remove_opinion_chained(explorerUri: string, opinion_box: RPBox, main_box: RPBox): Promise<TransactionBuilder>;
