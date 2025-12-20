import { type Amount, type Box } from "@fleet-sdk/core";
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
    type: TypeNFT;
    total_amount: number;
    owner_address: string;
    owner_serialized: string;
    can_be_spend: boolean;
    current_boxes: RPBox[];
    number_of_boxes: number;
    network: Network;
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
export declare enum Network {
    ErgoTestnet = "ergo-testnet",
    ErgoMainnet = "ergo",
    BitcoinTestnet = "btc-testnet",
    BitcoinMainnet = "btc"
}
export declare function compute(proof: ReputationProof, target_object_pointer: string): number;
