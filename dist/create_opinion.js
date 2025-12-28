import { OutputBuilder, SAFE_MIN_BOX_VALUE, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder, ErgoAddress, SColl, SByte, SBool } from '@fleet-sdk/core';
import { ergo_tree_address } from './envs';
import { hexToBytes, hexOrUtf8ToBytes } from './utils';
import { stringToBytes } from '@scure/base';
import {} from './ReputationProof';
/**
 * Generates or modifies a reputation proof by building and submitting a transaction.
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @param token_amount The amount of the token for the new proof box.
 * @param type_nft_id The Type NFT ID associated with the proof.
 * @param object_pointer An optional pointer to the object being evaluated.
 * @param polarization A boolean indicating the polarization of the opinion.
 * @param content The content associated with the opinion, can be an object or string.
 * @param is_locked A boolean indicating if the opinion is locked.
 * @param main_box The main RPBox containing the reputation tokens to spend.
 * @returns The transaction ID if successful, otherwise null.
 */
export async function create_opinion(explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked = false, main_box) {
    console.log("Generating reputation proof with parameters:", {
        token_amount,
        type_nft_id,
        object_pointer,
        polarization,
        content,
        is_locked,
        main_box,
        explorerUri
    });
    console.log("Ergo Tree Address:", ergo_tree_address);
    const creatorAddressString = await ergo.get_change_address();
    if (!creatorAddressString) {
        throw new Error("Could not get the creator's address from the wallet.");
    }
    const creatorP2PKAddress = ErgoAddress.fromBase58(creatorAddressString);
    // Fetch the Type NFT boxes to be used in dataInputs. This is required by the contract.
    const typeTokenIds = new Set();
    typeTokenIds.add(main_box.type.tokenId);
    const dataInputs = [];
    for (const tokenId of typeTokenIds) {
        const response = await fetch(`${explorerUri}/api/v1/boxes/byTokenId/${tokenId}`);
        if (response.ok) {
            const box = (await response.json()).items[0];
            if (box)
                dataInputs.push(box);
        }
    }
    console.log("Data Inputs (Type NFTs):", dataInputs);
    // Inputs for the transaction
    const utxos = await ergo.get_utxos();
    const inputs = [main_box.box, ...utxos];
    const outputs = [];
    // MAIN BOX
    let opinion_box_output;
    let main_box_output = null;
    const reputationTokenId = main_box.token_id;
    let totalReputationAvailable = main_box.box.assets.reduce((sum, asset) => {
        if (asset.tokenId === reputationTokenId) {
            return sum + BigInt(asset.amount);
        }
        else {
            return 0n;
        }
    }, 0n) - BigInt(token_amount);
    main_box_output = new OutputBuilder(main_box.box.value, ergo_tree_address)
        .addTokens([{ tokenId: reputationTokenId, amount: totalReputationAvailable.toString() }, ...main_box.box.assets.filter(a => a.tokenId !== reputationTokenId)])
        .setAdditionalRegisters(main_box.box.additionalRegisters);
    outputs.push(main_box_output);
    // OPINION BOX
    opinion_box_output = new OutputBuilder(BigInt(SAFE_MIN_BOX_VALUE), ergo_tree_address);
    opinion_box_output.addTokens({ tokenId: reputationTokenId, amount: BigInt(token_amount).toString() });
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
    opinion_box_output.setAdditionalRegisters(new_registers);
    outputs.push(opinion_box_output);
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
