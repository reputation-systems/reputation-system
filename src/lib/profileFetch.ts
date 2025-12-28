import { parseCollByteToHex, hexToBytes, hexToUtf8, serializedToRendered } from './utils';
import {
    explorer_uri,
    ergo_tree_hash
} from './envs';
import { ErgoAddress, SByte, SColl } from '@fleet-sdk/core';
import { type RPBox, type TypeNFT, type ReputationProof, type ApiBox } from './ReputationProof';


const LIMIT_PER_PAGE = 100;

// Convert ApiBox to RPBox
export function convertToRPBox(box: ApiBox, token_id: string, availableTypes: Map<string, TypeNFT>): RPBox | null {
    if (!box.assets?.length || box.assets[0].tokenId !== token_id) {
        console.warn(`convertToRPBox: Box ${box.boxId} has different token ID. Skipping.`);
        return null;
    }

    if (!box.additionalRegisters.R4 || !box.additionalRegisters.R5 || !box.additionalRegisters.R6) {
        console.warn(`convertToRPBox: Box ${box.boxId} lacks R4, R5, or R6. Skipping.`);
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

// Helper to get serialized R7
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
async function fetchProfileUserBoxes(
    explorerUri: string,
    r7SerializedHex: string,
    is_self_defined: boolean | null = null,
    types: string[] = []
): Promise<ApiBox[]> {
    const allBoxes: ApiBox[] = [];
    const searchRegisters: any = {
        R7: serializedToRendered(r7SerializedHex)
    };

    const typesToSearch = types.length > 0 ? types : [null];

    for (const typeNftId of typesToSearch) {
        let offset = 0;
        let moreDataAvailable = true;
        const currentSearchRegisters = { ...searchRegisters };
        if (typeNftId) {
            currentSearchRegisters.R4 = typeNftId;
        }

        while (moreDataAvailable) {
            const url = `${explorerUri}/api/v1/boxes/unspent/search?offset=${offset}&limit=${LIMIT_PER_PAGE}`;
            const finalBody = {
                ergoTreeTemplateHash: ergo_tree_hash,
                registers: currentSearchRegisters,
                assets: [],
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalBody),
                });

                if (!response.ok) {
                    console.error(`fetchProfileUserBoxes: Error fetching boxes: ${response.statusText}`);
                    moreDataAvailable = false;
                    continue;
                }

                const jsonData = await response.json();
                if (!jsonData.items || jsonData.items.length === 0) {
                    moreDataAvailable = false;
                    continue;
                }

                const filteredBoxes = jsonData.items
                    .filter((box: ApiBox) => {
                        if (!box.additionalRegisters.R4 || !box.additionalRegisters.R5 || !box.assets?.length) return false;

                        const boxTypeNftId = parseCollByteToHex(box.additionalRegisters.R4.renderedValue);
                        const boxObjectPointer = parseCollByteToHex(box.additionalRegisters.R5.renderedValue);
                        const tokenId = box.assets[0].tokenId;

                        // Basic validity check (R5 must be tokenId for self-defined, or something else for others)
                        // But wait, the original logic was:
                        // parseCollByteToHex(box.additionalRegisters.R5.renderedValue) === box.assets[0].tokenId &&
                        // box.additionalRegisters.R6.renderedValue === 'false'

                        if (box.additionalRegisters.R6.renderedValue !== 'false') return false;

                        if (is_self_defined === true && boxObjectPointer !== tokenId) return false;
                        if (is_self_defined === false && boxObjectPointer === tokenId) return false;

                        if (types.length > 0 && !types.includes(boxTypeNftId ?? '')) return false;

                        return true;
                    })
                    .sort((a: ApiBox, b: ApiBox) => b.creationHeight - a.creationHeight);

                allBoxes.push(...filteredBoxes as ApiBox[]);
                offset += LIMIT_PER_PAGE;
            } catch (e) {
                console.error("fetchProfileUserBoxes: Error during fetch", e);
                moreDataAvailable = false;
            }
        }
    }

    // Remove duplicates if any (could happen if searching multiple types and a box matches multiple, though unlikely with R4)
    const uniqueBoxes = Array.from(new Map(allBoxes.map(box => [box.boxId, box])).values());

    return uniqueBoxes;
}

