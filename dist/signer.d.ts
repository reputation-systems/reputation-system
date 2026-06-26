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
/** Result of finalizing a built transaction through a signer. */
export type SignerResult = {
    kind: 'submitted';
    txId: string;
} | {
    kind: 'unsigned';
    transaction: any;
};
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
/**
 * Wraps the browser `ergo` global. This is the default signer, so existing
 * web-app callers behave exactly as before (sign + submit via Nautilus).
 */
export declare class NautilusSigner implements Signer {
    getChangeAddress(): Promise<string>;
    getUtxos(): Promise<any[]>;
    getCurrentHeight(): Promise<number>;
    finalize(builtTx: any): Promise<SignerResult>;
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
export declare class SeedSigner implements Signer {
    private readonly opts;
    private keyPromise;
    constructor(options: SeedSignerOptions);
    /** Lazily derive (and cache) the change-path child key. */
    private key;
    getChangeAddress(): Promise<string>;
    getUtxos(): Promise<any[]>;
    getCurrentHeight(): Promise<number>;
    /** Sign the built transaction with the derived key (no submission). */
    sign(builtTx: any): Promise<any>;
    finalize(builtTx: any): Promise<SignerResult>;
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
export declare class UnsignedSigner implements Signer {
    private readonly address;
    private readonly explorerUri;
    constructor(options: UnsignedSignerOptions);
    getChangeAddress(): Promise<string>;
    getUtxos(): Promise<any[]>;
    getCurrentHeight(): Promise<number>;
    finalize(builtTx: any): Promise<SignerResult>;
}
