<script lang="ts">
    import { compute, type ReputationProof } from "$lib/ReputationProof";

    // --- Component Props ---
    export let proof: ReputationProof;
    export let showModal: boolean;

    // --- Component State ---
    let dialog: HTMLDialogElement;
    // The target object to compute the reputation for.
    let target_object_pointer: string = "";
    // Stores the result of the computation.
    let result: number | null = null;

    /**
     * Closes the modal.
     */
    function close() {
        showModal = false;
        result = null; // Reset result when closing
    }

    /**
     * Calls the updated compute function with the correct parameters.
     */
    function computeResult() {
        // The call to 'compute' is now simplified, passing only the proof and the target object pointer.
        result = compute(proof, target_object_pointer);
    }

    // Show the dialog when the 'showModal' prop is true.
    $: if (dialog && showModal) dialog.showModal();
</script>
  
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<dialog bind:this={dialog} on:close={close} on:click|self={close}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div on:click|stopPropagation>
        <h2 class="modal-title" id="generateReputationLabel">
            Compute score from: {proof.type.typeName}
        </h2>
        <p class="modal-subtitle">
            Proof ID: {proof.token_id.slice(0, 20)}...
        </p>
        <hr />
        
        <form class="compute-form" on:submit|preventDefault={computeResult}>
            <label for="target-input" class="form-label">Target Object Pointer</label>
            <input id="target-input" class="form-control" bind:value={target_object_pointer} placeholder="Enter URL, token ID, hash..."/>
            <button type="submit" class="button-primary">Calculate</button>
        </form>

        {#if result !== null}
            <div class="result-container">
                <strong>Result:</strong>
                <span class:positive={result > 0} class:negative={result < 0}>
                    {result.toFixed(4)}
                </span>
            </div>
        {/if}
    </div>
</dialog>
  
<style>
    dialog {
        max-width: 32em;
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
        margin: 0;
        color: #FBBF24;
    }

    .modal-subtitle {
        font-family: monospace;
        font-size: 0.8rem;
        color: #999;
        margin-top: 0.25rem;
        word-break: break-all;
    }

    hr {
        border: none;
        border-top: 1px solid #444;
        margin: 1.5rem 0;
    }

    .compute-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .form-label {
        font-weight: bold;
        color: #ccc;
    }

    .form-control {
        width: 100%;
        padding: 0.75rem;
        font-size: 1rem;
        border: 1px solid #666;
        border-radius: 6px;
        background-color: #1e1e1e;
        color: #f0f0f0;
        box-sizing: border-box;
    }

    .button-primary {
        align-self: flex-end;
        padding: 0.75em 1.5em;
        font-size: 1rem;
        background-color: #FBBF24;
        color: #1a1a1a;
        border: none;
        cursor: pointer;
        border-radius: 6px;
        font-weight: bold;
        transition: background-color 0.2s;
    }

    .button-primary:hover {
        background-color: #fca510;
    }

    .result-container {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: #1e1e1e;
        border-radius: 6px;
        border: 1px solid #555;
        font-size: 1.2rem;
        text-align: center;
    }

    .result-container span {
        font-weight: bold;
    }

    .positive {
        color: #4caf50;
    }

    .negative {
        color: #f44336;
    }
</style>