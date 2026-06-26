/**
 * Shared helpers for the reputation-system MCP server: signer selection from
 * environment and explorer-box -> RPBox shaping for publish operations.
 */
import { SeedSigner, UnsignedSigner } from 'reputation-system/node';

export const EXPLORER_API = process.env.REP_EXPLORER_API || 'https://api.ergoplatform.com';

/**
 * Build the configured Signer from environment.
 *
 *   REP_SIGNER_MODE=seed      – sign + submit autonomously with a mnemonic.
 *     REP_MNEMONIC   (required)  BIP-39 mnemonic of the publishing wallet.
 *     REP_MNEMONIC_PASSWORD     optional BIP-39 passphrase.
 *     REP_NODE_URI              Ergo node for submission (default :9053).
 *     REP_ADDRESS_INDEX         change-path index (default 0).
 *
 *   REP_SIGNER_MODE=unsigned  – build only; return the unsigned EIP-12 tx for an
 *                               external wallet to sign. No key in the agent. (default)
 *     REP_ADDRESS    (required)  the P2PK address whose UTXOs fund the tx.
 */
export function makeSigner() {
  const mode = (process.env.REP_SIGNER_MODE || 'unsigned').toLowerCase();
  if (mode === 'seed') {
    const mnemonic = process.env.REP_MNEMONIC;
    if (!mnemonic) throw new Error('REP_SIGNER_MODE=seed requires REP_MNEMONIC.');
    return new SeedSigner({
      mnemonic,
      password: process.env.REP_MNEMONIC_PASSWORD,
      addressIndex: process.env.REP_ADDRESS_INDEX ? Number(process.env.REP_ADDRESS_INDEX) : 0,
      explorerUri: EXPLORER_API,
      nodeUri: process.env.REP_NODE_URI
    });
  }
  if (mode === 'unsigned') {
    const address = process.env.REP_ADDRESS;
    if (!address) throw new Error('REP_SIGNER_MODE=unsigned requires REP_ADDRESS.');
    return new UnsignedSigner({ address, explorerUri: EXPLORER_API });
  }
  throw new Error(`Unknown REP_SIGNER_MODE: ${mode} (expected 'seed' or 'unsigned').`);
}

/**
 * Fetch a reputation-proof box by id and shape it into the RPBox `main_box`
 * that `create_opinion_with_signer` consumes. R4 (rendered) is its Type NFT id,
 * which the contract requires as a data input.
 */
export async function fetchMainBox(mainBoxId) {
  if (!/^[0-9a-fA-F]{64}$/.test(mainBoxId || '')) {
    throw new Error(`mainBoxId must be a 64-char hex box id (got: ${mainBoxId}).`);
  }
  const res = await fetch(`${EXPLORER_API}/api/v1/boxes/${mainBoxId}`);
  if (!res.ok) throw new Error(`Failed to fetch main box ${mainBoxId}: HTTP ${res.status}`);
  const box = await res.json();

  const reputationTokenId = box?.assets?.[0]?.tokenId;
  if (!reputationTokenId) {
    throw new Error(`Box ${mainBoxId} holds no reputation token; not a valid main box.`);
  }

  return {
    box: {
      boxId: box.boxId,
      value: box.value.toString(),
      assets: (box.assets ?? []).map((a) => ({ tokenId: a.tokenId, amount: a.amount.toString() })),
      ergoTree: box.ergoTree,
      creationHeight: box.creationHeight,
      additionalRegisters: Object.entries(box.additionalRegisters ?? {}).reduce((acc, [k, v]) => {
        acc[k] = v.serializedValue;
        return acc;
      }, {}),
      index: box.index ?? 0,
      transactionId: box.transactionId
    },
    box_id: box.boxId,
    type: { tokenId: box?.additionalRegisters?.R4?.renderedValue || '' },
    token_id: reputationTokenId,
    token_amount: Number(box.assets[0].amount),
    object_pointer: box?.additionalRegisters?.R5?.renderedValue || '',
    is_locked: box?.additionalRegisters?.R6?.renderedValue === 'true',
    polarization: box?.additionalRegisters?.R8?.renderedValue === 'true',
    content: {}
  };
}

/** Normalize a SignerResult into an MCP-friendly payload. */
export function describeResult(result) {
  if (result.kind === 'submitted') {
    return { submitted: true, txId: result.txId };
  }
  return {
    submitted: false,
    unsignedTransaction: result.transaction,
    note: 'Transaction built but not signed. Sign + submit with an external wallet (Nautilus/ErgoPay).'
  };
}
