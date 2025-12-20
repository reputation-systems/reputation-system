# **Decentralized Reputation System on Ergo**

[![Ergo Platform Badge](https://img.shields.io/badge/Built_on-Ergo-FBBF24)](https://ergoplatform.org)

## 1. Summary

This document describes a decentralized reputation system built on the Ergo blockchain.
The system enables the creation, management, and verification of reputation proofs in an atomic, secure, and transparent way.
Its architecture is based on two interdependent ErgoScript contracts:

1. **"Digital Public Good" Contract (Type NFT)**: Defines immutable standards for reputation types.
2. **"Reputation Token" Contract**: Governs the boxes (UTXOs) that contain actual reputation proofs, ensuring state consistency and owner control.

The design leverages Ergo’s **eUTXO model**, enabling complex validation and atomic updates of reputation collections, preventing inconsistent or fragmented states.

---

## 2. System Architecture

The system is composed of two types of boxes (UTXOs), each governed by a specific contract.

---

### 2.1. "Digital Public Good" Contract (Type NFT)

This contract protects a box containing a **unique NFT** and metadata defining a reputation type.
It provides the **public and immutable standard** that other reputation boxes must reference.

#### **Purpose**

* **Standardization**: Defines the structure and semantics of a reputation type (e.g., "Smart Contract Audit").
* **Immutability**: Guarantees that once defined, the type cannot be altered.
* **Digital Public Good**: Anyone can top up the box with ERG to pay for storage rent, without altering the type definition.

#### **Register Structure**

| Register | Type         | Description                                                             |
| :------- | :----------- | :---------------------------------------------------------------------- |
| **R4**   | `Coll[Byte]` | `typeName`: Human-readable name of the type (e.g., "Web URL").          |
| **R5**   | `Coll[Byte]` | `description`: Purpose and usage notes.                                 |
| **R6**   | `Coll[Byte]` | `schemaURI`: Link to a schema (JSON Schema, IPFS, etc.) for proof data. |
| **R7**   | `Boolean`    | `isReputationProof`: `true` if this type is used for reputation proofs. |
| **R8**   | (Empty)      | Reserved for future use.                                                |
| **R9**   | (Empty)      | Reserved for future use.                                                |

#### **Spending Logic**

1. **Anyone can spend the box** (no signature required).
2. The transaction is valid **only if exactly one successor box** is created:

   * Must preserve the same **script, registers (R4–R9), and NFT token**.
   * Only the ERG value may change, and it must be **greater than or equal to** the input.

This guarantees that **standards cannot be destroyed, duplicated, or modified**, but can always be kept alive by community-funded ERG top-ups.

---

### 2.2. "Reputation Token" Contract (Reputation Box)

This contract governs a **reputation proof box**, representing part of a distributed collection that must remain coherent.

#### **Purpose**

* **Governance**: Defines creation, modification, and transfer rules for reputation proofs.
* **Atomic Consistency**: Ensures all reputation boxes in a collection are validated together.
* **Owner Control**: Only the designated owner can authorize structural changes.

#### **Register and Token Structure**

| Element      | Type                 | Description                                                                 |
| :----------- | :------------------- | :-------------------------------------------------------------------------- |
| **Token(0)** | `(Coll[Byte], Long)` | `(repTokenId, amount)`: The reputation token held by this box.              |
| **R4**       | `Coll[Byte]`         | `typeNftTokenId`: The Type NFT this reputation box adheres to.              |
| **R5**       | `Coll[Byte]`         | `uniqueObjectData`: Data uniquely identifying the rated object.             |
| **R6**       | `Boolean`            | `isLocked`: Lock state of the reputation box.                               |
| **R7**       | `Coll[Byte]`         | `blake2b256(propositionBytes)` of the **owner script**.                     |
| **R8**       | `Boolean`            | `customFlag`: Optional application-specific flag.                           |
| **R9**       | `Coll[Byte]`         | Reserved for future extensions.                                             |

---

#### **Spending Logic (Two Paths)**

The contract can be spent via two distinct paths:

---

**2.2.1. Admin Path (Signature Required)**

Used for managing collections (e.g., issuing, updating, freezing reputation).

* **Authorization**:
  At least one input must include the **owner’s script**, verified by comparing its `blake2b256(propositionBytes)` against R7.

* **Binding to a Standard**:
  The corresponding **Type NFT** box must be present in `dataInputs`, and its token ID must match R4.

* **Proof of Completeness**:
  All sibling reputation boxes (same `repTokenId`) must be included in `dataInputs`.
  The contract verifies that:

  * The sum of token amounts across all inputs + dataInputs = `totalSupply`.
  * Input and output token balances match (no minting/burning).

* **Output Rules**:

  * **Preservation**: `totalSupply` and `owner` must remain unchanged.
  * **Locking (`isLocked`)**:

    * If `true`, the box becomes immutable (except ERG).
    * Once locked, it can never be unlocked.

---

**2.2.2. ERG Top-Up Path (Public, Signature-Free)**

Used for preventing boxes from being destroyed by storage rent.

* Anyone can spend the box.
* Must produce **exactly one successor** that is an **identical copy** (script, registers, tokens).
* The ERG value must be **greater than or equal to** the input.

This ensures longevity of the reputation system, without requiring owner involvement.

---

## 3. System Interaction Flow

1. **Creating a Standard**:
   A participant creates a **Type NFT** box (Digital Public Good). This NFT defines the schema for a new reputation type.

2. **Issuing Reputation**:
   An owner issues one or more **Reputation Boxes**, linking them to the Type NFT via R4, and anchoring object-specific data in R5.

3. **Managing Collections**:
   To update or reorganize reputation, the owner uses the **Admin Path**, including all sibling boxes and the Type NFT.
   The contract enforces **atomic validation** of the full collection.

4. **Sustaining the System**:
   Anyone can **top up ERG** in either the Type NFT or Reputation Boxes to cover storage rent, ensuring persistence.

---

## 4. Conclusion

This system introduces a **formally verifiable framework** for decentralized reputation management on Ergo.

Key properties include:

* **Immutable Standards**: Type NFTs serve as unchangeable foundations.
* **Owner Authority**: Only the rightful owner can modify collections.
* **Atomic Consistency**: Prevents fragmentation by enforcing full-state validation.
* **Sustainability**: Public top-ups guarantee long-term operability.

By leveraging Ergo’s **eUTXO model**, this reputation protocol achieves transparency, robustness, and mathematical security — transforming trust assertions into **immutable, community-verifiable digital assets**.
