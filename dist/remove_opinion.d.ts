import { type RPBox } from './ReputationProof';
/**
 * Removes an opinion box by merging all its assets (ERG + tokens) into the main box.
 * The opinion box is consumed and not recreated, effectively deleting it.
 * The main box is recreated with the combined assets.
 *
 * @param opinion_box The opinion box to remove (must not be locked).
 * @param main_box The main box to receive all assets from the opinion box.
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @returns The transaction ID if successful, otherwise null.
 */
export declare function remove_opinion(opinion_box: RPBox, main_box: RPBox, explorerUri: string): Promise<string | null>;
