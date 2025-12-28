# Ergo Reputation System Library

This library provides the core logic and functions for interacting with the Ergo Reputation System. It handles profile creation, opinion management, asset sacrifice, and data fetching from the blockchain.

## Core Types

### `ReputationProof`
Represents a complete reputation profile, identified by a unique token ID.
```typescript
interface ReputationProof {
    token_id: string;
    types: TypeNFT[];      // SELF identification of the proof types
    total_amount: number;  // Total reputation tokens minted
    owner_address: string;
    owner_serialized: string;
    can_be_spend: boolean;
    current_boxes: RPBox[];
    number_of_boxes: number;
    network: string;
    data: object;
}
```

### `RPBox`
Represents a single box (UTXO) belonging to a reputation proof.
```typescript
interface RPBox {
    box: Box<Amount>;      // The raw Fleet SDK box
    box_id: string;
    type: TypeNFT;
    token_id: string;
    token_amount: number;
    object_pointer: string; // R5: points to self (profile) or an object (opinion)
    is_locked: boolean;     // R6: true if the box is immutable
    polarization: boolean;  // R8: true for positive, false for negative
    content: object | string | null; // R9: additional data
}
```

### `TypeNFT`
Represents a Type NFT that defines a category or standard for reputation boxes.
```typescript
interface TypeNFT {
    tokenId: string;
    boxId: string;
    typeName: string;
    description: string;
    schemaURI: string;
    isRepProof: boolean;
}
```

### `OutputConfig`
Configuration for creating or updating boxes via `update_boxes`.
```typescript
interface OutputConfig {
    token_amount: number;
    type_nft_id?: string;
    object_pointer?: string;
    polarization?: boolean;
    content?: object | string | null;
    is_locked?: boolean;
    extra_erg?: bigint;
    receive_non_reputation_tokens?: boolean;
}
```

---

## Functions

### Profile & Opinion Management

#### `create_profile`
Creates a new reputation profile by minting a new reputation token.
```typescript
async function create_profile(
    explorerUri: string,
    total_supply: number,
    type_nft_id: string,
    content: object | string | null = null,
    sacrified_erg: bigint = 0n,
    sacrified_tokens: { tokenId: string; amount: bigint }[] = []
): Promise<string | null>
```

#### `create_opinion`
Creates a new opinion box by spending tokens from a main box.
```typescript
async function create_opinion(
    explorerUri: string,
    token_amount: number,
    type_nft_id: string,
    object_pointer: string | undefined,
    polarization: boolean,
    content: object | string | null,
    is_locked: boolean = false,
    main_box: RPBox
): Promise<string | null>
```

#### `update_opinion`
Updates an existing opinion box by recreating it with modified parameters.
```typescript
async function update_opinion(
    explorerUri: string,
    opinion_box: RPBox,
    polarization?: boolean,
    content?: object | string | null,
    token_amount_delta: number = 0,
    extra_erg: bigint = 0n,
    is_locked?: boolean,
    main_box?: RPBox
): Promise<string | null>
```

#### `remove_opinion`
Removes an opinion box by merging its assets into the main box.
```typescript
async function remove_opinion(
    explorerUri: string,
    opinion_box: RPBox,
    main_box: RPBox
): Promise<string | null>
```

#### `sacrifice_assets`
Adds ERG and tokens to an existing reputation box permanently.
```typescript
async function sacrifice_assets(
    explorerUri: string,
    target_box: RPBox,
    sacrified_erg: bigint = 0n,
    sacrified_tokens: { tokenId: string; amount: bigint }[] = []
): Promise<string | null>
```

#### `update_boxes`
Generic function for complex box manipulations (merge, split, redistribute).
```typescript
async function update_boxes(
    explorerUri: string,
    input_boxes: RPBox[],
    output_configs: OutputConfig[],
    sacrified_erg: bigint = 0n,
    sacrified_tokens: { tokenId: string; amount: bigint }[] = []
): Promise<string>
```

### Data Fetching

#### `fetchAllProfiles`
Fetches all reputation profiles for the connected user.
```typescript
async function fetchAllProfiles(
    explorerUri: string,
    is_self_defined: boolean | null = null,
    types: string[] = [],
    availableTypes: Map<string, TypeNFT>
): Promise<ReputationProof[]>
```

#### `updateReputationProofList`
Searches and updates a list of reputation proofs based on a search term.
```typescript
async function updateReputationProofList(
    explorerUri: string,
    connected: boolean,
    availableTypes: Map<string, TypeNFT>,
    search: string | null
): Promise<Map<string, ReputationProof>>
```

#### `fetchTypeNfts`
Fetches all available Type NFTs from the blockchain.
```typescript
async function fetchTypeNfts(explorerUri: string): Promise<Map<string, TypeNFT>>
```

#### `searchBoxes`
Async generator for searching unspent boxes with specific registers.
```typescript
async function* searchBoxes(
    explorerUri: string,
    token_id?: string,
    type_nft_id?: string,
    object_pointer?: string,
    is_locked?: boolean,
    polarization?: boolean,
    content?: string | object,
    owner_address?: string,
    limit?: number,
    offset: number = 0
): AsyncGenerator<ApiBox[]>
```

#### `getTimestampFromBlockId`
Gets the timestamp for a specific block.
```typescript
async function getTimestampFromBlockId(explorerUri: string, blockId: string): Promise<number>
```

### Utilities

#### `getAllRPBoxesFromProof`
Extracts all `RPBox` objects from a `ReputationProof`.
```typescript
function getAllRPBoxesFromProof(proof: ReputationProof): RPBox[]
```

#### `getReputationProofFromRPBox`
Finds the parent `ReputationProof` for a given `RPBox`.
```typescript
function getReputationProofFromRPBox(
    box: RPBox,
    proofs: Map<string, ReputationProof>
): ReputationProof | undefined
```

#### `calculate_reputation`
Calculates a basic reputation score based on the burned value of a proof.
```typescript
function calculate_reputation(proof: ReputationProof): number
```

#### `total_burned`
Calculates the total burned ERG value from a `ReputationProof` in nanoERG.
```typescript
function total_burned(proof: ReputationProof): number
```

#### `total_burned_string`
Formats the total burned ERG value into a human-readable string with up to 9 decimal places.
```typescript
function total_burned_string(proof: ReputationProof): string
```

---

## Svelte Components

### `Profile`
A comprehensive view component for displaying and managing a reputation profile.

**Props:**
- `reputationProof`: The `ReputationProof` object to display.
- `userProfiles`: List of other profiles owned by the user (for the switcher).
- `connected`: Boolean indicating if a wallet is connected.
- `title`: Header title (default: "Reputation Profile").
- `subtitle`: Optional subtitle.
- `compact`: Boolean for a more condensed layout.
- `showBoxesSection`: Show/hide the reputation boxes list.
- `showReceivedOpinions`: Show/hide the opinions received section.
- `readOnly`: Disable all interactive actions.
- `allowCreateProfile`: Enable/disable profile creation.
- `allowSacrifice`: Enable/disable asset sacrifice.
- `allowEditBox`: Enable/disable editing existing boxes.
- `allowDeleteBox`: Enable/disable deleting boxes.
- `allowSetMainBox`: Enable/disable setting a box as the main profile box.

