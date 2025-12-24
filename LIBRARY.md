# Reputation System Library

A Svelte/TypeScript library for creating and managing decentralized reputation proofs on the Ergo blockchain.

---

## Installation

```bash
npm install github:reputation-systems/reputation-system
```

---

## Overview

This library exposes:
- **Profile.svelte** - A complete UI component for managing reputation proofs
- **TypeScript functions** - High-level functions for fetching and generating proofs

> **Note**: The library uses `@sveltejs/package` for packaging. Configuration values (explorer URI, contract addresses) are bundled with the library.

---

## Components

### Profile.svelte

The main component for displaying and managing reputation proofs.

```svelte
<script>
    import Profile from 'reputation-system/components/views/Profile.svelte';
</script>

<Profile 
    {reputationProof}
    {userProfiles}
    {connected}
    on:refresh={handleRefresh}
    on:switchProfile={handleSwitchProfile}
/>
```

#### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `reputationProof` | `ReputationProof \| null` | The currently selected reputation proof |
| `userProfiles` | `ReputationProof[]` | Array of all user's reputation proofs |
| `connected` | `boolean` | Whether the wallet is connected |

#### Customization Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `"Reputation Profile"` | Title in hero section |
| `subtitle` | `string \| null` | `null` | Custom subtitle |
| `showDidacticInfo` | `boolean` | `true` | Show educational tooltips |
| `visibleTokenTypes` | `string[] \| null` | `null` | Filter visible type badges |

#### Section Visibility Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showProfileSwitcher` | `boolean` | `true` | Show profile dropdown |
| `showSacrificedAssets` | `boolean` | `true` | Show burned assets section |
| `showTechnicalDetails` | `boolean` | `true` | Show Token ID and Refresh |
| `showBoxesSection` | `boolean` | `true` | Show Reputation Boxes |
| `showFilters` | `boolean` | `true` | Show type/SELF/locked filters |

#### Action Control Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `allowCreateProfile` | `boolean` | `true` | Allow creating profiles |
| `allowSacrifice` | `boolean` | `true` | Allow sacrificing assets |
| `allowEditBox` | `boolean` | `true` | Allow editing boxes |
| `allowDeleteBox` | `boolean` | `true` | Allow deleting boxes |
| `allowSetMainBox` | `boolean` | `true` | Allow setting Main Box |

#### Visual & Behavior Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `compact` | `boolean` | `false` | Compact mode for embedding |
| `maxBoxesVisible` | `number \| null` | `null` | Limit visible boxes |
| `readOnly` | `boolean` | `false` | Disable all actions |
| `autoRefresh` | `boolean` | `false` | Auto-refresh periodically |
| `refreshInterval` | `number` | `30000` | Auto-refresh interval (ms) |

#### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `refresh` | - | Dispatched when refresh is requested |
| `switchProfile` | `ReputationProof` | When user switches profile |

#### Usage Examples

**Read-Only Embed:**

```svelte
<Profile 
    {reputationProof}
    {userProfiles}
    {connected}
    title="Reputation Proof"
    showProfileSwitcher={false}
    showSacrificedAssets={false}
    showTechnicalDetails={false}
    readOnly={true}
    compact={true}
    maxBoxesVisible={5}
/>
```

**Filtered by Type:**

```svelte
<Profile 
    {reputationProof}
    {userProfiles}
    {connected}
    title="Judge Profile"
    visibleTokenTypes={['Verdict', 'Case']}
    allowCreateProfile={false}
    showDidacticInfo={false}
/>
```

---

## Functions

### Proof Generation

#### `generate_reputation_proof(...)`

Generates or modifies a reputation proof by building and submitting a transaction.

```typescript
import { generate_reputation_proof } from 'reputation-system';

const txId = await generate_reputation_proof(
    token_amount,    // number - Amount of tokens
    total_supply,    // number - Total token supply
    type_nft_id,     // string - Type NFT token ID
    object_pointer,  // string | undefined - Object being evaluated
    polarization,    // boolean - true = positive, false = negative
    content,         // object | string | null - Content for R9
    is_locked,       // boolean - Make immutable (default: false)
    input_proof,     // RPBox - Existing box to spend from (optional)
    extra_inputs,    // RPBox[] - Additional boxes to merge (optional)
    extra_erg,       // bigint - Extra ERG to sacrifice (optional)
    extra_tokens,    // {tokenId, amount}[] - Extra tokens (optional)
    explorerUri      // string - Explorer URI (optional)
);
```

**Returns:** `Promise<string | null>` - Transaction ID or null on failure

---

### Profile Fetching

#### `fetchAllProfiles(is_self_defined?, types?, availableTypes, explorerUri?)`

Fetches all ReputationProof objects for the connected user.

```typescript
import { fetchAllProfiles } from 'reputation-system';

const profiles = await fetchAllProfiles(
    null,           // is_self_defined: boolean | null - Filter by self-defined
    [],             // types: string[] - Filter by type NFT IDs
    availableTypes, // Map<string, TypeNFT> - Available types map
    explorerUri     // string - Explorer URI (optional)
);
```

**Returns:** `Promise<ReputationProof[]>`

---

### Type NFTs

#### `fetchTypeNfts(explorerUri?)`

Fetches all available Type NFTs from the blockchain.

```typescript
import { fetchTypeNfts } from 'reputation-system';

const types: Map<string, TypeNFT> = await fetchTypeNfts(explorerUri);
```

**Returns:** `Promise<Map<string, TypeNFT>>`

---

### Reputation List

#### `updateReputationProofList(connected, availableTypes, search, explorerUri?)`

Updates and returns the complete list of all reputation proofs.

