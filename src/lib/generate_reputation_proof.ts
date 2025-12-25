import {
    OutputBuilder,
    SAFE_MIN_BOX_VALUE,
    RECOMMENDED_MIN_FEE_VALUE,
    TransactionBuilder,
    type Box,
    type Amount,
    ErgoAddress,
    SColl,
    SByte,
    SBool
} from '@fleet-sdk/core';
import { ergo_tree_address } from './envs';
import { hexToBytes, hexOrUtf8ToBytes } from './utils';
import { stringToBytes } from '@scure/base';
import { RPBox } from './ReputationProof';

declare const ergo: any;

/**
 * Generates or modifies a reputation proof by building and submitting a transaction.
 * @param token_amount The amount of the token for the new proof box.
 * @param total_supply The total supply of the reputation token set.
 * @param type_nft_id The token ID of the Type NFT that defines the standard for this proof.
 * @param object_pointer The object this proof is about (e.g., a URL, another token ID).
 * @param polarization `true` for a positive proof, `false` for a negative one.
 * @param content The JSON or string content for register R9.
 * @param is_locked `true` to make the resulting box immutable.
 * @param opinion_box The existing RPBox to spend from (for splitting or modifying).
 * @param main_boxes Additional RPBoxes to merge into the new proof.
 * @param extra_erg Optional extra ERG to add to the proof (sacrificed).
 * @param extra_tokens Optional extra tokens to add to the proof (sacrificed).
 * @param explorerUri Optional explorer URI to use for fetching the Type NFT box.
 * @returns A promise that resolves to the transaction ID string, or null on failure.
 */
