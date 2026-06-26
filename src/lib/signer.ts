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

/** Result of finalizing a built transaction through a signer. */
export type SignerResult =
    | { kind: 'submitted'; txId: string }
    | { kind: 'unsigned'; transaction: any };

/**
 * The four capabilities a publish function needs from a wallet/keystore.
 * `builtTx` in `finalize` is the object returned by Fleet's
 * `TransactionBuilder.build()` (it exposes `.toEIP12Object()`).
 */
export interface Signer {
    getChangeAddress(): Promise<string>;
    getUtxos(): Promise<any[]>;
    getCurrentHeight(): Promise<number>;
    finalize(builtTx: any): Promise<SignerResult>;
}

/** The browser-injected Nautilus dApp connector, when present. */
declare const ergo: any;

const DEFAULT_EXPLORER_URI = 'https://api.ergoplatform.com';
// Agents typically run alongside their own node (e.g. a local Ergo node on
// :9053). Submission requires a node; override via SeedSigner options.
const DEFAULT_NODE_URI = 'http://localhost:9053';

/**
 * Wraps the browser `ergo` global. This is the default signer, so existing
 * web-app callers behave exactly as before (sign + submit via Nautilus).
 */
export class NautilusSigner implements Signer {
    async getChangeAddress(): Promise<string> {
        const addr = await ergo.get_change_address();
        if (!addr) throw new Error("Could not get the creator's address from the wallet.");
        return addr;
    }

    async getUtxos(): Promise<any[]> {
        return ergo.get_utxos();
    }

    async getCurrentHeight(): Promise<number> {
        return ergo.get_current_height();
    }

    async finalize(builtTx: any): Promise<SignerResult> {
        const unsigned = builtTx.toEIP12Object();
        const signed = await ergo.sign_tx(unsigned);
        const txId = await ergo.submit_tx(signed);
        return { kind: 'submitted', txId };
    }
}

/** Map an Ergo Explorer box into the EIP-12 shape Fleet's `.from()` expects. */
function explorerBoxToEip12(box: any): any {
    return {
        boxId: box.boxId,
        value: box.value.toString(),
        ergoTree: box.ergoTree,
        creationHeight: box.creationHeight,
        assets: (box.assets ?? []).map((a: any) => ({
            tokenId: a.tokenId,
            amount: a.amount.toString()
        })),
        // Explorer returns { R4: { serializedValue, renderedValue, sigmaType } };
        // Fleet wants { R4: serializedValue }. Mirrors fetch.ts box mapping.
        additionalRegisters: Object.entries(box.additionalRegisters ?? {}).reduce(
            (acc: Record<string, string>, [k, v]: [string, any]) => {
                acc[k] = v.serializedValue;
                return acc;
            },
            {}
        ),
        index: box.index,
        transactionId: box.transactionId
    };
}

export interface SeedSignerOptions {
    /** BIP-39 mnemonic for the signing wallet. */
    mnemonic: string;
    /** Optional BIP-39 passphrase. */
    password?: string;
    /** Address index on the change path (default 0). */
    addressIndex?: number;
    /** Ergo explorer base URI (default mainnet). */
    explorerUri?: string;
    /** Ergo node base URI used for submission (default http://localhost:9053). */
    nodeUri?: string;
}

/**
 * Node-side signer that derives a key from a mnemonic, reads chain data from an
 * explorer, signs locally with the Fleet Prover, and submits to an Ergo node.
 */
export class SeedSigner implements Signer {
    private readonly opts: Required<Omit<SeedSignerOptions, 'password'>> & { password?: string };
    private keyPromise: Promise<ErgoHDKey> | null = null;

    constructor(options: SeedSignerOptions) {
        if (!options?.mnemonic) throw new Error('SeedSigner requires a mnemonic.');
        this.opts = {
            mnemonic: options.mnemonic,
            password: options.password,
            addressIndex: options.addressIndex ?? 0,
            explorerUri: options.explorerUri ?? DEFAULT_EXPLORER_URI,
            nodeUri: options.nodeUri ?? DEFAULT_NODE_URI
        };
    }

    /** Lazily derive (and cache) the change-path child key. */
    private async key(): Promise<ErgoHDKey> {
        if (!this.keyPromise) {
            this.keyPromise = (async () => {
                const root = await ErgoHDKey.fromMnemonic(this.opts.mnemonic, {
                    passphrase: this.opts.password
                });
                return root.derive(`${ERGO_CHANGE_PATH}/${this.opts.addressIndex}`);
            })();
        }
        return this.keyPromise;
    }

    async getChangeAddress(): Promise<string> {
        const key = await this.key();
        return key.address.toString();
    }

    async getUtxos(): Promise<any[]> {
        const addr = await this.getChangeAddress();
        const url = `${this.opts.explorerUri}/api/v1/boxes/unspent/byAddress/${addr}?limit=100`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch UTXOs: HTTP ${res.status}`);
        const json = await res.json();
        return (json.items ?? []).map(explorerBoxToEip12);
    }

    async getCurrentHeight(): Promise<number> {
        const res = await fetch(`${this.opts.explorerUri}/api/v1/networkState`);
        if (!res.ok) throw new Error(`Failed to fetch height: HTTP ${res.status}`);
        const json = await res.json();
        return json.height;
    }

    /** Sign the built transaction with the derived key (no submission). */
    async sign(builtTx: any): Promise<any> {
        const key = await this.key();
        const prover = new Prover(key);
        return prover.signTransaction(builtTx.toEIP12Object(), [key]);
    }

    async finalize(builtTx: any): Promise<SignerResult> {
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
        const txId = (await res.json()) as string;
        return { kind: 'submitted', txId };
    }
}

export interface UnsignedSignerOptions {
    /** The creator's P2PK address (base58) that owns the inputs. */
    address: string;
    /** Ergo explorer base URI (default mainnet). */
    explorerUri?: string;
}

/**
 * Node-side signer that builds the transaction but does NOT sign it — it returns
 * the unsigned EIP-12 object for an external wallet to sign and submit. Use this
 * when the agent must never hold a private key.
 */
export class UnsignedSigner implements Signer {
    private readonly address: string;
    private readonly explorerUri: string;

    constructor(options: UnsignedSignerOptions) {
        if (!options?.address) throw new Error('UnsignedSigner requires an address.');
        this.address = options.address;
        this.explorerUri = options.explorerUri ?? DEFAULT_EXPLORER_URI;
    }

    async getChangeAddress(): Promise<string> {
        return this.address;
    }

    async getUtxos(): Promise<any[]> {
        const url = `${this.explorerUri}/api/v1/boxes/unspent/byAddress/${this.address}?limit=100`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch UTXOs: HTTP ${res.status}`);
        const json = await res.json();
        return (json.items ?? []).map(explorerBoxToEip12);
    }

    async getCurrentHeight(): Promise<number> {
        const res = await fetch(`${this.explorerUri}/api/v1/networkState`);
        if (!res.ok) throw new Error(`Failed to fetch height: HTTP ${res.status}`);
        const json = await res.json();
        return json.height;
    }

    async finalize(builtTx: any): Promise<SignerResult> {
        return { kind: 'unsigned', transaction: builtTx.toEIP12Object() };
    }
}
