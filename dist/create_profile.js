import { OutputBuilder, SAFE_MIN_BOX_VALUE, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder, ErgoAddress, SColl, SByte, SBool } from '@fleet-sdk/core';
import { ergo_tree_address } from './envs';
import { hexToBytes } from './utils';
import { stringToBytes } from '@scure/base';
/**
 * Creates a new reputation profile by minting a new reputation token.
 * This creates a "SELF" box where R5 points to its own token ID (the minted token).
 *
 * @param total_supply The total amount of reputation tokens to mint.
 * @param type_nft_id The Type NFT ID that defines the category/type for this profile.
 * @param content Optional content for the profile (text, JSON object, or null).
 * @param sacrified_erg Optional extra ERG to add to the profile box (sacrificed).
 * @param sacrified_tokens Optional extra tokens to add to the profile box (sacrificed).
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @returns The transaction ID if successful, otherwise null.
 */
export async function create_profile(total_supply, type_nft_id, explorerUri, content = null, sacrified_erg = 0n, sacrified_tokens = []) {
    console.log("Creating profile with parameters:", {
        total_supply,
        type_nft_id,
        content,
        sacrified_erg,
        sacrified_tokens,
        explorerUri
    });
    console.log("Ergo Tree Address:", ergo_tree_address);
    const creatorAddressString = await ergo.get_change_address();
    if (!creatorAddressString) {
        throw new Error("Could not get the creator's address from the wallet.");
    }
    const creatorP2PKAddress = ErgoAddress.fromBase58(creatorAddressString);
    // Inputs for the transaction (wallet UTXOs)
    const utxos = await ergo.get_utxos();
    const inputs = [...utxos];
    // The token ID will be the box ID of the first input (this is how Ergo minting works)
    // R5 will point to this same ID, making it a "SELF" box
    const firstInputBoxId = inputs[0].boxId;
    // Build the profile box output (SAFE_MIN_BOX_VALUE + sacrified_erg)
    const boxValue = BigInt(SAFE_MIN_BOX_VALUE) + sacrified_erg;
    const profile_box_output = new OutputBuilder(boxValue, ergo_tree_address);
    // Mint the reputation token with total_supply
    profile_box_output.mintToken({
        amount: BigInt(total_supply).toString(),
        name: "Reputation Proof Token"
    });
    // Add sacrified tokens to the box
    for (const token of sacrified_tokens) {
        profile_box_output.addTokens({ tokenId: token.tokenId, amount: token.amount.toString() });
    }
    // Get proposition bytes for R7
    const propositionBytes = hexToBytes(creatorP2PKAddress.ergoTree);
    if (!propositionBytes) {
        throw new Error(`Could not get proposition bytes from address ${creatorAddressString}.`);
    }
    // Prepare content for R9
    const raw_content = typeof content === "object" ? JSON.stringify(content) : content ?? "";
    // Set registers:
    // R4 = type_nft_id (the category/type)
    // R5 = firstInputBoxId (points to itself, making it a SELF box)
    // R6 = false (locked = false, unlocked)
    // R7 = creator's proposition bytes
    // R8 = true (polarization = true, positive)
    // R9 = content
    const new_registers = {
        R4: SColl(SByte, hexToBytes(type_nft_id) ?? "").toHex(),
        R5: SColl(SByte, hexToBytes(firstInputBoxId) ?? "").toHex(),
        R6: SBool(false).toHex(),
        R7: SColl(SByte, propositionBytes).toHex(),
        R8: SBool(true).toHex(),
        R9: SColl(SByte, stringToBytes("utf8", raw_content)).toHex(),
    };
    profile_box_output.setAdditionalRegisters(new_registers);
    const outputs = [profile_box_output];
    console.log("Inputs:", inputs);
    console.log("Outputs:", outputs);
    // --- Build and submit the transaction ---
    try {
        const unsignedTransaction = await new TransactionBuilder(await ergo.get_current_height())
            .from(inputs)
            .to(outputs)
            .sendChangeTo(creatorP2PKAddress)
            .payFee(RECOMMENDED_MIN_FEE_VALUE)
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
