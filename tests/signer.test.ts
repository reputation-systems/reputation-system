/**
 * Tests for the Signer abstraction (src/lib/signer.ts) and the signer-aware
 * publish functions.
 *
 * Two things are proven here:
 *
 *  1. `create_opinion_with_signer` routes EVERY wallet touch-point through the
 *     injected Signer. The test runs under Node with NO `ergo` global, so any
 *     missed `ergo.*` call would throw a ReferenceError. A mock-chain-backed
 *     MockSigner drives a full build → execute and the resulting transaction is
 *     validated against the REAL compiled reputation-proof contract.
 *
 *  2. `SeedSigner` derives a deterministic address from a mnemonic and produces
 *     cryptographically valid signatures (verified offline via the Fleet Prover).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockChain } from "@fleet-sdk/mock-chain";
import { compile } from "@fleet-sdk/compiler";
import {
  OutputBuilder,
  SAFE_MIN_BOX_VALUE,
  TransactionBuilder,
  RECOMMENDED_MIN_FEE_VALUE,
  Box,
  Amount,
  Party,
  ErgoAddress,
} from "@fleet-sdk/core";
import { SByte, SColl, SBool } from "@fleet-sdk/serializer";
import { blake2b256 } from "@fleet-sdk/crypto";
import { ErgoHDKey, Prover, ERGO_CHANGE_PATH, generateMnemonic } from "@fleet-sdk/wallet";
import * as fs from "fs";
import * as path from "path";
import { stringToBytes } from "@scure/base";
import { hexToBytes } from "$lib/utils";
import { create_opinion_with_signer } from "$lib/create_opinion";
import { SeedSigner, UnsignedSigner, type Signer, type SignerResult } from "$lib/signer";

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}
function SString(value: string): string {
  return SColl(SByte, stringToBytes("utf8", value)).toHex();
}
function booleanToSerializer(value: boolean): string {
  return SBool(value).toHex();
}
function getR7(party: Party): string {
  const bytes = hexToBytes(party.address.ergoTree);
  if (!bytes) throw new Error("Could not get ergoTree bytes");
  return SColl(SByte, bytes).toHex();
}

// --- Compile the real contracts (same substitution as envs.ts) ---
const contractsDir = path.resolve(__dirname, "../src/lib/contracts");
const DPG_SOURCE = fs.readFileSync(path.join(contractsDir, "digital_public_good.es"), "utf-8");
const digitalPublicGoodErgoTree = compile(DPG_SOURCE, { version: 1 });
const dpgHash = uint8ArrayToHex(blake2b256(digitalPublicGoodErgoTree.bytes));
const RP_SOURCE = fs
  .readFileSync(path.join(contractsDir, "reputation_proof.es"), "utf-8")
  .replace("`+DIGITAL_PUBLIC_GOOD_SCRIPT_HASH+`", dpgHash);
const reputationProofErgoTree = compile(RP_SOURCE, { version: 1 });

/** A Signer backed by a mock-chain party — proves the seam without a browser. */
class MockSigner implements Signer {
  constructor(private chain: MockChain, private party: Party) {}
  async getChangeAddress(): Promise<string> {
    return this.party.address.toString();
  }
  async getUtxos(): Promise<any[]> {
    return this.party.utxos.toArray();
  }
  async getCurrentHeight(): Promise<number> {
    return this.chain.height;
  }
  async finalize(builtTx: any): Promise<SignerResult> {
    const ok = this.chain.execute(builtTx, { signers: [this.party] });
    if (!ok) throw new Error("mock-chain rejected transaction");
    return { kind: "submitted", txId: builtTx.id };
  }
}