// Fetch token emission amount
async function fetchTokenEmissionAmount(explorerUri: string, tokenId: string): Promise<number | null> {
    try {
        const response = await fetch(`${explorerUri}/api/v1/tokens/${tokenId}`);
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
async function fetchAllBoxesByTokenId(explorerUri: string, tokenId: string): Promise<ApiBox[]> {
    const allBoxes: ApiBox[] = [];
    let offset = 0;
    let moreDataAvailable = true;

    while (moreDataAvailable) {
        const url = `${explorerUri}/api/v1/boxes/unspent/byTokenId/${tokenId}?offset=${offset}&limit=${LIMIT_PER_PAGE}`;
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
 * Fetches all ReputationProof objects for the connected user,
 * by searching all boxes where R7 matches their wallet address.
 * Profiles are ordered by total ERG burned.
 */
export async function fetchAllProfiles(
    explorerUri: string,
    is_self_defined: boolean | null = null,
    types: string[] = [],
    availableTypes: Map<string, TypeNFT>
): Promise<ReputationProof[]> {
    try {
        const r7Data = await getSerializedR7();
        if (!r7Data) {
            return [];
        }
        const { changeAddress, r7SerializedHex } = r7Data;
        console.log(`Fetching all profiles for R7: ${r7SerializedHex}, is_self_defined: ${is_self_defined}, types: ${types}`);

        const allUserBoxes = await fetchProfileUserBoxes(explorerUri, r7SerializedHex, is_self_defined, types);
        if (allUserBoxes.length === 0) {
            console.log('No profile boxes found for this user.');
            return [];
        }

        // Group boxes by token ID (each token ID represents a profile)
        const boxesByTokenId = new Map<string, ApiBox[]>();
        for (const box of allUserBoxes) {
            const tokenId = box.assets[0].tokenId;
            if (!boxesByTokenId.has(tokenId)) {
                boxesByTokenId.set(tokenId, []);
            }
            boxesByTokenId.get(tokenId)!.push(box);
        }



        const profilePromises = Array.from(boxesByTokenId.entries()).map(async ([tokenId, userBoxes]) => {
            const [emissionAmount, allProfileBoxes] = await Promise.all([
                fetchTokenEmissionAmount(explorerUri, tokenId),
                fetchAllBoxesByTokenId(explorerUri, tokenId)
            ]);

            if (emissionAmount === null) return null;

            const proof: ReputationProof = {
                token_id: tokenId,
                types: [],
                data: {},
                total_amount: emissionAmount,
                owner_address: changeAddress,
                owner_serialized: r7SerializedHex,
                can_be_spend: true,
                current_boxes: [],
                number_of_boxes: 0,
                network: "ergo"
            };

            const uniqueTypeIds = new Set<string>();

            for (const box of allProfileBoxes) {
                const rpbox = convertToRPBox(box, tokenId, availableTypes);
                if (rpbox) {
                    proof.current_boxes.push(rpbox);
                    proof.number_of_boxes += 1;

                    // Aggregate types from boxes that point to self (R5 = tokenId)
                    if (rpbox.object_pointer === tokenId) {
                        const typeId = rpbox.type.tokenId;
                        if (!uniqueTypeIds.has(typeId)) {
                            uniqueTypeIds.add(typeId);
                            proof.types.push(rpbox.type);
                        }
                    }
                }
            }

            // Fallback: if no self-pointing boxes found (unlikely for a profile), 
            // use the type from the first user box we found
            if (proof.types.length === 0 && userBoxes.length > 0) {
                const firstBoxTypeId = parseCollByteToHex(userBoxes[0].additionalRegisters.R4.renderedValue) ?? '';
                const fallbackType = availableTypes.get(firstBoxTypeId);
                if (fallbackType) proof.types.push(fallbackType);
            }

            return proof;
        });

        const results = await Promise.all(profilePromises);
        const profiles = results.filter(p => p !== null) as ReputationProof[];

        // Sort profiles by total ERG burned (sum of all box values)
        profiles.sort((a, b) => {
            const totalA = a.current_boxes.reduce((acc, box) => acc + BigInt(box.box.value), BigInt(0));
            const totalB = b.current_boxes.reduce((acc, box) => acc + BigInt(box.box.value), BigInt(0));
            if (totalA > totalB) return -1;
            if (totalA < totalB) return 1;
            return 0;
        });

        console.log(`Found ${profiles.length} profiles.`, profiles);
        return profiles;

    } catch (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }
}
