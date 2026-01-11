import { TransactionBuilder } from '@fleet-sdk/core';
import { type RPBox } from './ReputationProof';
/**
 * Configuration for a single output box in the update_boxes transaction.
 *
 * @example
 * // Simple update: change content of a single box
 * const config: OutputConfig = {
 *     token_amount: 100,
 *     content: { message: "Updated content" }
 * };
 *
 * @example
 * // Split: divide tokens between two boxes
 * const configs: OutputConfig[] = [
 *     { token_amount: 60, content: "Box 1" },
 *     { token_amount: 40, content: "Box 2", receive_non_reputation_tokens: true }
 * ];
 */
export interface OutputConfig {
    /**
     * Amount of reputation tokens for this output box.
     * Can be 0 to create a box without reputation tokens (e.g., for sacrificed assets only).
     */
    token_amount: number;
    /** Type NFT ID (default: from first input box) */
    type_nft_id?: string;
    /** Object pointer (default: from first input box) */
    object_pointer?: string;
    /** Polarization: true = positive, false = negative (default: from first input) */
    polarization?: boolean;
    /** Content for R9 (default: null/empty) */
    content?: object | string | null;
    /** Lock the box (default: false). Note: locked boxes cannot be updated later. */
    is_locked?: boolean;
    /** Extra ERG to add on top of SAFE_MIN_BOX_VALUE for this specific output */
    extra_erg?: bigint;
    /**
     * If true, this output will receive all non-reputation tokens from inputs.
     * Only one output should have this set to true. If none specified, first output receives them.
     */
    receive_non_reputation_tokens?: boolean;
}
/**
 * Generic function to update multiple reputation boxes in a single transaction.
 * Supports merge (N→1), split (1→N), update (1→1), and complex redistributions.
 *
 * ## Use Cases:
 *
 * ### 1. Simple Update (1→1)
 * Update content, polarization, or lock state of a single box.
 * ```typescript
 * await update_boxes(
 *     explorer_uri,
 *     [myBox],
 *     [{ token_amount: 100, content: "New content", is_locked: true }]
 * );
 * ```
 *
 * ### 2. Merge (N→1)
 * Combine multiple boxes into one.
 * ```typescript
 * await update_boxes(
 *     explorer_uri,
 *     [box1, box2, box3],
 *     [{ token_amount: 300 }] // Sum of all input tokens
 * );
 * ```
 *
 * ### 3. Split (1→N)
 * Divide a box into multiple boxes.
 * ```typescript
 * await update_boxes(
 *     explorer_uri,
 *     [bigBox],
 *     [
 *         { token_amount: 50, content: "Part 1" },
 *         { token_amount: 50, content: "Part 2" }
 *     ]
 * );
 * ```
 *
 * ### 4. Redistribution (N→M)
 * Complex redistribution of tokens across boxes.
 * ```typescript
 * await update_boxes(
 *     explorer_uri,
 *     [box1, box2],
 *     [
 *         { token_amount: 30, object_pointer: "target1" },
 *         { token_amount: 70, object_pointer: "target2" }
 *     ]
 * );
 * ```
 *
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes (defaults to explorer_uri from envs)
 * @param input_boxes Array of RPBox to consume (must have same token_id, none locked)
 * @param output_configs Array of OutputConfig defining the output boxes
 * @param sacrificed_erg Optional extra ERG to add to the first output box
 * @param sacrificed_tokens Optional extra tokens to add (distributed based on receive_non_reputation_tokens flag)
 * @returns Transaction ID if successful
 * @throws Error if validation fails or transaction cannot be built/submitted
 */
export declare function update_boxes(explorerUri: string, input_boxes: RPBox[], output_configs: OutputConfig[], sacrificed_erg?: bigint, sacrificed_tokens?: {
    tokenId: string;
    amount: bigint;
}[]): Promise<string>;
/**
 * Updates multiple reputation boxes and returns the TransactionBuilder for chaining.
 * Use this when you need to chain multiple transactions together.
 *
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes.
 * @param input_boxes Array of RPBox to consume (must have same token_id, none locked).
 * @param output_configs Array of OutputConfig defining the output boxes.
 * @param sacrificed_erg Optional extra ERG to add to the first output box.
 * @param sacrificed_tokens Optional extra tokens to add.
 * @returns The TransactionBuilder after .build() for chaining.
 */
export declare function update_boxes_chained(explorerUri: string, input_boxes: RPBox[], output_configs: OutputConfig[], sacrificed_erg?: bigint, sacrificed_tokens?: {
    tokenId: string;
    amount: bigint;
}[]): Promise<TransactionBuilder>;
