import { get } from 'svelte/store';
import { parseCollByteToHex, hexToBytes, hexToUtf8, serializedToRendered } from './utils';
import {
    PROFILE_TYPE_NFT_ID,
    explorer_uri,
    ergo_tree_hash
} from './envs';
import { ErgoAddress, SByte, SColl } from '@fleet-sdk/core';
import { type RPBox, type TypeNFT, type ReputationProof, type ApiBox } from './ReputationProof';
import { proofs } from './store';


const LIMIT_PER_PAGE = 100;

// Convert ApiBox to RPBox
function convertToRPBox(box: ApiBox, profileTokenId: string): RPBox | null {
    if (!box.assets?.length || box.assets[0].tokenId !== profileTokenId) {
        console.warn(`convertToRPBox: Box ${box.boxId} has different token ID. Skipping.`);
        return null;
    }

    if (!box.additionalRegisters.R4 || !box.additionalRegisters.R5 || !box.additionalRegisters.R6) {
        console.warn(`convertToRPBox: Box ${box.boxId} lacks R4, R5, or R6. Skipping.`);
        return null;
    }

    const typeNftId = parseCollByteToHex(box.additionalRegisters.R4.renderedValue) ?? '';
    const typeNft: TypeNFT = {
        tokenId: typeNftId,
        boxId: '',
        typeName: typeNftId === PROFILE_TYPE_NFT_ID ? 'Profile' : 'Unknown Type',
        description: '...',
        schemaURI: '',
        isRepProof: false,
    };

    let boxContent: string | object | null = null;
    try {
        const rawValue = box.additionalRegisters.R9?.renderedValue;
        if (rawValue) {
            const potentialString = hexToUtf8(rawValue);
            try {
                boxContent = JSON.parse(potentialString);
            } catch {
                boxContent = potentialString;
            }
        }
    } catch (e) {
        console.error(`convertToRPBox: Error parsing R9 for box ${box.boxId}`, e);
    }

    const objectPointer = parseCollByteToHex(box.additionalRegisters.R5?.renderedValue) ?? '';

    return {
        box: {
            boxId: box.boxId,
            value: box.value,
            assets: box.assets,
            ergoTree: box.ergoTree,
            creationHeight: box.creationHeight,
            additionalRegisters: Object.entries(box.additionalRegisters).reduce(
                (acc, [key, value]) => ({ ...acc, [key]: value.serializedValue }),
                {} as { [key: string]: string }
            ),
            index: box.index,
            transactionId: box.transactionId,
        },
        box_id: box.boxId,
        type: typeNft,
        token_id: profileTokenId,
        token_amount: Number(box.assets[0].amount),
        object_pointer: objectPointer,
        is_locked: box.additionalRegisters.R6.renderedValue === 'true',
        polarization: box.additionalRegisters.R8?.renderedValue === 'true',
        content: boxContent,
    };
}

// Helper to get serialized R7
async function getSerializedR7(ergo: any): Promise<{ changeAddress: string; r7SerializedHex: string } | null> {
    if (!ergo) {
        console.error("getSerializedR7: 'ergo' object is not available.");
        return null;
    }

    try {
        const changeAddress = await ergo.get_change_address();
        if (!changeAddress) {
            console.warn("getSerializedR7: Could not obtain change address.");
            return null;
        }

        const userAddress = ErgoAddress.fromBase58(changeAddress);
        const propositionBytes = hexToBytes(userAddress.ergoTree);

        console.log("Ergotree ", userAddress.ergoTree);

        if (!propositionBytes) {
            console.error("getSerializedR7: Could not obtain propositionBytes.");
            return null;
        }

        const r7SerializedHex = SColl(SByte, userAddress.ergoTree).toHex();
        return { changeAddress, r7SerializedHex };
    } catch (e) {
        console.error("getSerializedR7: Error obtaining user address", e);
        return null;
    }
}

