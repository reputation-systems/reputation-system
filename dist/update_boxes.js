import { OutputBuilder, SAFE_MIN_BOX_VALUE, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder, ErgoAddress, SColl, SByte, SBool } from '@fleet-sdk/core';
import { ergo_tree_address } from './envs';
import { hexToBytes, hexOrUtf8ToBytes } from './utils';
import { stringToBytes } from '@scure/base';
import {} from './ReputationProof';
/**
 * Generic function to update multiple reputation boxes in a single transaction.
 * Supports merge (N→1), split (1→N), update (1→1), and complex redistributions.
 *
 * ## Use Cases:
 *
 * ### 1. Simple Update (1→1)
 * Update content, polarization, or lock state of a single box.
 * ```typescript
 * await update_boxes(
 *     explorer_uri,
 *     [myBox],
 *     [{ token_amount: 100, content: "New content", is_locked: true }]
 * );
 * ```
 *
 * ### 2. Merge (N→1)
 * Combine multiple boxes into one.
 * ```typescript
 * await update_boxes(
 *     explorer_uri,
 *     [box1, box2, box3],
 *     [{ token_amount: 300 }] // Sum of all input tokens
 * );
 * ```
 *
 * ### 3. Split (1→N)
 * Divide a box into multiple boxes.
 * ```typescript
 * await update_boxes(
 *     explorer_uri,
 *     [bigBox],
 *     [
 *         { token_amount: 50, content: "Part 1" },
 *         { token_amount: 50, content: "Part 2" }
 *     ]
 * );
 * ```
 *
 * ### 4. Redistribution (N→M)
 * Complex redistribution of tokens across boxes.
 * ```typescript
 * await update_boxes(
 *     explorer_uri,
 *     [box1, box2],
 *     [
 *         { token_amount: 30, object_pointer: "target1" },
 *         { token_amount: 70, object_pointer: "target2" }
 *     ]
 * );
 * ```
 *
 * @param explorerUri Optional explorer URI for fetching Type NFT boxes (defaults to explorer_uri from envs)
 * @param input_boxes Array of RPBox to consume (must have same token_id, none locked)
 * @param output_configs Array of OutputConfig defining the output boxes
 * @param sacrificed_erg Optional extra ERG to add to the first output box
 * @param sacrificed_tokens Optional extra tokens to add (distributed based on receive_non_reputation_tokens flag)
 * @returns Transaction ID if successful
 * @throws Error if validation fails or transaction cannot be built/submitted
 */
