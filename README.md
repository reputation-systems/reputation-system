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

## 4. Conclusion

This system introduces a **formally verifiable framework** for decentralized reputation. By utilizing an organic, segment-based reference model in `R4`, it distinguishes between general reputation tokens and specific opinions across multiple chains without requiring protocol forks or complex versioning.

Leveraging Ergo’s **eUTXO model**, the protocol transforms trust assertions into **immutable, community-verifiable, and sustainable digital assets**.