```typescript
import { updateReputationProofList } from 'reputation-system';

const proofs = await updateReputationProofList(
    connected,       // boolean - Is wallet connected
    availableTypes,  // Map<string, TypeNFT> - Available types
    search,          // string | null - Search query
    explorerUri      // string - Explorer URI (optional)
);
```

**Returns:** `Promise<Map<string, ReputationProof>>`

---

### Search & Query

#### `searchBoxes(token_id?, type_nft_id?, object_pointer?, is_locked?, polarization?, content?, owner_address?, limit?, offset?, explorerUri?)`

Search for boxes with specific register values. All parameters are optional.

```typescript
import { searchBoxes } from 'reputation-system';

const generator = searchBoxes(
    token_id,        // string - Token ID to search in assets
    type_nft_id,     // string - Type NFT ID for R4
    object_pointer,  // string - Object pointer for R5
    is_locked,       // boolean - Immutable flag for R6
    polarization,    // boolean - Positive/negative for R8
    content,         // string | object - Content for R9
    owner_address,   // string - Owner address for R7
    limit,           // number - Max results
    offset,          // number - Start offset (default 0)
    explorerUri      // string - Explorer URI (optional)
);

for await (const batch of generator) {
    console.log('Received batch of boxes:', batch);
}
```

**Returns:** `AsyncGenerator<ApiBox[]>` - Yields batches of found boxes

---

### Utilities

#### `getAllRPBoxesFromProof(proof)`

Retrieves all boxes (RPBox) from a ReputationProof.

```typescript
import { getAllRPBoxesFromProof } from 'reputation-system';

const boxes: RPBox[] = getAllRPBoxesFromProof(proof);
```

#### `getReputationProofFromRPBox(box, proofs)`

Finds the ReputationProof that owns a specific RPBox.

```typescript
import { getReputationProofFromRPBox } from 'reputation-system';

const proof = getReputationProofFromRPBox(box, proofsMap);
```

#### `getTimestampFromBlockId(blockId, explorerUri?)`

Gets the timestamp of a block.

```typescript
import { getTimestampFromBlockId } from 'reputation-system';

const timestamp: number = await getTimestampFromBlockId(blockId, explorerUri);
```

---

## Types

### ReputationProof

```typescript
interface ReputationProof {
    token_id: string;              // Unique token ID
    types: TypeNFT[];              // Type NFTs identifying this proof
    total_amount: number;          // Total token supply
    owner_address: string;         // Owner's wallet address
    owner_serialized: string;      // Serialized R7 value
    can_be_spend: boolean;         // Whether current user can spend
    current_boxes: RPBox[];        // All boxes in this proof
    number_of_boxes: number;       // Count of boxes
    network: string;              // Always "ergo"
    data: object;                  // Additional data
}
```

### RPBox

```typescript
interface RPBox {
    box: Box<Amount>;              // Fleet-SDK Box object
    box_id: string;                // Box ID
    type: TypeNFT;                 // Type NFT of this box
    token_id: string;              // Token ID
    token_amount: number;          // Amount of tokens
    object_pointer: string;        // R5: Object being evaluated
    is_locked: boolean;            // R6: Immutable flag
    polarization: boolean;         // R8: Positive/negative
    content: object | string | null; // R9: Content
}
```

### TypeNFT

```typescript
interface TypeNFT {
    tokenId: string;        // Type NFT token ID
    boxId: string;          // Box containing the NFT
    typeName: string;       // Human-readable type name
    description: string;    // Type description
    schemaURI: string;      // Schema URI
    isRepProof: boolean;    // Whether it's a reputation type
}
```

---

## Box Register Specification

| Register | Content | Description |
|----------|---------|-------------|
| R4 | Type NFT ID | Identifies the type/standard |
| R5 | Object Pointer | What this proof is about |
| R6 | is_locked | Boolean: immutable if true |
| R7 | Owner Proposition | Serialized owner address |
| R8 | Polarization | Boolean: positive/negative |
| R9 | Content | JSON or string content |

---

## Wallet Integration

The library requires a connected Ergo wallet (e.g., Nautilus) that exposes the `ergo` and `ergoConnector` global objects. The consuming application is responsible for:

1. **Connecting the wallet** - Call your own connection logic
2. **Passing connection state** - Pass `connected` prop to components
3. **Fetching profiles** - Call `fetchAllProfiles()` after connection
4. **Handling refresh events** - Listen to `on:refresh` from Profile component

### Example Integration

```svelte
<script>
    import Profile from 'reputation-system/components/views/Profile.svelte';
    import { fetchAllProfiles, fetchTypeNfts } from 'reputation-system';
    
    let connected = false;
    let reputationProof = null;
    let userProfiles = [];
    let availableTypes = new Map();
    
    async function connectWallet() {
        // Your wallet connection logic
        if (typeof ergoConnector !== 'undefined') {
            await ergoConnector.nautilus.connect();
            connected = true;
            await loadData();
        }
    }
    
    async function loadData() {
        availableTypes = await fetchTypeNfts();
        userProfiles = await fetchAllProfiles(null, [], availableTypes);
        if (userProfiles.length > 0) {
            reputationProof = userProfiles[0];
        }
    }
    
    function handleRefresh() {
        loadData();
    }
    
    function handleSwitchProfile(event) {
        reputationProof = event.detail;
    }
</script>

<button on:click={connectWallet}>Connect</button>

{#if connected}
    <Profile 
        {reputationProof}
        {userProfiles}
        {connected}
        on:refresh={handleRefresh}
        on:switchProfile={handleSwitchProfile}
    />
{/if}
```

---

## License

MIT
