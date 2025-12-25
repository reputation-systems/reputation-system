import {
    OutputBuilder,
    RECOMMENDED_MIN_FEE_VALUE,
    TransactionBuilder,
    type Box,
    type Amount,
    ErgoAddress
} from '@fleet-sdk/core';
import { ergo_tree_address } from './envs';
import { type RPBox } from '$lib/ReputationProof';

declare const ergo: any;

/**
 * Removes an opinion box by merging all its assets (ERG + tokens) into the main box.
 * The opinion box is consumed and not recreated, effectively deleting it.
 * The main box is recreated with the combined assets.
 * 
 * @param opinion_box The opinion box to remove (must not be locked).
 * @param main_box The main box to receive all assets from the opinion box.
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @returns The transaction ID if successful, otherwise null.
 */
export async function remove_opinion(
    opinion_box: RPBox,
    main_box: RPBox,
    explorerUri: string
): Promise<string | null> {

    // Validate: opinion_box must not be locked
    if (opinion_box.is_locked) {
        throw new Error("Cannot remove a locked opinion box. Locked boxes are immutable.");
    }

    // Validate: both boxes must belong to the same reputation proof (same token_id)
    if (opinion_box.token_id !== main_box.token_id) {
        throw new Error(`Token ID mismatch: opinion_box has ${opinion_box.token_id}, main_box has ${main_box.token_id}. Both must belong to the same reputation proof.`);
    }

    console.log("Removing opinion with parameters:", {
        opinion_box,
        main_box,
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
    typeTokenIds.add(main_box.type.tokenId);

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
    const inputs: Box<Amount>[] = [opinion_box.box, main_box.box, ...utxos];

    // Combine all tokens from both boxes
    const combinedTokens = new Map<string, bigint>();

    // Add tokens from opinion_box
    for (const asset of opinion_box.box.assets) {
        const current = combinedTokens.get(asset.tokenId) || 0n;
        combinedTokens.set(asset.tokenId, current + BigInt(asset.amount));
    }

    // Add tokens from main_box
    for (const asset of main_box.box.assets) {
        const current = combinedTokens.get(asset.tokenId) || 0n;
        combinedTokens.set(asset.tokenId, current + BigInt(asset.amount));
    }

    // Combine ERG values
    const combinedErgValue = BigInt(opinion_box.box.value) + BigInt(main_box.box.value);

    // --- Build MAIN BOX output (recreated with combined assets) ---
    const main_box_output = new OutputBuilder(combinedErgValue, ergo_tree_address);

    // Add all combined tokens
    for (const [tokenId, amount] of combinedTokens) {
        main_box_output.addTokens({ tokenId, amount: amount.toString() });
    }

    // Keep all registers from main_box exactly as they were
    main_box_output.setAdditionalRegisters(main_box.box.additionalRegisters);

    const outputs: OutputBuilder[] = [main_box_output];

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