export async function generate_reputation_proof(
    token_amount: number,
    total_supply: number,
    type_nft_id: string,
    object_pointer: string | undefined,
    polarization: boolean,
    content: object | string | null,
    is_locked: boolean = false,
    opinion_box?: RPBox,
    main_boxes?: RPBox[],
    extra_erg: Amount = 0n,
    extra_tokens: { tokenId: string, amount: Amount }[] = [],
    explorerUri: string = ""
): Promise<string | null> {


    console.log("Generating reputation proof with parameters:", {
        token_amount,
        total_supply,
        type_nft_id,
        object_pointer,
        polarization,
        content,
        is_locked,
        opinion_box,
        main_boxes,
        extra_erg,
        extra_tokens,
        explorerUri
    });

    console.log("Ergo Tree Address:", ergo_tree_address);

    const creatorAddressString = await ergo.get_change_address();
    if (!creatorAddressString) {
        throw new Error("Could not get the creator's address from the wallet.");
    }
    const creatorP2PKAddress = ErgoAddress.fromBase58(creatorAddressString);

    // Fetch the Type NFT boxes to be used in dataInputs. This is required by the contract.
    const typeTokenIds = new Set<string>();
    typeTokenIds.add(type_nft_id);
    if (opinion_box) typeTokenIds.add(opinion_box.type.tokenId);
    if (main_boxes) main_boxes.forEach(b => typeTokenIds.add(b.type.tokenId));

    const dataInputs: any[] = [];
    for (const tokenId of typeTokenIds) {
        const response = await fetch(`${explorerUri}/api/v1/boxes/byTokenId/${tokenId}`);
        if (response.ok) {
            const box = (await response.json()).items[0];
            if (box) dataInputs.push(box);
        }
    }

    console.log("Data Inputs (Type NFTs):", dataInputs);

    // Inputs for the transaction
    const utxos = await ergo.get_utxos();
    const inputs: Box<Amount>[] = opinion_box ? [opinion_box.box, ...utxos] : utxos;
    if (main_boxes) {
        inputs.push(...main_boxes.map(i => i.box));
    }

    const outputs: OutputBuilder[] = [];
    let opinion_box_output: OutputBuilder;
    let main_box_output: OutputBuilder | null = null;

    const reputationTokenId = opinion_box ? opinion_box.token_id : null;
    const allNonReputationTokens = new Map<string, bigint>();
    let totalReputationAvailable = 0n;

    // 1. Collect assets from opinion_box
    if (opinion_box) {
        opinion_box.box.assets.forEach(a => {
            if (a.tokenId === reputationTokenId) {
                totalReputationAvailable += BigInt(a.amount);
            } else {
                const current = allNonReputationTokens.get(a.tokenId) || 0n;
                allNonReputationTokens.set(a.tokenId, current + BigInt(a.amount));
            }
        });
    }

    // 2. Collect assets from main_boxes
    if (main_boxes) {
        main_boxes.forEach(box => {
            box.box.assets.forEach(a => {
                if (a.tokenId === reputationTokenId) {
                    totalReputationAvailable += BigInt(a.amount);
                } else {
                    // Move all non-reputation tokens to the opinion box as per request
                    const current = allNonReputationTokens.get(a.tokenId) || 0n;
                    allNonReputationTokens.set(a.tokenId, current + BigInt(a.amount));
                }
            });
        });
    }

    // 3. Collect extra_tokens (Sacrificed from wallet)
    if (extra_tokens) {
        extra_tokens.forEach(t => {
            const current = allNonReputationTokens.get(t.tokenId) || 0n;
            allNonReputationTokens.set(t.tokenId, current + BigInt(t.amount));
        });
    }

    // 4. Determine Reputation Distribution
    let targetOpinionReputation = BigInt(token_amount);
    let targetMainReputation = 0n;

    if (opinion_box) {
        if (totalReputationAvailable < targetOpinionReputation) {
            throw new Error(`Insufficient reputation tokens. Available: ${totalReputationAvailable}, Requested: ${targetOpinionReputation}`);
        }
        targetMainReputation = totalReputationAvailable - targetOpinionReputation;
    } else {
        // Minting case: We mint the full total_supply.
        // For simplicity in a single transaction, we'll put it all in the opinion_box for now.
        targetOpinionReputation = BigInt(total_supply);
        targetMainReputation = 0n;
    }

    // 5. Build Opinion Box (The Proof)
    const opinionBoxValue = (opinion_box ? BigInt(opinion_box.box.value) : BigInt(SAFE_MIN_BOX_VALUE)) + BigInt(extra_erg);
    opinion_box_output = new OutputBuilder(opinionBoxValue, ergo_tree_address);

    if (!opinion_box) {
        // Minting: The tokenId will be the ID of the first input
        opinion_box_output.mintToken({
            amount: targetOpinionReputation.toString(),
            name: "Reputation Proof Token"
        });
        if (!object_pointer) object_pointer = inputs[0].boxId;
    } else {
        opinion_box_output.addTokens({ tokenId: reputationTokenId!, amount: targetOpinionReputation.toString() });
        if (!object_pointer) object_pointer = reputationTokenId!;
    }

    // Add all non-reputation tokens to the opinion box
    for (const [tokenId, amount] of allNonReputationTokens) {
        opinion_box_output.addTokens({ tokenId, amount: amount.toString() });
    }
    outputs.push(opinion_box_output);

    // 6. Build Main Box (The Liquidity Buffer)
    if (targetMainReputation > 0n || (main_boxes && main_boxes.length > 0)) {
        const mainBoxValue = main_boxes && main_boxes.length > 0
            ? main_boxes.reduce((sum, b) => sum + BigInt(b.box.value), 0n)
            : BigInt(SAFE_MIN_BOX_VALUE);

        // Use registers from the first main_box, or fallback to opinion_box, or empty
        const mainBoxRegisters = main_boxes && main_boxes.length > 0
            ? main_boxes[0].box.additionalRegisters
            : (opinion_box ? opinion_box.box.additionalRegisters : {});

        main_box_output = new OutputBuilder(mainBoxValue, ergo_tree_address)
            .setAdditionalRegisters(mainBoxRegisters);

        if (opinion_box && targetMainReputation > 0n) {
            main_box_output.addTokens({ tokenId: reputationTokenId!, amount: targetMainReputation.toString() });
        }

        // Only push if we specifically want to recreate the main_box or it has reputation tokens
        if (targetMainReputation > 0n || (main_boxes && main_boxes.length > 0)) {
            outputs.push(main_box_output);
        }
    }

    const propositionBytes = hexToBytes(creatorP2PKAddress.ergoTree);
    if (!propositionBytes) {
        throw new Error(`Could not get proposition bytes from address ${creatorAddressString}.`);
    }

    const raw_content = typeof (content) === "object" ? JSON.stringify(content) : content ?? "";

    const new_registers = {
        R4: SColl(SByte, hexToBytes(type_nft_id) ?? "").toHex(),
        R5: SColl(SByte, hexOrUtf8ToBytes(object_pointer) ?? "").toHex(),
        R6: SBool(is_locked).toHex(),
        R7: SColl(SByte, propositionBytes).toHex(),
        R8: SBool(polarization).toHex(),
        R9: SColl(SByte, stringToBytes("utf8", raw_content)).toHex(),
    };

    console.log("New registers:", new_registers)

    opinion_box_output.setAdditionalRegisters(new_registers);

    // --- Build and submit the transaction ---
    try {
        const unsignedTransaction = await new TransactionBuilder(await ergo.get_current_height())
            .from(inputs)
            .to(outputs)
            .sendChangeTo(creatorP2PKAddress)
            .payFee(RECOMMENDED_MIN_FEE_VALUE)
            .withDataFrom(dataInputs)
            .build()
            .toEIP12Object();

        const signedTransaction = await ergo.sign_tx(unsignedTransaction);
        const transactionId = await ergo.submit_tx(signedTransaction);



        console.log("Transaction ID -> ", transactionId);
        return transactionId;
    } catch (e: any) {
        console.error("Error building or submitting transaction:", e);
        alert(`Transaction failed: ${e.message}`);
        return null;
    }
}
