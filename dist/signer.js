/**
 * Signer abstraction for reputation-system publish transactions.
 *
 * Historically every publish function (`create_opinion`, `create_profile`, …)
 * reached for the browser-injected `ergo` global (Nautilus dApp connector) to
 * read the wallet address / UTXOs / height and to sign + submit. That hard-wired
 * the whole library to a browser with Nautilus installed and made it impossible
 * to publish from Node (agents, MCP servers, CI).
 *
 * This module factors those five touch-points behind a `Signer` interface:
 *
 *   getChangeAddress()  – the creator's P2PK address (base58)
 *   getUtxos()          – spendable boxes, in EIP-12 shape for Fleet `.from()`
 *   getCurrentHeight()  – current blockchain height for the tx builder
 *   finalize(builtTx)   – sign + submit, OR return the unsigned tx for external signing
 *
 * Three implementations are provided:
 *
 *   NautilusSigner – wraps the browser `ergo` global; preserves the exact prior
 *                    behavior, so the web app is untouched (it's the default).
 *   SeedSigner     – Node-side: derives a key from a mnemonic, fetches boxes /
 *                    height from an Ergo explorer, signs locally with the Fleet
 *                    Prover, and submits to an Ergo node. Full automation.
 *   UnsignedSigner – Node-side: builds the transaction and returns the unsigned
 *                    EIP-12 object for an external wallet (Nautilus / ErgoPay /
 *                    cold signer) to sign. No private key ever touches the agent.
 */
import { ErgoHDKey, Prover, ERGO_CHANGE_PATH } from '@fleet-sdk/wallet';
import { mnemonicToSeedSync } from '@scure/bip39';
import { HDKey } from '@scure/bip32';
const DEFAULT_EXPLORER_URI = 'https://api.ergoplatform.com';
// Agents typically run alongside their own node (e.g. a local Ergo node on
// :9053). Submission requires a node; override via SeedSigner options.
const DEFAULT_NODE_URI = 'http://localhost:9053';
/**
 * Wraps the browser `ergo` global. This is the default signer, so existing
 * web-app callers behave exactly as before (sign + submit via Nautilus).
 */
export class NautilusSigner {
    async getChangeAddress() {
        const addr = await ergo.get_change_address();
        if (!addr)
            throw new Error("Could not get the creator's address from the wallet.");
        return addr;
    }
    async getUtxos() {
        return ergo.get_utxos();
    }
    async getCurrentHeight() {
        return ergo.get_current_height();
    }
    async finalize(builtTx) {
        const unsigned = builtTx.toEIP12Object();
        const signed = await ergo.sign_tx(unsigned);
        const txId = await ergo.submit_tx(signed);
        return { kind: 'submitted', txId };
    }
}
/** Map an Ergo Explorer box into the EIP-12 shape Fleet's `.from()` expects. */
function explorerBoxToEip12(box) {
    return {
        boxId: box.boxId,
        value: box.value.toString(),
        ergoTree: box.ergoTree,
        creationHeight: box.creationHeight,
        assets: (box.assets ?? []).map((a) => ({
            tokenId: a.tokenId,
            amount: a.amount.toString()
        })),
        // Explorer returns { R4: { serializedValue, renderedValue, sigmaType } };
        // Fleet wants { R4: serializedValue }. Mirrors fetch.ts box mapping.
        additionalRegisters: Object.entries(box.additionalRegisters ?? {}).reduce((acc, [k, v]) => {
            acc[k] = v.serializedValue;
            return acc;
        }, {}),
        index: box.index,
        transactionId: box.transactionId
    };
}
/**
 * Node-side signer that derives a key from a mnemonic, reads chain data from an
 * explorer, signs locally with the Fleet Prover, and submits to an Ergo node.
 */
export class SeedSigner {
    opts;
    keyPromise = null;
    constructor(options) {
        if (!options?.mnemonic)
            throw new Error('SeedSigner requires a mnemonic.');
        this.opts = {
            mnemonic: options.mnemonic,
            password: options.password,
            addressIndex: options.addressIndex ?? 0,
            explorerUri: options.explorerUri ?? DEFAULT_EXPLORER_URI,
            nodeUri: options.nodeUri ?? DEFAULT_NODE_URI
        };
    }
    /** Lazily derive (and cache) the change-path child key. */
    async key() {
        if (!this.keyPromise) {
            this.keyPromise = (async () => {
                // Standard BIP-39 -> BIP-32 derivation (Nautilus / EIP-3 compatible).
                // NB: @fleet-sdk/wallet's `ErgoHDKey.fromMnemonic` uses a NON-standard
                // mnemonic->seed step and derives a DIFFERENT key than Nautilus and
                // other standard wallets. We derive with @scure (standard) and bridge
                // the resulting extended private key into ErgoHDKey for the Prover.
                const seed = mnemonicToSeedSync(this.opts.mnemonic, this.opts.password);
                const child = HDKey.fromMasterSeed(seed).derive(`${ERGO_CHANGE_PATH}/${this.opts.addressIndex}`);
                return ErgoHDKey.fromExtendedKey(child.privateExtendedKey);
            })();
        }
        return this.keyPromise;
    }
    async getChangeAddress() {
        const key = await this.key();
        return key.address.toString();
    }
    async getUtxos() {
        const addr = await this.getChangeAddress();
        const url = `${this.opts.explorerUri}/api/v1/boxes/unspent/byAddress/${addr}?limit=100`;
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`Failed to fetch UTXOs: HTTP ${res.status}`);
        const json = await res.json();
        return (json.items ?? []).map(explorerBoxToEip12);
    }
    async getCurrentHeight() {
        const res = await fetch(`${this.opts.explorerUri}/api/v1/networkState`);
        if (!res.ok)
            throw new Error(`Failed to fetch height: HTTP ${res.status}`);
        const json = await res.json();
        return json.height;
    }
    /** Sign the built transaction with the derived key (no submission). */
    async sign(builtTx) {
        const key = await this.key();
        const prover = new Prover(key);
        return prover.signTransaction(builtTx.toEIP12Object(), [key]);
    }
    async finalize(builtTx) {
        const signed = await this.sign(builtTx);
        const res = await fetch(`${this.opts.nodeUri}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signed)
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(`Node rejected transaction: HTTP ${res.status} ${detail}`);
        }
        // Node returns the txId as a JSON string.
        const txId = (await res.json());
        return { kind: 'submitted', txId };
    }
}
/**
 * Node-side signer that builds the transaction but does NOT sign it — it returns
 * the unsigned EIP-12 object for an external wallet to sign and submit. Use this
 * when the agent must never hold a private key.
 */
export class UnsignedSigner {
    address;
    explorerUri;
    constructor(options) {
        if (!options?.address)
            throw new Error('UnsignedSigner requires an address.');
        this.address = options.address;
        this.explorerUri = options.explorerUri ?? DEFAULT_EXPLORER_URI;
    }
    async getChangeAddress() {
        return this.address;
    }
    async getUtxos() {
        const url = `${this.explorerUri}/api/v1/boxes/unspent/byAddress/${this.address}?limit=100`;
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`Failed to fetch UTXOs: HTTP ${res.status}`);
        const json = await res.json();
        return (json.items ?? []).map(explorerBoxToEip12);
    }
    async getCurrentHeight() {
        const res = await fetch(`${this.explorerUri}/api/v1/networkState`);
        if (!res.ok)
            throw new Error(`Failed to fetch height: HTTP ${res.status}`);
        const json = await res.json();
        return json.height;
    }
    async finalize(builtTx) {
        return { kind: 'unsigned', transaction: builtTx.toEIP12Object() };
    }
}
