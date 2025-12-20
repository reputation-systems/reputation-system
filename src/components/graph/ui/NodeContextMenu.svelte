<script lang="ts">
  import type { ReputationProof } from "$lib/ReputationProof";
  // The global data_store is no longer needed. We only need the network for the info display.
  import { network } from "$lib/store";
  
  // --- CHANGE 1: Import all necessary local modals ---
  import UpdateProofModal from "./UpdateProofModal.svelte";
  import ComputeSearchModal from "./ComputeSearchModal.svelte";
    import { createEventDispatcher } from "svelte";

  export let onClick: () => void;
  export let proof: ReputationProof | null;

  const dispatch = createEventDispatcher();

  let local_id: string = proof ? proof.token_id.slice(0, 10) : "";

  // Positioning logic (remains the same)
  let pos = { x: 0, y: 0 };
  let menu = { h: 0, w: 0 };
  let browser = { w: 0, h: 0 };
  
  // --- CHANGE 2: Local state for ALL modals this component can open ---
  let showMenu = false;
  let showUpdateModal = false;
  let showComputeModal = false;

  // Positioning functions (remain the same)
  function rightClickContextMenu(e: MouseEvent) {
    showMenu = true;
    browser = { w: window.innerWidth, h: window.innerHeight };
    pos = { x: e.clientX, y: e.clientY };

    if (browser.h - pos.y < menu.h) pos.y = pos.y - menu.h;
    if (browser.w - pos.x < menu.w) pos.x = pos.x - menu.w;
  }

  function onPageClick() {
    showMenu = false;
    onClick();
  }

  function getContextMenuDimension(node: HTMLElement) {
    menu = { h: node.offsetHeight, w: node.offsetWidth };
  }

  // --- CHANGE 3: Updated menu item actions to use local state variables ---
  function updateItem() { showUpdateModal = true; }
  function computeItem() { showComputeModal = true; }
  function showDetails() { dispatch('showProofDetails', { proof: proof }); }

  function linkExplorer() {
    if (!proof || proof.current_boxes.length === 0) return;
    const tx_id = proof.current_boxes[0].box.transactionId;
    const explorer_tx_id = `https://sigmaspace.io/en/transaction/${tx_id}`;
    window.open(explorer_tx_id, "_blank");
  }

  // Menu items definition with updated onClick handlers
  let menuItems = [
    { name: "openInfo", onClick: showDetails, displayText: "Details", class: "fa-solid fa-info" },
    { name: "explorerLink", onClick: linkExplorer, displayText: "Check on explorer", class: "fa-solid fa-search" },
    { name: 'computeItem', onClick: computeItem, displayText: "Calculate", class: 'fa-solid fa-calculator' }
  ];

  if (proof?.can_be_spend) {
    menuItems.push({ name: 'updateItem', onClick: updateItem, displayText: "Update", class: 'fa-solid fa-pencil-alt' });
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" xintegrity="sha512-KfkfwYDsLkIlwQp6LFnl8zNdLGxu9YAA1QvwINks4PhcElQSvqcyVLLD9aMhXd13uQjoXtEKNosOWaZqXgel0g==" crossorigin="anonymous" referrerpolicy="no-referrer" />
</svelte:head>

<!-- This remains the same -->
<svelte:window 
  on:contextmenu|preventDefault={showMenu ? onPageClick : rightClickContextMenu}
  on:click|self={onPageClick}
/>

{#if showMenu}
<nav use:getContextMenuDimension style="position: fixed; top:{pos.y}px; left:{pos.x}px; z-index: 2000;">
  <div class="navbar">
    <div class="info-block">
      <!-- svelte-ignore a11y-missing-attribute -->
      <p>
          <!-- svelte-ignore a11y-missing-attribute -->
          <span class="label">Proof:</span> <a>{local_id}</a><br>
          <span class="label">Network:</span> <a>{$network}</a><br>
          {#if proof}
              <span class="label">Type:</span> <a>{proof.type.typeName || 'N/A'}</a>
          {/if}
      </p>
    </div>  
    <ul>
      {#each menuItems as item}
        <li>
            <!-- --- CHANGE 4: The robust click handler that closes the menu --- -->
            <button on:click={() => { item.onClick(); showMenu = false; }}>
                <i class={item.class}></i>{item.displayText}
            </button>
        </li>
      {/each}
    </ul>
  </div>
</nav>
{/if}

<!-- --- CHANGE 5: Instantiate ALL modals locally with their respective states --- -->
{#if proof}
  {#if proof.can_be_spend}
    <UpdateProofModal bind:showModal={showUpdateModal} bind:proof={proof} />
  {/if}
  <ComputeSearchModal bind:showModal={showComputeModal} bind:proof={proof} />
{/if}

<style>
    /* Styles are unchanged */
    .navbar {
        display: inline-flex;
        border: 1px #555 solid;
        width: 250px;
        background-color: #2a2a2a;
        border-radius: 10px;
        overflow: hidden;
        flex-direction: column;
        color: #f0f0f0;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }
    .info-block {
        padding: 10px;
        margin: 6px;
        margin-bottom: 0;
        background-color: #333;
        border-bottom: 1px solid #444;
        border-radius: 5px 5px 0 0;
    }
    .info-block p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.6;
    }
    .label {
        font-weight: bold;
        color: #aaa;
    }
    .info-block a {
        color: #ccc;
        text-decoration: none;
    }

    .navbar ul {
        margin: 6px;
        padding: 0;
    }
    ul li {
        display: block;
        list-style-type: none;
    }
    ul li button {
        font-size: 1rem;
        color: #f0f0f0;
        width: 100%;
        padding: 0;
        height: 32px;
        text-align: left;
        border: 0;
        background-color: transparent;
        border-radius: 5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background-color 0.2s, color 0.2s;
    }
    ul li button:hover {
        background-color: #FBBF24;
        color: white;
    }
    ul li button i {
        padding: 0 15px 0 10px;
        width: 18px;
        text-align: center;
        margin-right: 5px;
    }
</style>
