import { TransactionBuilder } from '@fleet-sdk/core';
import { type RPBox } from './ReputationProof';
/**
 * Updates an existing opinion box by recreating it with modified parameters.
 * The main_box is optional and only required if token_amount_delta is non-zero.
 *
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes.
 * @param opinion_box The existing opinion box to update (must not be locked).
 * @param polarization Optional new polarization value (true = positive, false = negative).
 * @param content Optional new content (text, JSON object, or null). Pass undefined to keep existing.
 * @param token_amount_delta Change in reputation tokens: positive to add, negative to remove. Requires main_box.
 * @param extra_erg Optional extra ERG to add on top of the existing opinion_box value.
 * @param is_locked Optional flag to lock the opinion box (only false -> true transition allowed).
 * @param main_box Optional main box to use for reputation token adjustments. Required if token_amount_delta != 0.
 * @returns The transaction ID if successful, otherwise null.
 */
export declare function update_opinion(explorerUri: string, opinion_box: RPBox, polarization?: boolean, content?: object | string | null, token_amount_delta?: number, extra_erg?: bigint, is_locked?: boolean, main_box?: RPBox): Promise<string | null>;
/**
 * Updates an existing opinion and returns the TransactionBuilder for chaining.
 * Use this when you need to chain multiple transactions together.
 *
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes.
 * @param opinion_box The existing opinion box to update (must not be locked).
 * @param polarization Optional new polarization value (true = positive, false = negative).
 * @param content Optional new content (text, JSON object, or null). Pass undefined to keep existing.
 * @param token_amount_delta Change in reputation tokens: positive to add, negative to remove. Requires main_box.
 * @param extra_erg Optional extra ERG to add on top of the existing opinion_box value.
 * @param is_locked Optional flag to lock the opinion box (only false -> true transition allowed).
 * @param main_box Optional main box to use for reputation token adjustments. Required if token_amount_delta != 0.
 * @returns The TransactionBuilder after .build() for chaining.
 */
export declare function update_opinion_chained(explorerUri: string, opinion_box: RPBox, polarization?: boolean, content?: object | string | null, token_amount_delta?: number, extra_erg?: bigint, is_locked?: boolean, main_box?: RPBox): Promise<TransactionBuilder>;