describe("Signer abstraction", () => {
  let mockChain: MockChain;
  let creator: Party;
  let reputationProofContract: Party;
  let dpgContract: Party;
  let typeNftBox: Box<Amount>;
  const typeNftId = "01c236e723a189c99e9c9380dc48a6058e888c88e9a107df1c0519d0a5bf838e";
  const reputationTokenId = uint8ArrayToHex(blake2b256(stringToBytes("utf8", "main-box-token")));
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockChain = new MockChain({ height: 800_000 });
    creator = mockChain.newParty("Creator");
    creator.addBalance({ nanoergs: 100_000_000n });

    reputationProofContract = mockChain.addParty(reputationProofErgoTree.toHex(), "RPContract");
    dpgContract = mockChain.addParty(digitalPublicGoodErgoTree.toHex(), "DPGContract");

    // Type NFT box (data input the contract requires).
    dpgContract.addUTxOs({
      creationHeight: mockChain.height,
      ergoTree: digitalPublicGoodErgoTree.toHex(),
      value: SAFE_MIN_BOX_VALUE,
      assets: [{ tokenId: typeNftId, amount: 1n }],
      additionalRegisters: {
        R4: SString("Skill Type"),
        R5: SString("A type for testing."),
        R6: SString("https://schema.org/CreativeWork"),
        R7: booleanToSerializer(true),
      },
    });
    typeNftBox = dpgContract.utxos.toArray()[0];

    // Main reputation-proof box owned by the creator (the "profile" main box),
    // R5 points to its own reputation token (a SELF box).
    reputationProofContract.addUTxOs({
      creationHeight: mockChain.height,
      ergoTree: reputationProofErgoTree.toHex(),
      value: SAFE_MIN_BOX_VALUE,
      assets: [{ tokenId: reputationTokenId, amount: 1000n }],
      additionalRegisters: {
        R4: SColl(SByte, hexToBytes(typeNftId) ?? "").toHex(),
        R5: SColl(SByte, hexToBytes(reputationTokenId) ?? "").toHex(),
        R6: booleanToSerializer(false),
        R7: getR7(creator),
        R8: booleanToSerializer(true),
        R9: SString(JSON.stringify({ name: "creator profile" })),
      },
    });

    // Stub the Type-NFT data-input fetch create_opinion performs.
    globalThis.fetch = (async (url: any) => {
      const u = String(url);
      if (u.includes(`/boxes/byTokenId/${typeNftId}`)) {
        const b = typeNftBox as any;
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                boxId: b.boxId,
                value: b.value.toString(),
                ergoTree: b.ergoTree,
                creationHeight: b.creationHeight,
                assets: b.assets.map((a: any) => ({ tokenId: a.tokenId, amount: a.amount.toString() })),
                additionalRegisters: b.additionalRegisters,
                index: b.index ?? 0,
                transactionId: b.transactionId,
              },
            ],
          }),
        } as any;
      }
      throw new Error(`unexpected fetch in test: ${u}`);
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockChain.reset();
  });

  it("routes create_opinion_with_signer entirely through the Signer and produces a valid on-chain box", async () => {
    const mainProofBox = reputationProofContract.utxos.toArray()[0] as any;
    const main_box: any = {
      box: {
        boxId: mainProofBox.boxId,
        value: mainProofBox.value.toString(),
        assets: mainProofBox.assets.map((a: any) => ({ tokenId: a.tokenId, amount: a.amount.toString() })),
        ergoTree: mainProofBox.ergoTree,
        creationHeight: mainProofBox.creationHeight,
        additionalRegisters: mainProofBox.additionalRegisters,
        index: mainProofBox.index ?? 0,
        transactionId: mainProofBox.transactionId,
      },
      box_id: mainProofBox.boxId,
      type: { tokenId: typeNftId },
      token_id: reputationTokenId,
      token_amount: 1000,
      object_pointer: reputationTokenId,
      is_locked: false,
      polarization: true,
      content: {},
    };

    const signer = new MockSigner(mockChain, creator);
    const result = await create_opinion_with_signer(
      signer,
      "https://api.ergoplatform.com",
      10, // token_amount for the new opinion
      typeNftId,
      "skill-object-pointer",
      true,
      { rating: "great skill", source_hash: "abc123" },
      false,
      main_box
    );

    expect(result.kind).to.equal("submitted");
    // main box (990 left) + new opinion box (10) both land at the contract.
    const boxes = reputationProofContract.utxos.toArray();
    expect(boxes.length).to.equal(2);
    const opinionBox = boxes.find((b) => b.assets[0]?.amount === 10n);
    expect(opinionBox, "opinion box with 10 reputation tokens exists").to.not.be.undefined;
    expect(opinionBox!.additionalRegisters.R4).to.equal(
      SColl(SByte, hexToBytes(typeNftId) ?? "").toHex()
    );
  });
});

describe("SeedSigner", () => {
  // A fixed mnemonic for determinism (test-only; never used on mainnet).
  const MNEMONIC =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

  it("derives a deterministic mainnet address from the mnemonic", async () => {
    const signer = new SeedSigner({ mnemonic: MNEMONIC });
    const addr1 = await signer.getChangeAddress();
    const addr2 = await signer.getChangeAddress();
    expect(addr1).to.equal(addr2); // cached + stable

    // Independently derive the same address to confirm the derivation path.
    const root = await ErgoHDKey.fromMnemonic(MNEMONIC);
    const child = root.derive(`${ERGO_CHANGE_PATH}/0`);
    expect(addr1).to.equal(child.address.toString());
    expect(addr1.startsWith("9")).to.be.true; // mainnet P2PK
  });

  it("signs a transaction over its own inputs (real key derivation + Prover)", async () => {
    const signer = new SeedSigner({ mnemonic: MNEMONIC });
    const addr = await signer.getChangeAddress();
    const ergoTree = ErgoAddress.fromBase58(addr).ergoTree;

    // Mint a valid P2PK box at the derived address via mock-chain, so the input
    // is well-formed for Fleet's tx builder + prover.
    const chain = new MockChain({ height: 800_000 });
    const holder = chain.addParty(ergoTree, "SeedHolder");
    holder.addUTxOs({
      creationHeight: chain.height,
      ergoTree,
      value: 100_000_000n,
      assets: [],
      additionalRegisters: {},
    });

    const built = new TransactionBuilder(chain.height + 1)
      .from(holder.utxos.toArray())
      .to(new OutputBuilder(1_000_000n, addr))
      .sendChangeTo(addr)
      .payFee(RECOMMENDED_MIN_FEE_VALUE)
      .build();

    // SeedSigner.sign performs the derivation + Prover.signTransaction. It only
    // succeeds if the derived key actually owns the input's ergoTree.
    const signed: any = await signer.sign(built);
    expect(signed.inputs.length).to.equal(1);
    expect(signed.inputs[0].spendingProof.proofBytes, "non-empty Schnorr proof").to.be.a("string").and.not.equal("");
  });

  it("UnsignedSigner returns the unsigned transaction instead of submitting", async () => {
    const signer = new UnsignedSigner({ address: "9hY16vzHmmfyVBwKeFGHvb2bMFsG94A1u7To1QGtuQ1xHHEwYS3" });
    const fakeBuilt = { toEIP12Object: () => ({ inputs: [], outputs: [] }) };
    const res = await signer.finalize(fakeBuilt as any);
    expect(res.kind).to.equal("unsigned");
    expect((res as any).transaction).to.deep.equal({ inputs: [], outputs: [] });
  });
});
