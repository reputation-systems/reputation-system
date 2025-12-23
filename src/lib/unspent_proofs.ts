import { type RPBox, type ReputationProof, type TypeNFT } from "$lib/ReputationProof";
import { hexToBytes, hexToUtf8, serializedToRendered, SString, parseCollByteToHex } from "$lib/utils";
import { digital_public_good_contract_hash, ergo_tree, ergo_tree_hash, explorer_uri } from "./envs";
import { ErgoAddress, SByte, SColl } from "@fleet-sdk/core";
import { hexOrUtf8ToBytes } from "./utils";


const LIMIT_PER_PAGE = 100;
type RegisterValue = { renderedValue: string; serializedValue: string; };
type ApiBox = {
    boxId: string; value: string | bigint; assets: { tokenId: string; amount: string | bigint }[]; ergoTree: string; creationHeight: number;
    additionalRegisters: {
        R4?: RegisterValue; R5?: RegisterValue; R6?: RegisterValue; R7?: RegisterValue; R8?: RegisterValue; R9?: RegisterValue;
    };
    index: number; transactionId: string;
};

/**
 * Gets the timestamp of a block given its block ID.
 */
export async function getTimestampFromBlockId(blockId: string, explorerUri: string = explorer_uri): Promise<number> {
    const url = `${explorerUri}/api/v1/blocks/${blockId}`;

    try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const timestamp = json?.block?.header?.timestamp;
        if (typeof timestamp !== "number") {
            console.warn(`No timestamp found for block ${blockId}`);
            return 0;
        }

        return timestamp < 1e11 ? timestamp * 1000 : timestamp;
    } catch (error) {
        console.error(`Error fetching timestamp for block ${blockId}:`, error);
        return 0;
    }
}

/**
 * Generic search function for boxes with specific R4 and R5 values
 */
