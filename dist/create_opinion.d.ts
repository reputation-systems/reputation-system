import { type RPBox } from './ReputationProof';
/**
 * Generates or modifies a reputation proof by building and submitting a transaction.
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @param token_amount The amount of the token for the new proof box.
 * @param type_nft_id The Type NFT ID associated with the proof.
 * @param object_pointer An optional pointer to the object being evaluated.
 * @param polarization A boolean indicating the polarization of the opinion.
 * @param content The content associated with the opinion, can be an object or string.
 * @param is_locked A boolean indicating if the opinion is locked.
 * @param main_box The main RPBox containing the reputation tokens to spend.
 * @returns The transaction ID if successful, otherwise null.
 */
export declare function create_opinion(explorerUri: string, token_amount: number, type_nft_id: string, object_pointer: string | undefined, polarization: boolean, content: object | string | null, is_locked: boolean | undefined, main_box: RPBox): Promise<string | null>;
