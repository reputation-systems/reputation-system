import { Network } from "./ReputationProof";
import { hexToBytes, hexToUtf8, serializedToRendered, SString } from "./utils";
import { get } from "svelte/store";
import { connected, proofs, types } from "./store";
import { digital_public_good_contract_hash, ergo_tree, ergo_tree_hash, explorer_uri } from "./envs";
import { ErgoAddress, SByte, SColl } from "@fleet-sdk/core";
import { blake2b256 } from "@fleet-sdk/crypto";
export async function fetchTypeNfts() {
    try {
        const fetchedTypesArray = [];
        let offset = 0;
        const limit = 100;
        let moreDataAvailable = true;
        while (moreDataAvailable) {
            const url = `${explorer_uri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
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
            const pageTypes = data.items.map((box) => {
                if (!box.assets || box.assets.length === 0)
                    return null;
                return {
                    tokenId: box.assets[0].tokenId,
                    boxId: box.boxId,
                    typeName: hexToUtf8(box.additionalRegisters.R4?.renderedValue || '') ?? "",
                    description: hexToUtf8(box.additionalRegisters.R5?.renderedValue || '') ?? "",
                    schemaURI: hexToUtf8(box.additionalRegisters.R6?.renderedValue || '') ?? "",
                    isRepProof: box.additionalRegisters.R7?.renderedValue ?? false,
                };
            }).filter((t) => t !== null);
            fetchedTypesArray.push(...pageTypes);
            offset += limit;
        }
        const typesMap = new Map(fetchedTypesArray.map(type => [type.tokenId, type]));
        types.set(typesMap);
        console.log(`Successfully fetched and stored ${typesMap.size} Type NFTs.`);
    }
    catch (e) {
        console.error("Failed to fetch and store types:", e);
        types.set(new Map());
    }
}
export async function updateReputationProofList(ergo, all, search) {
    await fetchTypeNfts();
    const availableTypes = get(types);
    if (!get(connected))
        all = true;
    const proofs = new Map();
    const search_bodies = [];
    let r7_filter = {};
    let userR7SerializedHex = null;
    const change_address = get(connected) && ergo ? await ergo.get_change_address() : null;
    if (change_address) {
        const userAddress = ErgoAddress.fromBase58(change_address);
        const propositionBytes = hexToBytes(userAddress.ergoTree);
        if (propositionBytes) {
            userR7SerializedHex = SColl(SByte, propositionBytes).toHex();
            if (!all) {
                r7_filter = { "R7": userR7SerializedHex };
            }
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
    }
    else {
        search_bodies.push({});
    }
    try {
        for (const body_part of search_bodies) {
            let offset = 0, limit = 100, moreDataAvailable = true;
            while (moreDataAvailable) {
                const url = `${explorer_uri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${limit}`;
                const final_body = { "ergoTreeTemplateHash": ergo_tree_hash, "registers": { ...(body_part.registers || {}), ...r7_filter }, "assets": body_part.assets || [] };
                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(final_body) });
                if (!response.ok) {
                    moreDataAvailable = false;
                    continue;
                }
                const json_data = await response.json();
                if (json_data.items.length === 0) {
                    moreDataAvailable = false;
                    continue;
                }
                for (const box of json_data.items) {
                    if (box.ergoTree != ergo_tree)
                        continue;
                    if (!box.assets?.length || !box.additionalRegisters.R4 || !box.additionalRegisters.R6 || !box.additionalRegisters.R7)
                        continue;
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
                        const tokenResponse = await fetch(`${explorer_uri}/api/v1/tokens/${rep_token_id}`);
                        if (!tokenResponse.ok) {
                            console.error(`Error al obtener la cantidad emitida del token ${rep_token_id}`);
                            continue;
                        }
                        const tokenData = await tokenResponse.json();
                        const emissionAmount = Number(tokenData.emissionAmount || 0);
                        proof = {
                            token_id: rep_token_id,
                            type: { tokenId: "", boxId: '', typeName: "N/A", description: "...", schemaURI: "", isRepProof: false },
                            total_amount: emissionAmount,
                            owner_address: serializedToRendered(owner_serialized),
                            owner_serialized: owner_serialized,
                            can_be_spend: userR7SerializedHex ? owner_serialized === userR7SerializedHex : false,
                            current_boxes: [],
                            number_of_boxes: 0,
                            network: Network.ErgoMainnet,
                            data: {}
                        };
                        proofs.set(rep_token_id, proof);
                    }
                    const type_nft_id_for_box = box.additionalRegisters.R4.renderedValue ?? "";
                    let typeNftForBox = availableTypes.get(type_nft_id_for_box);
                    if (!typeNftForBox) {
                        typeNftForBox = { tokenId: type_nft_id_for_box, boxId: '', typeName: "Unknown Type", description: "Metadata not found", schemaURI: "", isRepProof: false };
                    }
                    let box_content = {};
                    try {
                        const rawValue = box.additionalRegisters.R9?.renderedValue;
                        if (rawValue) {
                            const potentialString = hexToUtf8(rawValue);
                            try {
                                box_content = JSON.parse(potentialString ?? "");
                            }
                            catch (jsonError) {
                                box_content = potentialString;
                            }
                        }
                    }
                    catch (error) {
                        box_content = {};
                    }
                    const object_pointer_for_box = hexToBytes(box.additionalRegisters.R5?.renderedValue ?? "") ?? "";
                    const current_box = {
                        box: {
                            boxId: box.boxId, value: box.value, assets: box.assets, ergoTree: box.ergoTree, creationHeight: box.creationHeight,
                            additionalRegisters: Object.entries(box.additionalRegisters).reduce((acc, [key, value]) => { acc[key] = value.serializedValue; return acc; }, {}),
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
                        proof.type = typeNftForBox;
                    }
                    proof.current_boxes.push(current_box);
                    proof.number_of_boxes += 1;
                }
                offset += limit;
            }
        }
        return proofs;
    }
    catch (error) {
        console.error('An error occurred during the reputation proof search:', error);
        return new Map();
    }
}
/**
 * Retrieves all boxes (RPBox) associated with a specific ReputationProof.
 * @param proof The ReputationProof object from which to extract the boxes.
 * @returns An array of RPBox objects.
 */
export function getAllRPBoxesFromProof(proof) {
    return proof.current_boxes;
}
/**
 * Finds and returns the ReputationProof to which a specific RPBox belongs.
 * This function retrieves the complete map of proofs from the 'proofs' Svelte store.
 * @param box The RPBox for which to find its parent ReputationProof.
 * @returns The corresponding ReputationProof or 'undefined' if not found.
 */
export function getReputationProofFromRPBox(box) {
    return get(proofs).get(box.token_id);
}
