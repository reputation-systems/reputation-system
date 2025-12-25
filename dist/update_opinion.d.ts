import { type RPBox } from './ReputationProof';
/**
 * Updates an existing opinion box by recreating it with modified parameters.
 * The main_box is optional and only required if token_amount_delta is non-zero.
 *
 * @param opinion_box The existing opinion box to update (must not be locked).
 * @param polarization Optional new polarization value (true = positive, false = negative).
 * @param content Optional new content (text, JSON object, or null). Pass undefined to keep existing.
 * @param token_amount_delta Change in reputation tokens: positive to add, negative to remove. Requires main_box.
 * @param extra_erg Optional extra ERG to add on top of the existing opinion_box value.
 * @param is_locked Optional flag to lock the opinion box (only false -> true transition allowed).
 * @param main_box Optional main box to use for reputation token adjustments. Required if token_amount_delta != 0.
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes.
 * @returns The transaction ID if successful, otherwise null.
 */
export declare function update_opinion(opinion_box: RPBox, explorerUri: string, polarization?: boolean, content?: object | string | null, token_amount_delta?: number, extra_erg?: bigint, is_locked?: boolean, main_box?: RPBox): Promise<string | null>;
