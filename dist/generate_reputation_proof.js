import { OutputBuilder, SAFE_MIN_BOX_VALUE, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder, ErgoAddress, SColl, SByte, SBool } from '@fleet-sdk/core';
import {} from './ReputationProof';
import { ergo_tree_address, explorer_uri } from './envs';
import { hexToBytes, hexOrUtf8ToBytes } from './utils';
import { stringToBytes } from '@scure/base';
/**
 * Generates or modifies a reputation proof by building and submitting a transaction.
 * @param token_amount The amount of the token for the new proof box.
 * @param total_supply The total supply of the reputation token set.
 * @param type_nft_id The token ID of the Type NFT that defines the standard for this proof.
 * @param object_pointer The object this proof is about (e.g., a URL, another token ID).
 * @param polarization `true` for a positive proof, `false` for a negative one.
 * @param content The JSON or string content for register R9.
 * @param is_locked `true` to make the resulting box immutable.
 * @param input_proof The existing RPBox to spend from (for splitting or modifying).
 * @param extra_inputs Additional RPBoxes to merge into the new proof.
 * @param extra_erg Optional extra ERG to add to the proof (sacrificed).
 * @param extra_tokens Optional extra tokens to add to the proof (sacrificed).
 * @param explorerUri Optional explorer URI to use for fetching the Type NFT box.
 * @returns A promise that resolves to the transaction ID string, or null on failure.
 */
export async function generate_reputation_proof(token_amount, total_supply, type_nft_id, object_pointer, polarization, content, is_locked = false, input_proof, extra_inputs, extra_erg = 0n, extra_tokens = [], explorerUri = explorer_uri) {
    console.log("Generating reputation proof with parameters:", {
        token_amount,
        total_supply,
        type_nft_id,
        object_pointer,
        polarization,
        content,
        is_locked,
        input_proof,
        extra_erg,
        extra_tokens
    });
    console.log("Ergo Tree Address:", ergo_tree_address);
    const creatorAddressString = await ergo.get_change_address();
    if (!creatorAddressString) {
        throw new Error("Could not get the creator's address from the wallet.");
    }
    const creatorP2PKAddress = ErgoAddress.fromBase58(creatorAddressString);
    // Fetch the Type NFT box to be used in dataInputs. This is required by the contract.
    const typeNftBoxResponse = await fetch(`${explorerUri}/api/v1/boxes/byTokenId/${type_nft_id}`);
    if (!typeNftBoxResponse.ok) {
        alert("Could not fetch the Type NFT box. Aborting transaction.");
        return null;
    }
    const typeNftBox = (await typeNftBoxResponse.json()).items[0];
    console.log("type nft box ", typeNftBox);
    // Inputs for the transaction
    const utxos = await ergo.get_utxos();
    const inputs = input_proof ? [input_proof.box, ...utxos] : utxos;
    if (extra_inputs) {
        inputs.push(...extra_inputs.map(i => i.box));
    }
    let dataInputs = [typeNftBox];
    const outputs = [];
    // --- Create the main output for the new/modified proof ---
    const new_proof_output = new OutputBuilder((input_proof ? BigInt(input_proof.box.value) : BigInt(SAFE_MIN_BOX_VALUE)) + BigInt(extra_erg), ergo_tree_address);
    const tokenMap = new Map();
    if (input_proof === undefined || input_proof === null) {
        // Minting a new token if no input proof is provided
        new_proof_output.mintToken({
            amount: token_amount.toString(),
            name: "Reputation Proof Token", // Optional: EIP-4 metadata
        });
        if (!object_pointer)
            object_pointer = inputs[0].boxId; // Points to the self token being evaluated by default
    }
    else {
        // Transferring existing tokens
        // 1. Add all tokens from the main input box
        for (const asset of input_proof.box.assets) {
            tokenMap.set(asset.tokenId, BigInt(asset.amount));
        }
        // 2. Add all tokens from extra input boxes (merging)
        if (extra_inputs) {
            for (const extra of extra_inputs) {
                for (const asset of extra.box.assets) {
                    const current = tokenMap.get(asset.tokenId) || 0n;
                    tokenMap.set(asset.tokenId, current + BigInt(asset.amount));
                }
            }
        }
        // 3. Calculate total reputation tokens available
        const total_input_reputation_amount = tokenMap.get(input_proof.token_id) || 0n;
        // 4. If splitting, create a change box to send the remaining tokens back to the same contract
        if (total_input_reputation_amount - BigInt(token_amount) > 0n) {
            outputs.push(new OutputBuilder(SAFE_MIN_BOX_VALUE, ergo_tree_address)
                .addTokens({
                tokenId: input_proof.token_id,
                amount: (total_input_reputation_amount - BigInt(token_amount)).toString()
            })
                // The change box must retain the original registers
                .setAdditionalRegisters(input_proof.box.additionalRegisters));
        }
        // 5. Set the reputation token amount for the new main output
        tokenMap.set(input_proof.token_id, BigInt(token_amount));
        if (!object_pointer)
            object_pointer = input_proof.token_id;
    }
    // Add extra tokens (sacrificed)
    if (extra_tokens) {
        for (const extra of extra_tokens) {
            const current = tokenMap.get(extra.tokenId) || 0n;
            tokenMap.set(extra.tokenId, current + BigInt(extra.amount));
        }
    }
    // Add all aggregated tokens to the main output
    for (const [tokenId, amount] of tokenMap.entries()) {
        if (amount > 0n) {
            new_proof_output.addTokens({
                tokenId,
                amount: amount.toString()
            });
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
    console.log("New registers:", new_registers);
    new_proof_output.setAdditionalRegisters(new_registers);
    outputs.push(new_proof_output);
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
