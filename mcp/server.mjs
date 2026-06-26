#!/usr/bin/env node
/**
 * Reputation System MCP server.
 *
 * Exposes the full operational surface of the `reputation-system` library over
 * MCP stdio, so any MCP-aware client (Claude, IDEs, agents) can read the
 * on-chain reputation graph AND publish to it. The publish logic and queries are
 * imported from the library's Node entry (`reputation-system/node`) — there is
 * no re-implementation here.
 *
 * Read tools (no wallet needed):
 *   get_contract_info   – derived contract addresses/hashes + profile constants
 *   fetch_type_nfts     – all Type NFT definitions
 *   fetch_all_profiles  – all reputation profiles (global view)
 *   search_boxes        – search reputation-proof boxes by token/type/pointer/owner
 *   get_block_timestamp – timestamp for a block id
 *
 * Publish tools (signer from env — see mcp/lib.mjs; REP_SIGNER_MODE=seed|unsigned):
 *   create_profile      – mint a reputation profile (a "SELF" box)
 *   create_opinion      – create a reputation opinion against a Type NFT
 *
 * The library also exports low-level serializer helpers (hexToBytes, SString,
 * serializedToRendered, …) and `*_chained` tx builders; those are building
 * blocks for the functions above, not agent operations, so they are not exposed
 * as tools.
 *
 * Run: `npm run mcp`
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import {
  create_profile_with_signer,
  create_opinion_with_signer,
  fetchTypeNfts,
  fetchAllProfiles,
  searchBoxes,
  getTimestampFromBlockId,
  ergo_tree_address,
  ergo_tree_hash,
  digital_public_good_contract_hash,
  explorer_uri,
  PROFILE_TYPE_NFT_ID,
  PROFILE_TOTAL_SUPPLY
} from 'reputation-system/node';

import { EXPLORER_API, makeSigner, fetchMainBox, describeResult } from './lib.mjs';

// searchBoxes is an async generator; collect it into an array.
async function collect(gen) {
  const all = [];
  for await (const batch of gen) all.push(...batch);
  return all;
}

// ── Tool registry ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_contract_info',
    description: 'Return the derived reputation-proof contract address/hash, the digital-public-good hash, the profile Type NFT id, and the configured explorer.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'fetch_type_nfts',
    description: 'Fetch every Type NFT definition (category) registered under the digital-public-good contract.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'fetch_all_profiles',
    description: 'Fetch all reputation profiles in the network (global view). Optionally filter by Type NFT ids.',
    inputSchema: {
      type: 'object',
      properties: {
        types: { type: 'array', items: { type: 'string' }, description: 'Optional Type NFT ids to filter by.' },
        isSelfDefined: { type: 'boolean', description: 'Optional: only self-defined (SELF) profiles.' },
        limit: { type: 'number', description: 'Max profiles (default 50).' },
        offset: { type: 'number', description: 'Pagination offset (default 0).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'search_boxes',
    description: 'Search reputation-proof boxes by any combination of reputation token id, Type NFT id, object pointer, lock/polarization flags, owner address, or content.',
    inputSchema: {
      type: 'object',
      properties: {
        tokenId: { type: 'string', description: 'Reputation token id to filter by.' },
        typeNftId: { type: 'string', description: 'Type NFT id (R4).' },
        objectPointer: { type: 'string', description: 'Object pointer (R5).' },
        isLocked: { type: 'boolean', description: 'Lock flag (R6).' },
        polarization: { type: 'boolean', description: 'Polarization flag (R8).' },
        content: { type: 'string', description: 'Content substring/JSON to match (R9).' },
        ownerAddress: { type: 'string', description: 'Owner P2PK address (base58) to filter by (R7).' },
        limit: { type: 'number', description: 'Max boxes (default 100).' },
        offset: { type: 'number', description: 'Pagination offset (default 0).' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_block_timestamp',
    description: 'Return the unix timestamp (ms) for a given block id.',
    inputSchema: {
      type: 'object',
      properties: { blockId: { type: 'string', description: 'Hex block id.' } },
      required: ['blockId'],
      additionalProperties: false
    }
  },
  // ── Publish tools ─────────────────────────────────────────────────────────
  {
    name: 'create_profile',
    description: 'Mint a new reputation profile (a SELF box that mints the reputation token). Signing is per REP_SIGNER_MODE (seed submits; unsigned returns the tx).',
    inputSchema: {
      type: 'object',
      properties: {
        totalSupply: { type: 'number', description: `Total reputation tokens to mint (default ${PROFILE_TOTAL_SUPPLY}).` },
        typeNftId: { type: 'string', description: `Type NFT id for the profile (default the profile type ${PROFILE_TYPE_NFT_ID}).` },
        content: { description: 'Optional profile content (string or JSON object).' },
        sacrificedErg: { type: 'string', description: 'Optional extra ERG (nanoErg, as string) to lock into the profile box.' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'create_opinion',
    description: 'Create a reputation opinion against a Type NFT, spending from a reputation profile box. Signing is per REP_SIGNER_MODE.',
    inputSchema: {
      type: 'object',
      properties: {
        mainBoxId: { type: 'string', description: 'Hex box id of the reputation profile box to spend from.' },
        typeNftId: { type: 'string', description: 'Type NFT id (category) for the opinion.' },
        objectPointer: { type: 'string', description: 'The object the opinion points at (e.g. a box id or URI).' },
        polarization: { type: 'boolean', description: 'Positive (true) or negative (false) opinion.' },
        content: { description: 'Opinion content (string or JSON object).' },
        isLocked: { type: 'boolean', description: 'Lock the opinion box so it cannot be updated (default true).' },
        tokenAmount: { type: 'number', description: 'Reputation tokens to allocate (default 1).' }
      },
      required: ['mainBoxId', 'typeNftId', 'polarization'],
      additionalProperties: false
    }
  }
];

const HANDLERS = {
  get_contract_info: async () => ({
    explorerUri: EXPLORER_API,
    reputationProofAddress: ergo_tree_address,
    reputationProofTemplateHash: ergo_tree_hash,
    digitalPublicGoodContractHash: digital_public_good_contract_hash,
    profileTypeNftId: PROFILE_TYPE_NFT_ID,
    profileTotalSupply: PROFILE_TOTAL_SUPPLY,
    libraryExplorerDefault: explorer_uri
  }),

  fetch_type_nfts: async () => {
    const map = await fetchTypeNfts(EXPLORER_API);
    return Array.from(map.values());
  },

  fetch_all_profiles: async ({ types = [], isSelfDefined = null, limit = 50, offset = 0 } = {}) => {
    const availableTypes = await fetchTypeNfts(EXPLORER_API);
    return fetchAllProfiles(EXPLORER_API, isSelfDefined, types, availableTypes, limit, offset);
  },

  search_boxes: async (args = {}) => {
    const {
      tokenId, typeNftId, objectPointer, isLocked, polarization, content, ownerAddress,
      limit = 100, offset = 0
    } = args;
    return collect(
      searchBoxes(
        EXPLORER_API, tokenId, typeNftId, objectPointer, isLocked, polarization, content, ownerAddress, limit, offset
      )
    );
  },

  get_block_timestamp: async ({ blockId }) => ({
    blockId,
    timestamp: await getTimestampFromBlockId(EXPLORER_API, blockId)
  }),

  create_profile: async ({ totalSupply, typeNftId, content = null, sacrificedErg } = {}) => {
    const signer = makeSigner();
    const result = await create_profile_with_signer(
      signer,
      EXPLORER_API,
      totalSupply ?? PROFILE_TOTAL_SUPPLY,
      typeNftId ?? PROFILE_TYPE_NFT_ID,
      content,
      sacrificedErg ? BigInt(sacrificedErg) : 0n
    );
    return describeResult(result);
  },

  create_opinion: async ({ mainBoxId, typeNftId, objectPointer = '', polarization, content = null, isLocked = true, tokenAmount = 1 }) => {
    const signer = makeSigner();
    const main_box = await fetchMainBox(mainBoxId);
    const result = await create_opinion_with_signer(
      signer,
      EXPLORER_API,
      tokenAmount,
      typeNftId,
      objectPointer,
      polarization,
      content,
      isLocked,
      main_box
    );
    return describeResult(result);
  }
};

// ── Server bootstrap ──────────────────────────────────────────────────────

const server = new Server(
  { name: 'reputation-system', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const handler = HANDLERS[name];
  if (!handler) {
    return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
  try {
    const data = await handler(args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: `Error in ${name}: ${err?.message || String(err)}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
