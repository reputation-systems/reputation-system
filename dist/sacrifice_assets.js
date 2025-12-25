import { OutputBuilder, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder, ErgoAddress } from '@fleet-sdk/core';
import { ergo_tree_address } from './envs';
import {} from './ReputationProof';
/**
 * Sacrifices ERG and tokens by adding them to an existing reputation box.
 * The target box is recreated with the additional assets permanently locked inside.
 *
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes.
 * @param target_box The reputation box to receive the sacrificed assets.
 * @param sacrificed_erg Amount of ERG to sacrifice (added to existing box value).
 * @param sacrificed_tokens Array of tokens to sacrifice (added to existing box tokens).
 * @returns The transaction ID if successful, otherwise null.
 */
export async function sacrifice_assets(explorerUri, target_box, sacrificed_erg = 0n, sacrificed_tokens = []) {
    // Validate: target_box must not be locked
    if (target_box.is_locked) {
        throw new Error("Cannot sacrifice to a locked box. Locked boxes are immutable.");
    }
    // Validate: must sacrifice something
    if (sacrificed_erg <= 0n && sacrificed_tokens.length === 0) {
        throw new Error("Must sacrifice at least some ERG or tokens.");
    }
    console.log("Sacrificing assets with parameters:", {
        target_box,
        sacrificed_erg,
        sacrificed_tokens,
        explorerUri
    });
    console.log("Ergo Tree Address:", ergo_tree_address);
    const creatorAddressString = await ergo.get_change_address();
    if (!creatorAddressString) {
        throw new Error("Could not get the creator's address from the wallet.");
    }
    const creatorP2PKAddress = ErgoAddress.fromBase58(creatorAddressString);
    // Fetch the Type NFT box to be used in dataInputs
    const dataInputs = [];
    const response = await fetch(`${explorerUri}/api/v1/boxes/byTokenId/${target_box.type.tokenId}`);
    if (response.ok) {
        const box = (await response.json()).items[0];
        if (box)
            dataInputs.push(box);
    }
    console.log("Data Inputs (Type NFT):", dataInputs);
    // Inputs for the transaction
    const utxos = await ergo.get_utxos();
    const inputs = [target_box.box, ...utxos];
    // Combine existing tokens with sacrificed tokens
    const combinedTokens = new Map();
    // Add existing tokens from target_box
    for (const asset of target_box.box.assets) {
        const current = combinedTokens.get(asset.tokenId) || 0n;
        combinedTokens.set(asset.tokenId, current + BigInt(asset.amount));
    }
    // Add sacrificed tokens
    for (const token of sacrificed_tokens) {
        const current = combinedTokens.get(token.tokenId) || 0n;
        combinedTokens.set(token.tokenId, current + token.amount);
    }
    // Calculate new ERG value
    const newErgValue = BigInt(target_box.box.value) + sacrificed_erg;
    // --- Build TARGET BOX output (recreated with additional assets) ---
    const target_box_output = new OutputBuilder(newErgValue, ergo_tree_address);
    // Add all combined tokens
    for (const [tokenId, amount] of combinedTokens) {
        target_box_output.addTokens({ tokenId, amount: amount.toString() });
    }
    // Keep all registers from target_box exactly as they were
    target_box_output.setAdditionalRegisters(target_box.box.additionalRegisters);
    const outputs = [target_box_output];
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
    }
    catch (e) {
        console.error("Error building or submitting transaction:", e);
        alert(`Transaction failed: ${e.message}`);
        return null;
    }
}
