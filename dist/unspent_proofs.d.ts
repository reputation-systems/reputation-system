import { type RPBox, type ReputationProof } from "./ReputationProof";
export declare function fetchTypeNfts(): Promise<void>;
export declare function updateReputationProofList(ergo: any, all: boolean, search: string | null): Promise<Map<string, ReputationProof>>;
/**
 * Retrieves all boxes (RPBox) associated with a specific ReputationProof.
 * @param proof The ReputationProof object from which to extract the boxes.
 * @returns An array of RPBox objects.
 */
export declare function getAllRPBoxesFromProof(proof: ReputationProof): RPBox[];
/**
 * Finds and returns the ReputationProof to which a specific RPBox belongs.
 * This function retrieves the complete map of proofs from the 'proofs' Svelte store.
 * @param box The RPBox for which to find its parent ReputationProof.
 * @returns The corresponding ReputationProof or 'undefined' if not found.
 */
export declare function getReputationProofFromRPBox(box: RPBox): ReputationProof | undefined;
