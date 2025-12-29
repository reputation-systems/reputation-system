import { type Amount, type Box } from "@fleet-sdk/core";
export interface ApiBox {
    boxId: string;
    value: string | number;
    ergoTree: string;
    assets: {
        tokenId: string;
        amount: string | number;
    }[];
    creationHeight: number;
    blockId: string;
    additionalRegisters: {
        [key: string]: {
            serializedValue: string;
            renderedValue?: string;
        };
    };
    index: number;
    transactionId: string;
}
export interface TypeNFT {
    tokenId: string;
    boxId: string;
    typeName: string;
    description: string;
    schemaURI: string;
    isRepProof: boolean;
}
export interface ReputationProof {
    token_id: string;
    types: TypeNFT[];
    total_amount: number;
    owner_ergotree: string;
    owner_serialized: string;
    can_be_spend: boolean;
    current_boxes: RPBox[];
    number_of_boxes: number;
    network: string;
    data: object;
}
export interface RPBox {
    box: Box<Amount>;
    box_id: string;
    type: TypeNFT;
    token_id: string;
    token_amount: number;
    object_pointer: string;
    is_locked: boolean;
    polarization: boolean;
    content: object | string | null;
}
export declare function token_rendered(proof: ReputationProof): string;
export declare function compute(proof: ReputationProof, target_object_pointer: string): number;
