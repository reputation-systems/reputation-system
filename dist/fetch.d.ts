import { type RPBox, type ReputationProof, type TypeNFT } from "./ReputationProof";
type RegisterValue = {
    renderedValue: string;
    serializedValue: string;
};
type ApiBox = {
    boxId: string;
    value: string | bigint;
    assets: {
        tokenId: string;
        amount: string | bigint;
    }[];
    ergoTree: string;
    creationHeight: number;
    additionalRegisters: {
        R4?: RegisterValue;
        R5?: RegisterValue;
        R6?: RegisterValue;
        R7?: RegisterValue;
        R8?: RegisterValue;
        R9?: RegisterValue;
    };
    index: number;
    transactionId: string;
};
/**
 * Gets the timestamp of a block given its block ID.
 */
export declare function getTimestampFromBlockId(explorerUri: string, blockId: string): Promise<number>;
/**
 * Generic search function for boxes with specific R4 and R5 values
 */
export declare function searchBoxes(explorerUri: string, token_id?: string, type_nft_id?: string, object_pointer?: string, is_locked?: boolean, polarization?: boolean, content?: string | object, owner_address?: string, limit?: number, offset?: number): AsyncGenerator<ApiBox[]>;
export declare function fetchTypeNfts(explorerUri: string): Promise<Map<string, TypeNFT>>;
export declare function updateReputationProofList(explorerUri: string, connected: boolean, availableTypes: Map<string, TypeNFT>, search: string | null): Promise<Map<string, ReputationProof>>;
/**
 * Retrieves all boxes (RPBox) associated with a specific ReputationProof.
 * @param proof The ReputationProof object from which to extract the boxes.
 * @returns An array of RPBox objects.
 */
export declare function getAllRPBoxesFromProof(proof: ReputationProof): RPBox[];
/**
 * Finds and returns the ReputationProof to which a specific RPBox belongs.
 * @param box The RPBox for which to find its parent ReputationProof.
 * @param proofs The map of all fetched reputation proofs.
 * @returns The corresponding ReputationProof or 'undefined' if not found.
 */
export declare function getReputationProofFromRPBox(box: RPBox, proofs: Map<string, ReputationProof>): ReputationProof | undefined;
export {};
