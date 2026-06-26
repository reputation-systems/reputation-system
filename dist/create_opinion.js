import { OutputBuilder, SAFE_MIN_BOX_VALUE, RECOMMENDED_MIN_FEE_VALUE, TransactionBuilder, ErgoAddress, SColl, SByte, SBool } from '@fleet-sdk/core';
import { ergo_tree_address } from './envs.js';
import { hexToBytes, hexOrUtf8ToBytes } from './utils.js';
import { stringToBytes } from '@scure/base';
import {} from './ReputationProof.js';
import { NautilusSigner } from './signer.js';
/**
 * Internal function that builds the create_opinion transaction.
 * Returns the built TransactionBuilder for chaining or execution.
 * Reads wallet address / UTXOs / height through the supplied `signer`.
 */
async function _build_create_opinion(signer, explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked = false, main_box) {
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
    const creatorAddressString = await signer.getChangeAddress();
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
    const utxos = await signer.getUtxos();
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
    // Build the transaction
    const builder = new TransactionBuilder(await signer.getCurrentHeight())
        .from(inputs)
        .to(outputs)
        .sendChangeTo(creatorP2PKAddress)
        .payFee(RECOMMENDED_MIN_FEE_VALUE)
        .withDataFrom(dataInputs)
        .build();
    return builder;
}
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
export async function create_opinion(explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked = false, main_box, signer = new NautilusSigner()) {
    try {
        const builder = await _build_create_opinion(signer, explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked, main_box);
        const result = await signer.finalize(builder);
        if (result.kind === 'submitted') {
            console.log("Transaction ID -> ", result.txId);
            return result.txId;
        }
        // An unsigned-only signer can't return a txId from this browser-shaped API.
        return null;
    }
    catch (e) {
        console.error("Error building or submitting transaction:", e);
        if (typeof alert !== 'undefined')
            alert(`Transaction failed: ${e.message}`);
        return null;
    }
}
/**
 * Signer-aware variant of {@link create_opinion} for non-browser callers
 * (Node, MCP servers, agents). Takes an explicit {@link Signer} and returns the
 * full {@link SignerResult} — either a submitted txId or, for an
 * {@link UnsignedSigner}, the unsigned EIP-12 transaction for external signing.
 * Throws on failure instead of swallowing the error with a browser `alert`.
 */
export async function create_opinion_with_signer(signer, explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked = false, main_box) {
    const builder = await _build_create_opinion(signer, explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked, main_box);
    return signer.finalize(builder);
}
/**
 * Creates a new opinion and returns the TransactionBuilder for chaining.
 * Use this when you need to chain multiple transactions together.
 *
 * @param explorerUri The URI of the Ergo explorer to fetch box data.
 * @param token_amount The amount of the token for the new proof box.
 * @param type_nft_id The Type NFT ID associated with the proof.
 * @param object_pointer An optional pointer to the object being evaluated.
 * @param polarization A boolean indicating the polarization of the opinion.
 * @param content The content associated with the opinion, can be an object or string.
 * @param is_locked A boolean indicating if the opinion is locked.
 * @param main_box The main RPBox containing the reputation tokens to spend.
 * @returns The TransactionBuilder after .build() for chaining.
 */
export async function create_opinion_chained(explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked = false, main_box, signer = new NautilusSigner()) {
    return _build_create_opinion(signer, explorerUri, token_amount, type_nft_id, object_pointer, polarization, content, is_locked, main_box);
}
