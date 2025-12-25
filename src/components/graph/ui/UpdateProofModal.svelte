<script lang="ts">
    import { create_opinion } from "$lib/create_opinion";
    import { explorer_uri } from "$lib/envs";
    import { type RPBox, type ReputationProof } from "$lib/ReputationProof";
    import JsonInput from "./JsonInput.svelte";

    // --- Component Props ---
    export let showModal: boolean;
    // The proof from which a box will be spent.
    export let proof: ReputationProof;

    // --- Component State ---
    let dialog: HTMLDialogElement;
    // The specific box to spend from.
    let input_proof_box: RPBox | null = null;
    // The target this new proof box will point to.
    let object_to_assign: string = "";
    // The absolute amount of tokens for the new box.
    let token_amount: number = 0;
    // State for the new box's registers.
    let negative: boolean = false;
    let is_locked: boolean = false;
    let data: object = {};

    // --- Lifecycle and Event Handlers ---
    $: if (dialog && showModal) {
        dialog.showModal();
    }

    /**
     * Resets form fields when a new input box is selected.
     */
    function handleInputProofChange() {
        token_amount = 0;
        object_to_assign = "";
        negative = false;
        is_locked = false;
        data = {};
    }

    /**
     * Closes the modal.
     */
    function close() {
        showModal = false;
    }

    /**
     * Gathers data from the form and calls the transaction generation function.
     */
    async function generateReputationProof() {
        if (token_amount > 0 && input_proof_box && object_to_assign) {
            // Call the updated transaction generation function with the correct parameters.
            const txId = await create_opinion(
                token_amount,
                proof.types[0].tokenId,
                explorer_uri,
                object_to_assign,
                !negative, // Convert checkbox state to 'polarization' parameter
                data,
                is_locked,
                input_proof_box,
            );

            if (txId) {
                alert(`Transaction submitted: ${txId}`);
                close();
            }
        } else {
            alert("Please fill all required fields.");
        }
    }
</script>

<dialog bind:this={dialog} on:close={close} on:click|self={close}>
    <div on:click|stopPropagation class="modal-content">
        <h2 class="modal-title">Create New Pointer</h2>
        <p class="modal-subtitle">
            From Proof: {proof.types.map((t) => t.typeName).join(", ")} ({proof.token_id.slice(
                0,
                15,
            )}...)
        </p>
        <hr />

        <form
            id="reputationForm"
            on:submit|preventDefault={generateReputationProof}
        >
            <div class="mb-3">
                <label for="proof-box-select" class="form-label"
                    >Spend from Proof Box</label
                >
                <select
                    id="proof-box-select"
                    class="form-select"
                    bind:value={input_proof_box}
                    on:change={handleInputProofChange}
                >
                    <option disabled selected value={null}
                        >-- Select a box to spend from --</option
                    >
                    {#each proof.current_boxes as option (option.box_id)}
                        <option value={option}>
                            Box ({option.token_amount} tokens) - ID: {option.box_id.slice(
                                0,
                                10,
                            )}...
                        </option>
                    {/each}
                </select>
            </div>

            {#if input_proof_box}
                <div class="form-grid">
                    <div class="mb-3">
                        <label for="object-pointer-input" class="form-label"
                            >Object Pointer<span class="required">*</span
                            ></label
                        >
                        <input
                            type="text"
                            id="object-pointer-input"
                            class="form-control"
                            bind:value={object_to_assign}
                            placeholder="URL, token ID, text, etc."
                        />
                    </div>
                    <div class="mb-3">
                        <label for="reputationToken" class="form-label"
                            >Token Amount to Assign<span class="required"
                                >*</span
                            ></label
                        >
                        <input
                            type="number"
                            id="reputationToken"
                            min="1"
                            max={input_proof_box.token_amount}
                            class="form-control"
                            bind:value={token_amount}
                        />
                        <small
                            >Max available: {input_proof_box.token_amount}</small
                        >
                    </div>
                </div>

                <div class="checkbox-group">
                    <div class="form-check">
                        <input
                            type="checkbox"
                            class="form-check-input"
                            id="polarCheckbox"
                            bind:checked={negative}
                        />
                        <label for="polarCheckbox" class="form-check-label"
                            >Negative Proof</label
                        >
                    </div>
                    <div class="form-check">
                        <input
                            type="checkbox"
                            class="form-check-input"
                            id="lockCheckbox"
                            bind:checked={is_locked}
                        />
                        <label for="lockCheckbox" class="form-check-label"
                            >Lock (Immutable)</label
                        >
                    </div>
                </div>

                <div class="mb-3">
                    <label for="data" class="form-label"
                        >Opinion/Content (JSON)</label
                    >
                    <JsonInput bind:value={data} />
                </div>
            {/if}
        </form>

        <hr />
        <div class="modal-actions">
            <button class="button-secondary" type="button" on:click={close}
                >Cancel</button
            >
            <button
                class="button-primary"
                type="button"
                on:click={generateReputationProof}
                disabled={!input_proof_box ||
                    !object_to_assign ||
                    token_amount <= 0}
            >
                Generate Proof
            </button>
        </div>
    </div>
</dialog>

<style>
    dialog {
        width: 90%;
        max-width: 50rem;
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

    .modal-content {
        max-height: 80vh;
        overflow-y: auto;
    }

    h2.modal-title {
        font-size: 1.5rem;
        margin-top: 0;
        margin-bottom: 0.25rem;
        color: #fbbf24;
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

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }

    .form-label {
        font-weight: bold;
        color: #ccc;
        display: block;
        margin-bottom: 0.5rem;
    }

    .form-select,
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

    .required {
        color: #ff8a8a;
        margin-left: 4px;
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
        transition:
            background-color 0.2s,
            opacity 0.2s;
    }

    .button-primary {
        background-color: #fbbf24;
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