export async function searchBoxes(
    r4TypeNftId: string,
    r5Value: string,
    explorerUri: string = explorer_uri
): Promise<ApiBox[]> {
    const boxes: ApiBox[] = [];

    const searchBody = {
        registers: {
            "R4": serializedToRendered(SColl(SByte, hexToBytes(r4TypeNftId) ?? "").toHex()),
            "R5": serializedToRendered(SColl(SByte, hexOrUtf8ToBytes(r5Value) ?? "").toHex())
        }
    };

    try {
        let offset = 0;
        let moreDataAvailable = true;

        while (moreDataAvailable) {
            const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${LIMIT_PER_PAGE}`;

            const finalBody = {
                "ergoTreeTemplateHash": ergo_tree_hash,
                "registers": searchBody.registers,
                "assets": []
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalBody)
            });

            if (!response.ok) {
                console.error(`Error searching boxes: ${response.statusText}`);
                moreDataAvailable = false;
                continue;
            }

            const jsonData = await response.json();
            if (!jsonData.items || jsonData.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }

            boxes.push(...jsonData.items);
            offset += LIMIT_PER_PAGE;
        }

        return boxes;
    } catch (error) {
        console.error('Error while searching boxes:', error);
        return [];
    }
}

export async function fetchTypeNfts(explorerUri: string = explorer_uri): Promise<Map<string, TypeNFT>> {
    try {
        const fetchedTypesArray: TypeNFT[] = [];
        let offset = 0;
        const limit = 100;
        let moreDataAvailable = true;

        while (moreDataAvailable) {
            const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
            const body = { "ergoTreeTemplateHash": digital_public_good_contract_hash };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                moreDataAvailable = false;
                console.error("Failed to fetch a page of type boxes from the explorer.");
                continue;
            }

            const data = await response.json();
            if (data.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }

            const pageTypes = data.items.map((box: any): TypeNFT | null => {
                if (!box.assets || box.assets.length === 0) return null;
                return {
                    tokenId: box.assets[0].tokenId,
                    boxId: box.boxId,
                    typeName: hexToUtf8(box.additionalRegisters.R4?.renderedValue || '') ?? "",
                    description: hexToUtf8(box.additionalRegisters.R5?.renderedValue || '') ?? "",
                    schemaURI: hexToUtf8(box.additionalRegisters.R6?.renderedValue || '') ?? "",
                    isRepProof: box.additionalRegisters.R7?.renderedValue ?? false,
                };
            }).filter((t: TypeNFT | null): t is TypeNFT => t !== null);

            fetchedTypesArray.push(...pageTypes);
            offset += limit;
        }

        const typesMap = new Map(fetchedTypesArray.map(type => [type.tokenId, type]));
        console.log(`Successfully fetched ${typesMap.size} Type NFTs.`);
        return typesMap;

    } catch (e: any) {
        console.error("Failed to fetch and store types:", e);
        return new Map();
    }
}

export async function updateReputationProofList(
    connected: boolean,
    availableTypes: Map<string, TypeNFT>,
    search: string | null,
    explorerUri: string = explorer_uri
): Promise<Map<string, ReputationProof>> {

    if (!connected) {
        // If not connected, we might want to fetch all or handle differently.
        // For now, let's assume 'all' logic applies if not connected or if explicitly requested.
        // But the original code set 'all = true' if '!connected'.
        // The 'all' parameter was removed from signature in plan but logic needs to be preserved.
        // Let's assume we always fetch based on search or all if search is null.
    }

    const proofs = new Map<string, ReputationProof>();
    const search_bodies = [];
    let r7_filter = {};
    let userR7SerializedHex: string | null = null;

    // @ts-ignore
    const ergo = window.ergo;
    const change_address = connected && ergo ? await ergo.get_change_address() : null;

    if (change_address) {
        const userAddress = ErgoAddress.fromBase58(change_address);
        const propositionBytes = hexToBytes(userAddress.ergoTree);

        if (propositionBytes) {
            userR7SerializedHex = SColl(SByte, propositionBytes).toHex();
            // If we are searching, we don't filter by R7.
            // If we are NOT searching, we might want to filter by R7 (my proofs) OR show all.
            // The previous logic had an 'all' parameter.
            // If 'search' is present, we search.
            // If 'search' is null, do we show all or only mine?
            // The original code: if (!connected) all = true.
            // if (!all) r7_filter = { "R7": userR7SerializedHex };

            // Let's infer: if search is provided, we don't filter by owner.
            // If search is NOT provided, and we are connected, maybe we want to see OUR proofs?
            // BUT, the 'all' flag was passed as 'true' in Search.svelte: updateReputationProofList(null, true, null).
            // So Search.svelte wants ALL proofs.
            // Profile.svelte probably wants ONLY user proofs, but it uses fetchProfile separately.
            // So updateReputationProofList seems to be used for "Explore" or "Search" which implies ALL.
            // So we probably don't need r7_filter unless we want to filter by "My Proofs" in search.
            // For now, I will assume we want ALL proofs if search is generic.

            // However, to support "My Proofs" filter later, we might need it.
            // But based on usage in Search.svelte (all=true), we can skip r7_filter for now or make it optional.
            // I will remove 'all' param and assume we want ALL unless specific logic is added.
        }
    }

    if (search) {
        // Search by asset (token ID)
        search_bodies.push({ assets: [search] });
        // Search by R5 (string content)
        search_bodies.push({ registers: { "R5": SString(search) } });
        // If search term is a valid token ID, search by R4 (Coll[Byte])
        if (search.length === 64 && /^[0-9a-fA-F]+$/.test(search)) {
            search_bodies.push({ registers: { "R4": SColl(SByte, hexToBytes(search) ?? "").toHex() } });
        }
    } else {
        search_bodies.push({});
    }

    try {
        for (const body_part of search_bodies) {
            let offset = 0, limit = 100, moreDataAvailable = true;
            while (moreDataAvailable) {
                const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
                const final_body = { "ergoTreeTemplateHash": ergo_tree_hash, "registers": { ...(body_part.registers || {}), ...r7_filter }, "assets": body_part.assets || [] };
                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(final_body) });

                if (!response.ok) { moreDataAvailable = false; continue; }
                const json_data = await response.json();
                if (json_data.items.length === 0) { moreDataAvailable = false; continue; }

                for (const box of json_data.items as ApiBox[]) {
                    if (box.ergoTree != ergo_tree) continue
                    if (!box.assets?.length || !box.additionalRegisters.R4 || !box.additionalRegisters.R6 || !box.additionalRegisters.R7) continue;

                    const rep_token_id = box.assets[0].tokenId;
                    const owner_serialized = box.additionalRegisters.R7.serializedValue;

                    let proof = proofs.get(rep_token_id);

                    if (proof && proof.owner_serialized !== owner_serialized) {
                        console.warn(`Reputation Proof with token ID ${rep_token_id} has conflicting owner hashes. Skipping this proof.`, {
                            expectedOwnerHash: proof.owner_serialized,
                            foundOwnerHash: owner_serialized,
                            conflictingBox: box.boxId
                        });
                        proofs.delete(rep_token_id);
                        continue;
                    }

                    if (!proof) {
                        const tokenResponse = await fetch(`${explorerUri}/api/v1/tokens/${rep_token_id}`);
                        if (!tokenResponse.ok) {
                            console.error(`Error al obtener la cantidad emitida del token ${rep_token_id}`);
                            continue;
                        }
                        const tokenData = await tokenResponse.json();
                        const emissionAmount = Number(tokenData.emissionAmount || 0);

                        proof = {
                            token_id: rep_token_id,
                            types: [],
                            total_amount: emissionAmount,
                            owner_address: serializedToRendered(owner_serialized),
                            owner_serialized: owner_serialized,
                            can_be_spend: userR7SerializedHex ? owner_serialized === userR7SerializedHex : false,
                            current_boxes: [],
                            number_of_boxes: 0,
                            network: "ergo",
                            data: {}
                        };
                        proofs.set(rep_token_id, proof);
                    }

                    const type_nft_id_for_box = box.additionalRegisters.R4.renderedValue ?? "";
                    let typeNftForBox = availableTypes.get(type_nft_id_for_box);
                    if (!typeNftForBox) {
                        typeNftForBox = { tokenId: type_nft_id_for_box, boxId: '', typeName: "Unknown Type", description: "Metadata not found", schemaURI: "", isRepProof: false };
                    }

                    let box_content: string | object | null = {};
                    try {
                        const rawValue = box.additionalRegisters.R9?.renderedValue;
                        if (rawValue) {
                            const potentialString = hexToUtf8(rawValue);
                            try {
                                box_content = JSON.parse(potentialString ?? "");
                            } catch (jsonError) {
                                box_content = potentialString;
                            }
                        }
                    } catch (error) {
                        box_content = {};
                    }

                    const object_pointer_for_box = parseCollByteToHex(box.additionalRegisters.R5?.renderedValue) ?? "";

                    const current_box: RPBox = {
                        box: {
                            boxId: box.boxId, value: box.value, assets: box.assets, ergoTree: box.ergoTree, creationHeight: box.creationHeight,
                            additionalRegisters: Object.entries(box.additionalRegisters).reduce((acc, [key, value]) => { acc[key] = value.serializedValue; return acc; }, {} as { [key: string]: string; }),
                            index: box.index, transactionId: box.transactionId
                        },
                        box_id: box.boxId,
                        type: typeNftForBox,
                        token_id: rep_token_id,
                        token_amount: Number(box.assets[0].amount),
                        object_pointer: object_pointer_for_box,
                        is_locked: box.additionalRegisters.R6.renderedValue === 'true',
                        polarization: box.additionalRegisters.R8?.renderedValue === 'true',
                        content: box_content,
                    };

                    if (current_box.object_pointer === proof.token_id) {
                        if (!proof.types.some(t => t.tokenId === typeNftForBox.tokenId)) {
                            proof.types.push(typeNftForBox);
                        }
                    }

                    proof.current_boxes.push(current_box);
                    proof.number_of_boxes += 1;
                }
                offset += limit;
            }
        }
        return proofs;
    } catch (error) {
        console.error('An error occurred during the reputation proof search:', error);
        return new Map();
    }
}

/**
 * Retrieves all boxes (RPBox) associated with a specific ReputationProof.
 * @param proof The ReputationProof object from which to extract the boxes.
 * @returns An array of RPBox objects.
 */
export function getAllRPBoxesFromProof(proof: ReputationProof): RPBox[] {
    return proof.current_boxes;
}

/**
 * Finds and returns the ReputationProof to which a specific RPBox belongs.
 * @param box The RPBox for which to find its parent ReputationProof.
 * @param proofs The map of all fetched reputation proofs.
 * @returns The corresponding ReputationProof or 'undefined' if not found.
 */
export function getReputationProofFromRPBox(
    box: RPBox,
    proofs: Map<string, ReputationProof>
): ReputationProof | undefined {
    return proofs.get(box.token_id);
}