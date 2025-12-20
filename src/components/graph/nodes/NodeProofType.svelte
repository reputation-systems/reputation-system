<script lang="ts">
  import { Position, type NodeProps, Handle, useSvelteFlow, type Connection } from '@xyflow/svelte';
  import { type ReputationProof } from '$lib/ReputationProof';
  import { building_graph, data_store } from '$lib/store';
  import PointOneToAnother from './point_to/PointOneToAnother.svelte';
  import { get } from 'svelte/store';

  // --- Component Props and SvelteFlow hooks ---
  type $$Props = NodeProps;
  export let id: $$Props['id'];
  export let data: $$Props['data'];
  export let selected: $$Props['selected'] = undefined;
  export let isConnectable: $$Props['isConnectable'] = undefined;
  // ... other props are available but not used directly in this logic
  export let targetPosition: $$Props['targetPosition'] = undefined;
  export let sourcePosition: $$Props['sourcePosition'] = undefined;

  const { viewport } = useSvelteFlow();

  // --- Component State ---
  let showModal = false;
  // The proof data is passed in via the 'data' prop from the main graph component.
  let proof: ReputationProof = data.proof;
  // This will hold the information about the connection being made.
  let activeConnection: Connection | null = null;
  // This will be the ID of the object the new proof box will point to.
  let targetPointer: string | null = null;
  
  // --- Computed State ---
  // Determines if the content inside the node should be visible based on zoom level.
  let showContent = false;
  $: showContent = $viewport.zoom > 1.2;

  // --- Event Handlers ---

  /**
   * Opens the data panel when the node is double-clicked.
   */
  function handleDblClick() {
    data_store.set(proof);
  }

  /**
   * Triggered when a user completes a drag-connection from this node to a target handle.
   * It extracts the target information and opens a modal to create a new proof pointer.
   */
  function handleConnection(connections: Connection[]) {
    // A connection event can sometimes fire with an empty array, so we check.
    if (!connections || connections.length === 0) return;

    activeConnection = connections[0];
    
    // Do not allow creating new connections while the graph is being built.
    if (activeConnection && !get(building_graph)) {
      // The target node's ID is expected in the format "type::id" (e.g., "proof::abc..." or "object::xyz...").
      // We only need the ID part for the object pointer.
      const [targetType, targetId] = activeConnection.target.split("::");
      
      if (targetId) {
        targetPointer = targetId;
        showModal = true;
      } else {
        console.warn("Could not determine target ID from connection:", activeConnection);
      }
    }
  }
</script>

<div class={proof.can_be_spend ? "customNode" : "customExternalNode"}>
  <Handle type="target" position={Position.Left} isConnectable />
  <Handle
    type="source"
    position={Position.Right} 
    on:connect={handleConnection}
    isConnectable={proof.can_be_spend}
  />
  
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="node-content" on:dblclick={handleDblClick}>
      <div class="node-title">{proof.token_id.substring(0, 10)}</div>
    {#if showContent && proof.type}
      <div class="token-id">Type: {proof.type.typeName}</div>
    {/if}
  </div>
</div>

{#if showModal && activeConnection && targetPointer}
  <PointOneToAnother 
    bind:showModal
    bind:connection={activeConnection}
    source_proof={proof}
    object_to_assign={targetPointer}
  />
{/if}

<style>
  .customNode, .customExternalNode {
    background: #2D2D2D;
    padding: 10px 15px;
    border-radius: 8px;
    border: 1px solid #444;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    width: 220px;
    color: #e0e0e0;
    font-family: monospace;
    text-align: center;
  }

  .customNode {
    border-left: 4px solid #007bff; /* Blue for spendable nodes */
  }

  .customExternalNode {
    border-left: 4px solid #ff6347; /* Red/Tomato for external nodes */
  }

  .node-content {
    cursor: pointer;
  }

  .node-title {
    font-weight: bold;
    font-size: 0.9rem;
    margin-bottom: 5px;
    color: #ffffff;
  }

  .token-id {
    font-size: 0.75rem;
    color: #888;
  }
</style>