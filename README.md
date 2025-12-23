# **Decentralized Reputation System on Ergo**

## 1. Summary

This document describes a decentralized reputation system built on the Ergo blockchain. The system enables the creation, management, and verification of reputation proofs in an atomic, secure, and transparent way. Its architecture is based on two interdependent ErgoScript contracts:

1. **"Digital Public Good" Contract (Type NFT)**: Defines immutable standards for reputation types, reputation tokens, or specific opinions.
2. **"Reputation Token" Contract**: Governs the boxes (UTXOs) that contain actual reputation proofs, ensuring state consistency and owner control.

---

## 2. System Architecture

### 2.1. "Digital Public Good" Contract (Type NFT)

This contract protects a box containing a **unique NFT** and metadata defining a reputation type. It provides the **public and immutable standard** that other reputation boxes must reference.

#### **Register Structure**

| Register | Type | Description |
| --- | --- | --- |
| **R4** | `Coll[Byte]` | **Reference Pointer**: Points to the subject of the reputation (see 2.1.1). |
| **R5** | `Coll[Byte]` | `description`: Purpose and usage notes. |
| **R6** | `Coll[Byte]` | `schemaURI`: Link to a schema (JSON, IPFS) for proof data. |
| **R7** | `Boolean` | `isReputationProof`: `true` if this type is used for reputation/opinions. |

#### **2.1.1. R4 Organic Specification (Hierarchical Reference)**

When `R7` is `true`, `R4` follows an organic, length-based hierarchy in segments of 32 bytes to define the scope of the reputation.

| Size | Structure | Interpretation | Scope |
| --- | --- | --- | --- |
| **32b** | `[ID]` | **Reputation Token** | Local (Ergo) |
| **64b** | `[Token][Box]` | **Specific Opinion** | Local (Ergo) |
| **64b** | `[Net][Token]` | **Reputation Token** | External Network |
| **96b** | `[Net][Token][Box]` | **Specific Opinion** | External Network |

* **Contextual Resolution**: If 64 bytes are provided, the system determines if it is an *Opinion* or an *External Token* by checking if the first segment matches a known Token ID or a Network ID.

---

### 2.2. "Reputation Token" Contract (Reputation Box)

This contract governs a **reputation proof box**, representing part of a distributed collection that must remain coherent.

#### **Register and Token Structure**

| Element | Type | Description |
| --- | --- | --- |
| **Token(0)** | `(Coll[Byte], Long)` | `(repTokenId, amount)`: The reputation token. |
| **R4** | `Coll[Byte]` | `typeNftTokenId`: The Type NFT (DPG) this box adheres to. |
| **R5** | `Coll[Byte]` | `uniqueObjectData`: Data identifying the rated object. |
| **R6** | `Boolean` | `isLocked`: If `true`, the box becomes immutable. |
| **R7** | `Coll[Byte]` | `blake2b256(propositionBytes)` of the **owner script**. |

---

#### **Spending Logic**

**2.2.1. Admin Path (Signature Required)**
Used for managing collections (issuing, updating, freezing).

* **Authorization**: Verified via owner's script hash in `R7`.
* **Binding**: The Type NFT (DPG) must be in `dataInputs` and match `R4`.
* **Atomic Consistency**: All sibling reputation boxes (same `repTokenId`) must be included in the transaction to ensure the `totalSupply` is preserved and validated.

**2.2.2. ERG Top-Up Path (Public)**
Allows anyone to prevent box destruction by storage rent.

* The successor must be an **identical copy** (script, registers, tokens).
* The ERG value must be **greater than or equal** to the input.

---

## 3. System Interaction Flow

1. **Creating a Standard**: A participant creates a **Type NFT** (Digital Public Good).
* To define a **General Reputation**, `R4` contains a 32-byte Token ID.
* To define a **Specific Opinion**, `R4` contains a 64-byte `[Token][Box]` reference.


2. **Issuing Reputation**: An owner issues **Reputation Boxes** linked to the Type NFT.
3. **Cross-Chain Referencing**: For assets on other chains, the Type NFT is created with a 64b or 96b `R4` including the `Network_ID`.
4. **Sustaining the System**: Community members top up boxes with ERG to ensure long-term persistence without owner intervention.

---

---

## 5. Didactic Reasoning: How it Works

To understand the system, it's helpful to look at it through these core concepts:

### 5.1. The Reputation Profile (Identity)
A **Reputation Profile** is not just an account; it is a **Reputation Proof** that points to itself. This self-reference creates a unique identity on the blockchain. Your profile is the anchor for all your other reputation assertions. **SELF boxes** within a profile serve as the primary containers of reputation tokens, allowing you to issue new reputation boxes by distributing tokens from them.

### 5.2. Sacrificed Assets (Commitment)
Why do we "burn" or "sacrifice" ERG and tokens? In a decentralized world, trust must be backed by something tangible. By locking assets into reputation boxes, you are demonstrating **skin in the game**. The more assets you sacrifice, the more "weight" or "responsibility" your profile carries, as it shows you are willing to commit resources to back your claims. **These assets are permanent and can never be withdrawn**, ensuring that the commitment remains as long as the reputation exists (they can only be reduced by the blockchain's storage rent/demurrage mechanism).

### 5.3. Reputation Boxes (Atomic Proofs)
Reputation is not a single number; it's a collection of **Reputation Boxes**. Each box represents a specific piece of information or an opinion, linked to a **Type**. This modularity allows for a rich, multi-faceted reputation that can be updated, expanded, or even partially deleted (returning the tokens to your main profile).

### 5.4. Types (The Standards)
**Types** are the "Digital Public Goods" of the system. They define the rules and the meaning of a reputation box. Because they are unique NFTs, they provide an immutable standard that everyone can agree on. For example, a "Judge" type or a "Web URL" type ensures that everyone interpreting the data knows exactly what it represents.

---

## 6. Conclusion

This system introduces a **formally verifiable framework** for decentralized reputation. By utilizing an organic, segment-based reference model in `R4`, it distinguishes between general reputation tokens and specific opinions across multiple chains without requiring protocol forks or complex versioning.

Leveraging Ergo’s **eUTXO model**, the protocol transforms trust assertions into **immutable, community-verifiable, and sustainable digital assets**.
