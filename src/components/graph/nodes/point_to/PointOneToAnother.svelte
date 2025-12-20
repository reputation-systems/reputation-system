<script lang="ts">
  import type { RPBox, ReputationProof } from '$lib/ReputationProof';
  import { generate_reputation_proof } from '$lib/generate_reputation_proof';
  import JsonInput from '../../ui/JsonInput.svelte';

  // --- Component Props ---
  export let showModal: boolean;
  // The source proof from which the new pointer will be created.
  export let source_proof: ReputationProof;
  // The target object that the new pointer will reference.
  export let object_to_assign: string;
  // Callback function to manage the UI edge after the modal closes.
  export let delete_edge_function: (connection: any, txId: string | null) => void;
  // The connection object from @xyflow/svelte.
  export let connection: any;

  // --- Component State ---
  let dialog: HTMLDialogElement;
  // The specific box within the source proof that will be spent.
  let input_proof_box: RPBox | null = null;
  // The absolute amount of tokens to allocate to the new pointer.
  let token_amount: number = 0;
  // State for the new box's registers.
  let negative: boolean = false; // This will be converted to `polarization`
  let is_locked: boolean = false;
  let data: object = {};
  // To hold the submitted transaction ID.
  let submitted_tx_id: string | null = null;
  
  // --- Lifecycle and Event Handlers ---
  // Automatically show the dialog when the showModal prop becomes true.
  $: if (dialog && showModal) dialog.showModal();

  /**
   * Closes the modal and informs the parent component about the transaction status.
   */
  function close() {
    if (delete_edge_function) {
      delete_edge_function(connection, submitted_tx_id);
    }
    showModal = false;
  }

  /**
   * Resets the token amount when the user selects a different input box.
   */
  function handleInputBoxChange() {
    token_amount = 0;
  }
  
  /**
   * Gathers data from the form and calls the transaction generation function.
   */
  async function handleGenerateProof() {
    if (token_amount > 0 && input_proof_box && object_to_assign) {
      // Call the updated transaction generation function with the correct parameters.
      const txId = await generate_reputation_proof(
        token_amount,
        source_proof.total_amount, // Pass the total supply from the source proof.
        source_proof.type_nft_id, // Pass the Type NFT ID from the source proof.
        object_to_assign,
        !negative, // Convert the "negative" checkbox state to the "polarization" parameter.
        data,
        is_locked,
        input_proof_box
      );

      if (txId) {
        submitted_tx_id = txId;
        close();
      }
    } else {
      alert("Please select a proof box and enter a valid token amount.");
    }
  }
</script>
  
<dialog bind:this={dialog} on:close={close} on:click|self={() => dialog.close()}>
  <div on:click|stopPropagation>
    <h2 class="modal-title" id="generateReputationLabel">
      Create Pointer from: {source_proof.type.typeName}
    </h2>
    <p class="modal-subtitle">To: {object_to_assign.substring(0, 30)}...</p>
    <hr />

    <form id="reputationForm" on:submit|preventDefault={handleGenerateProof}>
      <div class="mb-3">
        <label for="proof-box-select" class="form-label">Spend from Proof Box</label>
        <select id="proof-box-select" class="form-select" bind:value={input_proof_box} on:change={handleInputBoxChange}>
          <option disabled selected value={null}>-- Select a box --</option>
          {#each source_proof.current_boxes as option (option.box_id)}
            <option value={option}>
              Box ({option.token_amount} tokens) - ID: {option.box_id.slice(0, 10)}...
            </option>
          {/each}
        </select>
      </div>

      {#if input_proof_box}
        <div class="mb-3">
          <label for="reputationToken" class="form-label">Token Amount to Assign</label>
          <input 
            type="number" 
            min="1"
            max={input_proof_box.token_amount}
            class="form-control" 
            bind:value={token_amount}
            placeholder="e.g., 100"
          />
          <small>Max available: {input_proof_box.token_amount}</small>
        </div>

        <div class="checkbox-group">
            <div class="form-check">
                <input type="checkbox" class="form-check-input" id="polarCheckbox" bind:checked={negative} />
                <label for="polarCheckbox" class="form-check-label">Negative Proof</label>
            </div>
             <div class="form-check">
                <input type="checkbox" class="form-check-input" id="lockCheckbox" bind:checked={is_locked} />
                <label for="lockCheckbox" class="form-check-label">Lock (Immutable)</label>
            </div>
        </div>

        <div class="mb-3">
          <label for="data" class="form-label">Opinion/Content (JSON)</label>
          <JsonInput bind:value={data} />
        </div>
      {/if}
    </form>
    
    <hr />
    <div class="modal-actions">
      <button class="button-secondary" on:click={close}>Cancel</button>
      <button class="button-primary" on:click={handleGenerateProof} disabled={!input_proof_box || token_amount <= 0}>
        Generate Proof
      </button>
    </div>
  </div>
</dialog>
  
<style>
  dialog {
    max-width: 40em;
    border-radius: 0.5rem;
    padding: 2rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    background-color: #2a2a2a;
    color: #f0f0f0;
    border: 1px solid #444;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(3px);
  }

  h2.modal-title {
    font-size: 1.5rem;
    margin-top: 0;
    margin-bottom: 0.25rem;
    color: #FBBF24;
  }

  .modal-subtitle {
    font-family: monospace;
    font-size: 0.8rem;
    color: #999;
    margin-top: 0;
    word-break: break-all;
  }

  hr {
    border: none;
    border-top: 1px solid #444;
    margin: 1.5rem 0;
  }

  .mb-3 {
    margin-bottom: 1.5rem;
  }

  .form-label {
    font-weight: bold;
    color: #ccc;
    display: block;
    margin-bottom: 0.5rem;
  }

  .form-select, .form-control {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 1px solid #666;
    border-radius: 6px;
    background-color: #1e1e1e;
    color: #f0f0f0;
    box-sizing: border-box;
  }
  
  .form-control + small {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: #888;
  }

  .checkbox-group {
      display: flex;
      gap: 2rem;
      margin-bottom: 1.5rem;
  }

  .form-check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
  }

  .form-check-input {
      width: 1.25em;
      height: 1.25em;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border: none;
    cursor: pointer;
    border-radius: 6px;
    font-weight: bold;
    transition: background-color 0.2s, opacity 0.2s;
  }

  .button-primary {
    background-color: #FBBF24;
    color: #1a1a1a;
  }
  .button-primary:hover {
    background-color: #fca510;
  }
  .button-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
  }

  .button-secondary {
      background-color: #444;
      color: #f0f0f0;
  }
  .button-secondary:hover {
      background-color: #555;
  }
</style>