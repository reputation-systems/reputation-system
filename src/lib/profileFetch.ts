import { parseCollByteToHex, hexToBytes, hexToUtf8, serializedToRendered } from './utils';
import {
    explorer_uri,
    ergo_tree_hash
} from './envs';
import { ErgoAddress, SByte, SColl } from '@fleet-sdk/core';
import { type RPBox, type TypeNFT, type ReputationProof, type ApiBox } from './ReputationProof';

const API_BATCH_SIZE = 100; // Max items per request allowed by Explorer usually

// --- Helper Functions ---

/**
 * Converts an ApiBox to an RPBox (Reputation Proof Box).
 */
export function convertToRPBox(box: ApiBox, token_id: string, availableTypes: Map<string, TypeNFT>): RPBox | null {
    if (!box.assets?.length || box.assets[0].tokenId !== token_id) {
        return null; // Silent skip for efficiency
    }

    if (!box.additionalRegisters.R4 || !box.additionalRegisters.R5 || !box.additionalRegisters.R6) {
        console.warn(`convertToRPBox: Box ${box.boxId} lacks required registers. Skipping.`);
        return null;
    }

    const typeNftId = parseCollByteToHex(box.additionalRegisters.R4.renderedValue) ?? '';
    const typeNft: TypeNFT = availableTypes.get(typeNftId) ?? {
        tokenId: typeNftId,
        boxId: '',
        typeName: 'Unknown Type',
        description: '...',
        schemaURI: '',
        isRepProof: false,
    };

    let boxContent: string | object | null = null;
    try {
        const rawValue = box.additionalRegisters.R9?.renderedValue;
        if (rawValue) {
            const potentialString = hexToUtf8(rawValue);
            if (potentialString) {
                try {
                    boxContent = JSON.parse(potentialString);
                } catch {
                    boxContent = potentialString;
                }
            }
        }
    } catch (e) {
        console.error(`convertToRPBox: Error parsing R9 for box ${box.boxId}`, e);
    }

    const objectPointer = parseCollByteToHex(box.additionalRegisters.R5?.renderedValue) ?? '';

    return {
        box: {
            boxId: box.boxId,
            value: box.value as any,
            assets: box.assets as any,
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
        token_id: token_id,
        token_amount: Number(box.assets[0].amount),
        object_pointer: objectPointer,
        is_locked: box.additionalRegisters.R6.renderedValue === 'true',
        polarization: box.additionalRegisters.R8?.renderedValue === 'true',
        content: boxContent,
    };
}

/**
 * Gets the current user's R7 serialized value (ErgoTree of their address).
 */
async function getSerializedR7(): Promise<{ changeAddress: string; r7SerializedHex: string } | null> {
    // @ts-ignore
    const ergo = window.ergo;
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
        const r7SerializedHex = SColl(SByte, userAddress.ergoTree).toHex();
        return { changeAddress, r7SerializedHex };
    } catch (e) {
        console.error("getSerializedR7: Error obtaining user address", e);
        return null;
    }
}

/**
 * Fetch token emission amount.
 */
async function fetchTokenEmissionAmount(explorerUri: string, tokenId: string): Promise<number | null> {
    try {
        const response = await fetch(`${explorerUri}/api/v1/tokens/${tokenId}`);
        if (!response.ok) return null;
        const tokenData = await response.json();
        return Number(tokenData.emissionAmount || 0);
    } catch (e) {
        console.error(`fetchTokenEmissionAmount: Error fetching token ${tokenId}`, e);
        return null;
    }
}

/**
 * Fetch all boxes belonging to a specific token ID.
 */
async function fetchAllBoxesByTokenId(explorerUri: string, tokenId: string): Promise<ApiBox[]> {
    const allBoxes: ApiBox[] = [];
    let offset = 0;
    let moreDataAvailable = true;

    while (moreDataAvailable) {
        const url = `${explorerUri}/api/v1/boxes/unspent/byTokenId/${tokenId}?offset=${offset}&limit=${API_BATCH_SIZE}`;
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
            offset += API_BATCH_SIZE;
        } catch (e) {
            moreDataAvailable = false;
        }
    }
    return allBoxes;
}

// --- Core Search Logic ---

/**
 * Generic fetcher for Reputation Boxes.
 * Can filter by R7 (User specific) or fetch globally (if r7SerializedHex is null).
 * Handles pagination and client-side filtering.
 */
