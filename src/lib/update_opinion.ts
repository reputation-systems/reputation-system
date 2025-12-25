import {
    OutputBuilder,
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
import { type RPBox } from '$lib/ReputationProof';

declare const ergo: any;

/**
 * Updates an existing opinion box by recreating it with modified parameters.
 * The main_box is optional and only required if token_amount_delta is non-zero.
 * 
 * @param opinion_box The existing opinion box to update (must not be locked).
 * @param polarization Optional new polarization value (true = positive, false = negative).
 * @param content Optional new content (text, JSON object, or null). Pass undefined to keep existing.
 * @param token_amount_delta Change in reputation tokens: positive to add, negative to remove. Requires main_box.
 * @param extra_erg Optional extra ERG to add on top of the existing opinion_box value.
 * @param is_locked Optional flag to lock the opinion box (only false -> true transition allowed).
 * @param main_box Optional main box to use for reputation token adjustments. Required if token_amount_delta != 0.
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes.
 * @returns The transaction ID if successful, otherwise null.
 */
export async function update_opinion(
    opinion_box: RPBox,
    polarization?: boolean,
    content?: object | string | null,
    token_amount_delta: number = 0,
    extra_erg: bigint = 0n,
    is_locked?: boolean,
    main_box?: RPBox,
    explorerUri: string = ""
): Promise<string | null> {

    // Validate: opinion_box must not be locked
    if (opinion_box.is_locked) {
        throw new Error("Cannot update a locked opinion box. Locked boxes are immutable.");
    }

    // Validate: if there's a delta, main_box is required
    if (token_amount_delta !== 0 && !main_box) {
        throw new Error("main_box is required when token_amount_delta is non-zero.");
    }

    // Validate: both boxes must belong to the same reputation proof (same token_id)
    if (main_box && opinion_box.token_id !== main_box.token_id) {
        throw new Error(`Token ID mismatch: opinion_box has ${opinion_box.token_id}, main_box has ${main_box.token_id}. Both must belong to the same reputation proof.`);
    }

    console.log("Updating opinion with parameters:", {
        opinion_box,
        main_box,
        polarization,
        content,
        token_amount_delta,
        extra_erg,
        is_locked,
        explorerUri
    });

    console.log("Ergo Tree Address:", ergo_tree_address);

    const creatorAddressString = await ergo.get_change_address();
    if (!creatorAddressString) {
        throw new Error("Could not get the creator's address from the wallet.");
    }
    const creatorP2PKAddress = ErgoAddress.fromBase58(creatorAddressString);

    // Fetch the Type NFT boxes to be used in dataInputs
    const typeTokenIds = new Set<string>();
    typeTokenIds.add(opinion_box.type.tokenId);
    if (main_box) typeTokenIds.add(main_box.type.tokenId);

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
    const inputs: Box<Amount>[] = main_box
        ? [opinion_box.box, main_box.box, ...utxos]
        : [opinion_box.box, ...utxos];
    const outputs: OutputBuilder[] = [];

    const reputationTokenId = opinion_box.token_id;

    // Calculate current reputation amounts
    const opinionCurrentReputation = opinion_box.box.assets.reduce((sum, asset) => {
        return asset.tokenId === reputationTokenId ? sum + BigInt(asset.amount) : sum;
    }, 0n);

    const mainCurrentReputation = main_box
        ? main_box.box.assets.reduce((sum, asset) => {
            return asset.tokenId === reputationTokenId ? sum + BigInt(asset.amount) : sum;
        }, 0n)
        : 0n;

    // Calculate new reputation amounts
    const delta = BigInt(token_amount_delta);
    const opinionNewReputation = opinionCurrentReputation + delta;
    const mainNewReputation = mainCurrentReputation - delta;

    // Validate reputation amounts
    if (opinionNewReputation < 0n) {
        throw new Error(`Cannot remove more tokens than available. Opinion box has ${opinionCurrentReputation}, trying to remove ${-delta}`);
    }
    if (main_box && mainNewReputation < 0n) {
        throw new Error(`Cannot add more tokens than available in main box. Main box has ${mainCurrentReputation}, trying to add ${delta}`);
    }

    // --- Build OPINION BOX output (the updated box) ---
    const opinionBoxValue = BigInt(opinion_box.box.value) + extra_erg;
    const opinion_box_output = new OutputBuilder(opinionBoxValue, ergo_tree_address);

    // Add reputation tokens
    if (opinionNewReputation > 0n) {
        opinion_box_output.addTokens({ tokenId: reputationTokenId, amount: opinionNewReputation.toString() });
    }

    // Add all non-reputation tokens from opinion_box (keep them)
    for (const asset of opinion_box.box.assets) {
        if (asset.tokenId !== reputationTokenId) {
            opinion_box_output.addTokens({ tokenId: asset.tokenId, amount: asset.amount.toString() });
        }
    }

    // Get proposition bytes for R7
    const propositionBytes = hexToBytes(creatorP2PKAddress.ergoTree);
    if (!propositionBytes) {
        throw new Error(`Could not get proposition bytes from address ${creatorAddressString}.`);
    }

    // Determine final values (use new value if provided, otherwise keep existing)
    const finalPolarization = polarization !== undefined ? polarization : opinion_box.polarization;
    const finalIsLocked = is_locked !== undefined ? is_locked : opinion_box.is_locked;

    // For content: undefined means keep existing, null means clear it
    let raw_content: string;
    if (content === undefined) {
        // Keep existing content - extract from R9
        const existingContent = opinion_box.content;
        if (existingContent === null) {
            raw_content = "";
        } else if (typeof existingContent === "object") {
            raw_content = JSON.stringify(existingContent);
        } else {
            raw_content = existingContent;
        }
    } else if (content === null) {
        raw_content = "";
    } else if (typeof content === "object") {
        raw_content = JSON.stringify(content);
    } else {
        raw_content = content;
    }

    // Set registers for opinion box
    const opinion_registers = {
        R4: SColl(SByte, hexToBytes(opinion_box.type.tokenId) ?? "").toHex(),
        R5: SColl(SByte, hexOrUtf8ToBytes(opinion_box.object_pointer) ?? "").toHex(),
        R6: SBool(finalIsLocked).toHex(),
        R7: SColl(SByte, propositionBytes).toHex(),
        R8: SBool(finalPolarization).toHex(),
        R9: SColl(SByte, stringToBytes("utf8", raw_content)).toHex(),
    };
    opinion_box_output.setAdditionalRegisters(opinion_registers);

    outputs.push(opinion_box_output);

    // --- Build MAIN BOX output (only if main_box is provided) ---
    if (main_box) {
        const main_box_output = new OutputBuilder(main_box.box.value, ergo_tree_address);

        // Add adjusted reputation tokens
        if (mainNewReputation > 0n) {
            main_box_output.addTokens({ tokenId: reputationTokenId, amount: mainNewReputation.toString() });
        }

        // Add all non-reputation tokens from main_box (keep them exactly)
        for (const asset of main_box.box.assets) {
            if (asset.tokenId !== reputationTokenId) {
                main_box_output.addTokens({ tokenId: asset.tokenId, amount: asset.amount.toString() });
            }
        }

        // Keep all registers from main_box exactly as they were
        main_box_output.setAdditionalRegisters(main_box.box.additionalRegisters);

        outputs.push(main_box_output);
    }

    console.log("Inputs:", inputs);
    console.log("Outputs:", outputs);

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