// Fetch all user boxes with pagination
async function fetchProfileUserBoxes(r7SerializedHex: string): Promise<ApiBox[]> {
    const allBoxes: ApiBox[] = [];
    let offset = 0;
    let moreDataAvailable = true;

    const searchBody: SearchBody = {
        registers: {
            R7: serializedToRendered(r7SerializedHex),
            R4: PROFILE_TYPE_NFT_ID
        }
    };

    while (moreDataAvailable) {
        const url = `${get(explorer_uri)}/api/v1/boxes/unspent/search?offset=${offset}&limit=${LIMIT_PER_PAGE}`;
        const finalBody = {
            ergoTreeTemplateHash: ergo_tree_hash,
            registers: searchBody.registers,
            assets: [],
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalBody),
            });

            if (!response.ok) {
                console.error(`fetchAllUserBoxes: Error fetching boxes: ${response.statusText}`);
                moreDataAvailable = false;
                continue;
            }

            const jsonData = await response.json();
            if (!jsonData.items || jsonData.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }

            const filteredBoxes = jsonData.items
                .filter((box: ApiBox) =>
                    parseCollByteToHex(box.additionalRegisters.R4.renderedValue) === PROFILE_TYPE_NFT_ID &&
                    parseCollByteToHex(box.additionalRegisters.R5.renderedValue) === box.assets[0].tokenId &&
                    box.additionalRegisters.R6.renderedValue === 'false'
                )
                .sort((a: ApiBox, b: ApiBox) => b.creationHeight - a.creationHeight);

            allBoxes.push(...filteredBoxes as ApiBox[]);
            offset += LIMIT_PER_PAGE;
        } catch (e) {
            console.error("fetchAllUserBoxes: Error during fetch", e);
            moreDataAvailable = false;
        }
    }

    console.log(allBoxes.map(box => box.additionalRegisters.R5.renderedValue))
    console.log(allBoxes.map(box => box.boxId))

    return allBoxes;
}

// Fetch token emission amount
async function fetchTokenEmissionAmount(tokenId: string): Promise<number | null> {
    try {
        const response = await fetch(`${get(explorer_uri)}/api/v1/tokens/${tokenId}`);
        if (!response.ok) {
            console.error(`fetchTokenEmissionAmount: Error fetching token ${tokenId}: ${response.statusText}`);
            return null;
        }
        const tokenData = await response.json();
        return Number(tokenData.emissionAmount || 0);
    } catch (e) {
        console.error(`fetchTokenEmissionAmount: Error fetching token ${tokenId}`, e);
        return null;
    }
}

// Fetch all boxes for a specific token ID
async function fetchAllBoxesByTokenId(tokenId: string): Promise<ApiBox[]> {
    const allBoxes: ApiBox[] = [];
    let offset = 0;
    let moreDataAvailable = true;

    while (moreDataAvailable) {
        const url = `${get(explorer_uri)}/api/v1/boxes/unspent/byTokenId/${tokenId}?offset=${offset}&limit=${LIMIT_PER_PAGE}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                moreDataAvailable = false;
                continue;
            }
            const jsonData = await response.json();
            if (!jsonData.items || jsonData.items.length === 0) {
                moreDataAvailable = false;
                continue;
            }
            allBoxes.push(...jsonData.items);
            offset += LIMIT_PER_PAGE;
        } catch (e) {
            moreDataAvailable = false;
        }
    }
    return allBoxes;
}

/**
 * Fetches the full ReputationProof object for the connected user,
 * by searching all boxes where R7 matches their wallet address.
 * @param ergo The connected wallet object (e.g., dApp Connector)
 */
export async function fetchProfile(ergo: any): Promise<ReputationProof | null> {
    try {
        const r7Data = await getSerializedR7(ergo);
        if (!r7Data) {
            proofs.set(null);
            return null;
        }
        const { changeAddress, r7SerializedHex } = r7Data;
        console.log(`Fetching profile for R7: ${r7SerializedHex}`);

        const allUserBoxes = await fetchProfileUserBoxes(r7SerializedHex);
        if (allUserBoxes.length === 0) {
            console.log('No profile boxes found for this user.');
            proofs.set(null);
            return null;
        }

        const first_box = allUserBoxes[0];
        const profileTokenId = first_box.assets[0].tokenId;

        const emissionAmount = await fetchTokenEmissionAmount(profileTokenId);
        if (emissionAmount === null) {
            proofs.set(null);
            console.warn("fetchTokenEmissionAmount returned null.")
            return null;
        }

        // Fetch ALL boxes for this profile token to have the complete proof
        const allProfileBoxes = await fetchAllBoxesByTokenId(profileTokenId);

        const proof: ReputationProof = {
            token_id: profileTokenId,
            type: {
                tokenId: PROFILE_TYPE_NFT_ID,
                boxId: '',
                typeName: 'Profile',
                description: 'User profile reputation proof',
                schemaURI: '',
                isRepProof: true
            },
            data: {},
            total_amount: emissionAmount,
            owner_address: changeAddress,
            owner_serialized: r7SerializedHex,
            can_be_spend: true,
            current_boxes: [],
            number_of_boxes: 0,
            network: "ergo"
        };

        for (const box of allProfileBoxes) {
            const rpbox = convertToRPBox(box, profileTokenId);
            if (rpbox) {
                proof.current_boxes.push(rpbox);
                proof.number_of_boxes += 1;
            }
        }

        console.log(`Profile found: ${proof.token_id}, ${proof.number_of_boxes} boxes.`, proof);
        proofs.set(proof);

        return proof;

    } catch (error) {
        console.error('Error fetching profile:', error);
        proofs.set(null);
        return null;
    }
}