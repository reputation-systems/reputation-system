import { type Amount } from '@fleet-sdk/core';
import { type RPBox } from './ReputationProof';
/**
 * Generates or modifies a reputation proof by building and submitting a transaction.
 * @param token_amount The amount of the token for the new proof box.
 * @param total_supply The total supply of the reputation token set.
 * @param type_nft_id The token ID of the Type NFT that defines the standard for this proof.
 * @param object_pointer The object this proof is about (e.g., a URL, another token ID).
 * @param polarization `true` for a positive proof, `false` for a negative one.
 * @param content The JSON or string content for register R9.
 * @param is_locked `true` to make the resulting box immutable.
 * @param opinion_box The existing RPBox to spend from (for splitting or modifying).
 * @param main_boxes Additional RPBoxes to merge into the new proof.
 * @param extra_erg Optional extra ERG to add to the proof (sacrificed).
 * @param extra_tokens Optional extra tokens to add to the proof (sacrificed).
 * @param explorerUri Optional explorer URI to use for fetching the Type NFT box.
 * @returns A promise that resolves to the transaction ID string, or null on failure.
 */
export declare function generate_reputation_proof(token_amount: number, total_supply: number, type_nft_id: string, object_pointer: string | undefined, polarization: boolean, content: object | string | null, is_locked?: boolean, opinion_box?: RPBox, main_boxes?: RPBox[], extra_erg?: Amount, extra_tokens?: {
    tokenId: string;
    amount: Amount;
}[], explorerUri?: string): Promise<string | null>;