export async function update_boxes(explorerUri, input_boxes, output_configs, sacrificed_erg = 0n, sacrificed_tokens = []) {
    // === VALIDATIONS ===
    // Must have at least one input (no minting)
    if (input_boxes.length === 0) {
        throw new Error("At least one input box is required. Use create_profile for minting.");
    }
    // Must have at least one output
    if (output_configs.length === 0) {
        throw new Error("At least one output config is required. Cannot delete all boxes.");
    }
    // All input boxes must have the same token_id
    const reputationTokenId = input_boxes[0].token_id;
    for (const box of input_boxes) {
        if (box.token_id !== reputationTokenId) {
            throw new Error(`Token ID mismatch: expected ${reputationTokenId}, got ${box.token_id}. All boxes must belong to the same reputation proof.`);
        }
    }
    // No input box can be locked
    for (const box of input_boxes) {
        if (box.is_locked) {
            throw new Error(`Cannot update locked box ${box.box_id}. Locked boxes are immutable.`);
        }
    }
    // Validate token_amount in each output config
    for (let i = 0; i < output_configs.length; i++) {
        const config = output_configs[i];
        if (config.token_amount < 0) {
            throw new Error(`Invalid token_amount in output ${i}: ${config.token_amount}. Must be >= 0.`);
        }
    }
    // Validate only one output has receive_non_reputation_tokens flag
    const receiversCount = output_configs.filter(c => c.receive_non_reputation_tokens === true).length;
    if (receiversCount > 1) {
        throw new Error(`Only one output can have receive_non_reputation_tokens set to true. Found ${receiversCount}.`);
    }
    // Calculate total available reputation tokens
    const totalAvailableReputation = input_boxes.reduce((sum, box) => {
        return sum + box.box.assets.reduce((boxSum, asset) => {
            return asset.tokenId === reputationTokenId ? boxSum + BigInt(asset.amount) : boxSum;
        }, 0n);
    }, 0n);
    // Calculate total requested reputation tokens
    const totalRequestedReputation = output_configs.reduce((sum, config) => {
        return sum + BigInt(config.token_amount);
    }, 0n);
    // Tokens must match exactly
    if (totalRequestedReputation !== totalAvailableReputation) {
        throw new Error(`Token amount mismatch: available ${totalAvailableReputation}, requested ${totalRequestedReputation}. Amounts must match exactly.`);
    }
    console.log("Updating boxes with parameters:", {
        input_boxes: input_boxes.map(b => b.box_id),
        output_configs,
        sacrificed_erg,
        sacrificed_tokens,
        explorerUri
    });
    // === SETUP ===
    const creatorAddressString = await ergo.get_change_address();
    if (!creatorAddressString) {
        throw new Error("Could not get the creator's address from the wallet.");
    }
    const creatorP2PKAddress = ErgoAddress.fromBase58(creatorAddressString);
    // Get proposition bytes for R7
    const propositionBytes = hexToBytes(creatorP2PKAddress.ergoTree);
    if (!propositionBytes) {
        throw new Error(`Could not get proposition bytes from address ${creatorAddressString}.`);
    }
    // Fetch Type NFT boxes for dataInputs
    const typeTokenIds = new Set();
    for (const box of input_boxes) {
        typeTokenIds.add(box.type.tokenId);
    }
    for (const config of output_configs) {
        if (config.type_nft_id)
            typeTokenIds.add(config.type_nft_id);
    }
    const dataInputs = [];
    for (const tokenId of typeTokenIds) {
        const response = await fetch(`${explorerUri}/api/v1/boxes/byTokenId/${tokenId}`);
        if (response.ok) {
            const box = (await response.json()).items[0];
            if (box)
                dataInputs.push(box);
        }
    }
    // === BUILD INPUTS ===
    const utxos = await ergo.get_utxos();
    const inputs = [...input_boxes.map(b => b.box), ...utxos];
    // Collect all non-reputation tokens from inputs
    const allNonReputationTokens = new Map();
    for (const box of input_boxes) {
        for (const asset of box.box.assets) {
            if (asset.tokenId !== reputationTokenId) {
                const current = allNonReputationTokens.get(asset.tokenId) || 0n;
                allNonReputationTokens.set(asset.tokenId, current + BigInt(asset.amount));
            }
        }
    }
    // Add sacrificed tokens to the pool
    for (const token of sacrificed_tokens) {
        const current = allNonReputationTokens.get(token.tokenId) || 0n;
        allNonReputationTokens.set(token.tokenId, current + token.amount);
    }
    // Determine which output receives non-reputation tokens
    let nonRepTokenReceiverIndex = output_configs.findIndex(c => c.receive_non_reputation_tokens === true);
    if (nonRepTokenReceiverIndex === -1) {
        // Default to first output
        nonRepTokenReceiverIndex = 0;
    }
    // === BUILD OUTPUTS ===
    const outputs = [];
    const firstInput = input_boxes[0];
    for (let i = 0; i < output_configs.length; i++) {
        const config = output_configs[i];
        // Calculate box value: SAFE_MIN_BOX_VALUE + extra_erg + (sacrificed_erg only for first output)
        let boxValue = BigInt(SAFE_MIN_BOX_VALUE) + (config.extra_erg || 0n);
        if (i === 0) {
            boxValue += sacrificed_erg;
        }
        const output = new OutputBuilder(boxValue, ergo_tree_address);
        // Add reputation tokens (only if amount > 0)
        if (config.token_amount > 0) {
            output.addTokens({ tokenId: reputationTokenId, amount: BigInt(config.token_amount).toString() });
        }
        // Add non-reputation tokens to the designated receiver output
        if (i === nonRepTokenReceiverIndex && allNonReputationTokens.size > 0) {
            for (const [tokenId, amount] of allNonReputationTokens) {
                output.addTokens({ tokenId, amount: amount.toString() });
            }
        }
        // Resolve register values (use config or fallback to first input)
        const typeNftId = config.type_nft_id ?? firstInput.type.tokenId;
        const objectPointer = config.object_pointer ?? firstInput.object_pointer;
        const polarization = config.polarization ?? firstInput.polarization;
        const isLocked = config.is_locked ?? false;
        // Prepare content
        let rawContent;
        if (config.content === undefined || config.content === null) {
            rawContent = "";
        }
        else if (typeof config.content === "object") {
            rawContent = JSON.stringify(config.content);
        }
        else {
            rawContent = config.content;
        }
        // Set registers
        const registers = {
            R4: SColl(SByte, hexToBytes(typeNftId) ?? "").toHex(),
            R5: SColl(SByte, hexOrUtf8ToBytes(objectPointer) ?? "").toHex(),
            R6: SBool(isLocked).toHex(),
            R7: SColl(SByte, propositionBytes).toHex(),
            R8: SBool(polarization).toHex(),
            R9: SColl(SByte, stringToBytes("utf8", rawContent)).toHex(),
        };
        output.setAdditionalRegisters(registers);
        outputs.push(output);
    }
    console.log("Inputs:", inputs.length, "Outputs:", outputs.length);
    // === BUILD AND SUBMIT TRANSACTION ===
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