async function fetchReputationBoxes(
    explorerUri: string,
    r7SerializedHex: string | null, // Pass null for Global fetch
    is_self_defined: boolean | null = null,
    types: string[] = [],
    limit: number = 50,
    offset: number = 0
): Promise<ApiBox[]> {
    const allBoxes: ApiBox[] = [];
    
    // Determine registers to filter by in the API call
    const baseRegisters: any = {};
    if (r7SerializedHex) {
        baseRegisters.R7 = serializedToRendered(r7SerializedHex);
    }

    const typesToSearch = types.length > 0 ? types : [null];
    
    // We loop through types (or run once if no types)
    // Note: Pagination across multiple "Types" queries is complex. 
    // Simplified strategy: We fetch potentially more than needed and slice the result.
    
    for (const typeNftId of typesToSearch) {
        let internalOffset = offset; 
        let itemsCollected = 0;
        let moreDataAvailable = true;

        const currentSearchRegisters = { ...baseRegisters };
        if (typeNftId) {
            currentSearchRegisters.R4 = typeNftId;
        }

        // Keep fetching until we satisfy the limit or run out of data
        while (moreDataAvailable && itemsCollected < limit) {
            const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=${internalOffset}&limit=${API_BATCH_SIZE}`;
            const body = {
                ergoTreeTemplateHash: ergo_tree_hash,
                registers: currentSearchRegisters,
                assets: [], // We don't filter by specific asset ID here, we filter by contract + registers
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    console.error(`fetchReputationBoxes: API Error: ${response.statusText}`);
                    moreDataAvailable = false;
                    continue;
                }

                const jsonData = await response.json();
                if (!jsonData.items || jsonData.items.length === 0) {
                    moreDataAvailable = false;
                    continue;
                }

                // Client-side filtering
                const validBoxes = jsonData.items.filter((box: ApiBox) => {
                    if (!box.additionalRegisters.R4 || !box.additionalRegisters.R5 || !box.assets?.length) return false;

                    const boxTypeNftId = parseCollByteToHex(box.additionalRegisters.R4.renderedValue);
                    const boxObjectPointer = parseCollByteToHex(box.additionalRegisters.R5.renderedValue);
                    const tokenId = box.assets[0].tokenId;
                    const isLocked = box.additionalRegisters.R6.renderedValue === 'true';

                    // Standard validity check
                    if (box.additionalRegisters.R6.renderedValue !== 'false' && box.additionalRegisters.R6.renderedValue !== 'true') return false; 
                    // Note: original code checked strictly for 'false' in one place but 'true' for locked. 
                    // Usually RepProof boxes are R6=false (spendable) or true (locked). Assuming we want both to show the profile.
                    // If we strictly want only 'false' as per original logic:
                    if (box.additionalRegisters.R6.renderedValue !== 'false') return false;


                    // Self-defined logic
                    if (is_self_defined === true && boxObjectPointer !== tokenId) return false;
                    if (is_self_defined === false && boxObjectPointer === tokenId) return false;

                    // Type logic (Double check if API didn't filter strictly)
                    if (types.length > 0 && !types.includes(boxTypeNftId ?? '')) return false;

                    return true;
                });

                allBoxes.push(...validBoxes);
                itemsCollected += validBoxes.length;
                internalOffset += API_BATCH_SIZE;

                // Optimization: If we found nothing valid in a full batch, we might be scanning a lot of garbage.
                // In a production app, you might want a max-scan safety break here.

            } catch (e) {
                console.error("fetchReputationBoxes: Network error", e);
                moreDataAvailable = false;
            }
        }
    }

    // Deduplicate (in case multiple type searches overlap, though unlikely with R4 filter)
    const uniqueBoxes = Array.from(new Map(allBoxes.map(box => [box.boxId, box])).values());
    
    // Sort by creation height (newest first)
    uniqueBoxes.sort((a, b) => b.creationHeight - a.creationHeight);

    // Apply the final limit requested by the user
    return uniqueBoxes.slice(0, limit);
}


/**
 * Private helper to build ReputationProof objects from a list of boxes.
 */
async function _buildReputationProofs(
    explorerUri: string,
    initialBoxes: ApiBox[],
    availableTypes: Map<string, TypeNFT>,
    knownOwner?: { address: string, serialized: string }
): Promise<ReputationProof[]> {
    if (initialBoxes.length === 0) return [];

    // Group boxes by token ID
    const boxesByTokenId = new Map<string, ApiBox[]>();
    for (const box of initialBoxes) {
        const tokenId = box.assets[0].tokenId;
        if (!boxesByTokenId.has(tokenId)) {
            boxesByTokenId.set(tokenId, []);
        }
        boxesByTokenId.get(tokenId)!.push(box);
    }

    const profilePromises = Array.from(boxesByTokenId.entries()).map(async ([tokenId, userBoxes]) => {
        // Fetch detailed data for this token
        const [emissionAmount, allProfileBoxes] = await Promise.all([
            fetchTokenEmissionAmount(explorerUri, tokenId),
            fetchAllBoxesByTokenId(explorerUri, tokenId)
        ]);

        if (emissionAmount === null) return null;

        // Determine Owner
        let ownerAddress = knownOwner?.address ?? "";
        let ownerSerialized = knownOwner?.serialized ?? "";

        // If global fetch (no knownOwner), extract from R7
        if (!knownOwner && userBoxes.length > 0) {
            const r7 = userBoxes[0].additionalRegisters.R7;
            if (r7) {
                ownerSerialized = r7.serializedValue;
                try {
                    // Convert renderedValue (hex) to ErgoAddress if possible, or use ErgoTree
                    // Note: R7 is usually the ErgoTree.
                    const ergoTree = r7.renderedValue; 
                    const addressObj = ErgoAddress.fromErgoTree(ergoTree);
                    ownerAddress = addressObj.toString();
                } catch (e) {
                    ownerAddress = "Unknown Address";
                }
            }
        }

        const proof: ReputationProof = {
            token_id: tokenId,
            types: [],
            data: {},
            total_amount: emissionAmount,
            owner_address: ownerAddress,
            owner_serialized: ownerSerialized,
            can_be_spend: true, // For global view, we might want to calculate this based on if wallet is connected
            current_boxes: [],
            number_of_boxes: 0,
            network: "ergo"
        };

        const uniqueTypeIds = new Set<string>();

        // Process all boxes associated with this profile (token)
        for (const box of allProfileBoxes) {
            const rpbox = convertToRPBox(box, tokenId, availableTypes);
            if (rpbox) {
                proof.current_boxes.push(rpbox);
                proof.number_of_boxes += 1;

                if (rpbox.object_pointer === tokenId) {
                    const typeId = rpbox.type.tokenId;
                    if (!uniqueTypeIds.has(typeId)) {
                        uniqueTypeIds.add(typeId);
                        proof.types.push(rpbox.type);
                    }
                }
            }
        }

        // Fallback type extraction from the initial user boxes if none found in loop
        if (proof.types.length === 0 && userBoxes.length > 0) {
            const firstBoxTypeId = parseCollByteToHex(userBoxes[0].additionalRegisters.R4.renderedValue) ?? '';
            const fallbackType = availableTypes.get(firstBoxTypeId);
            if (fallbackType) proof.types.push(fallbackType);
        }

        return proof;
    });

    const results = await Promise.all(profilePromises);
    const profiles = results.filter(p => p !== null) as ReputationProof[];

    // Sort profiles by Total ERG Value (Burned/Locked)
    profiles.sort((a, b) => {
        const totalA = a.current_boxes.reduce((acc, box) => acc + BigInt(box.box.value), BigInt(0));
        const totalB = b.current_boxes.reduce((acc, box) => acc + BigInt(box.box.value), BigInt(0));
        return totalA > totalB ? -1 : totalA < totalB ? 1 : 0;
    });

    return profiles;
}

// --- Exposed Functions ---

/**
 * Fetches all ReputationProof objects for the connected user.
 */
export async function fetchAllUserProfiles(
    explorerUri: string,
    is_self_defined: boolean | null = null,
    types: string[] = [],
    availableTypes: Map<string, TypeNFT>,
    limit: number = 50,
    offset: number = 0
): Promise<ReputationProof[]> {
    try {
        const r7Data = await getSerializedR7();
        if (!r7Data) return [];
        
        const { changeAddress, r7SerializedHex } = r7Data;
        console.log(`Fetching profiles for User R7: ${r7SerializedHex}, Limit: ${limit}`);

        const userBoxes = await fetchReputationBoxes(explorerUri, r7SerializedHex, is_self_defined, types, limit, offset);
        
        if (userBoxes.length === 0) return [];

        const profiles = await _buildReputationProofs(
            explorerUri,
            userBoxes,
            availableTypes,
            { address: changeAddress, serialized: r7SerializedHex }
        );

        return profiles;
    } catch (error) {
        console.error('Error fetching user profiles:', error);
        return [];
    }
}

/**
 * Fetches ALL ReputationProof objects in the network (Global view).
 * Does not filter by R7.
 */
export async function fetchAllProfiles(
    explorerUri: string,
    is_self_defined: boolean | null = null,
    types: string[] = [],
    availableTypes: Map<string, TypeNFT>,
    limit: number = 50,
    offset: number = 0
): Promise<ReputationProof[]> {
    try {
        console.log(`Fetching ALL global profiles. Limit: ${limit}`);

        // Pass null as r7SerializedHex to indicate global search
        const globalBoxes = await fetchReputationBoxes(explorerUri, null, is_self_defined, types, limit, offset);

        if (globalBoxes.length === 0) return [];

        const profiles = await _buildReputationProofs(
            explorerUri, 
            globalBoxes, 
            availableTypes
            // No known owner passed
        );

        return profiles;
    } catch (error) {
        console.error('Error fetching global profiles:', error);
        return [];
    }
}